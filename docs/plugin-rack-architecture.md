# Plugin / Rack / Marketplace architecture — the map, banked

**What this is / who reads it:** a code-verified map of every piece of the plugin,
subscription-tier, and Engine Rack system as it exists today — the data model, the
localStorage contracts, every enforcement point (and every place one is *missing*), and
the one confirmed security defect found and fixed while producing this map (2026-07-07).
Read this before wiring `PluginMarketplace.tsx` in, building real payment/tier
enforcement, or adding a new Rack unit — it's the grounding for
[`awakening-onboarding-roadmap.md`](awakening-onboarding-roadmap.md)'s Feature 1 ("Lego"
data layer) and Feature 3.1/3.3 (finishing what's already built).

## TL;DR

- **The plugin/tier-gating system is real, tested code — but 100% inert.** Nothing in
  the reachable app calls `hasFeature()`, `checkMonthlyQuota()`, `checkVaultQuota()`, or
  `tierCanAccessPlugin()` except the marketplace UI itself, and that UI
  (`PluginMarketplace.tsx`) is never imported anywhere — it's built, tested, and
  orphaned. No page renders it, no route reaches it.
- **The Rack's two unlock slots are NOT the same shape.** Claude Engine
  (`claudeKey.ts`) is a real, functional gate — `claudeEngineReady()` actually decides
  which lyrics provider runs. Lightning Engine (`lightningKey.ts`) was wired the same
  way in PR #233 (merged 2026-07-07) — both slots now gate real provider selection, not
  just UI decoration.
- **No code-execution risk anywhere in this system.** A "plugin" is a metadata record
  (`{id, name, category, minTier, version, description, author}`) — there is no plugin
  *code*, so "installing" one can never execute anything. This is the single most
  important fact for any future security read of this system: it is a licensing/UI
  construct, not a code-loading one.
- **One real defect was found and fixed this session:** `installPlugin('constructor')` /
  `installPlugin('__proto__')` bypassed the "unknown plugin → return null" contract
  because `FIRST_PARTY_PLUGINS` is a plain object literal and bracket lookup resolves
  inherited `Object.prototype` members. Not exploitable as prototype pollution (nothing
  ever writes through the returned value), but a real correctness gap against the
  registry's own contract. Fixed in `lib/hermes/plugins.ts` via a `lookupPlugin()` guard
  (`Object.prototype.hasOwnProperty.call` + an explicit `DANGEROUS` set, mirroring
  `shareLink.ts`'s existing pattern) with regression tests in
  `lib/hermes/__tests__/plugins.test.ts`.
- **Tier bypass via localStorage (e.g. setting `hermes.subscription.v1` to `enterprise`
  by hand) is real but by-design**, not a bug — this is a $0, client-only, no-server app
  (CLAUDE.md iron law #2) with no payment backend to defraud yet. The same is true of
  every other localStorage-gated feature in this repo (dev door, profile tier, etc.).
  It only becomes a real problem the day a paid feature does something server-side or
  irreversible on "unlock" — none currently do.

## 1. The plugin data model — `lib/hermes/plugins.ts`

```ts
export type PluginCategory = 'export' | 'sync' | 'analytics' | 'creative' | 'workflow' | 'integration';

export interface PluginMetadata {
  id: string;                    // kebab-case identifier
  name: string;
  category: PluginCategory;
  minTier: SubscriptionTier;     // minimum tier required
  version: string;
  description: string;
  author: 'hermes' | 'third-party';
}

export interface Plugin extends PluginMetadata {
  active: boolean;               // user has installed + activated it
  installTime?: number;
}
```

Eight first-party plugins ship in `FIRST_PARTY_PLUGINS` (a plain object literal keyed by
id), tiered `pro` (`stems-export`, `cloud-sync`, `suno-batch-export`), `premium`
(`advanced-analytics`, `mastering-assistant`, `collaboration-tools`, `api-access`), and
`enterprise` (`white-label`). No third-party/marketplace plugin has ever been added —
`author: 'third-party'` is a type-level slot with zero real entries.

Exported functions: `getAvailablePlugins()` (all 8 + install status), `getInstalledPlugins()`
(reads localStorage), `installPlugin(id)`, `uninstallPlugin(id)`, `isPluginActive(id)`,
`getPluginMetadata(id)`, `getPluginMinTier(id)`, `tierCanAccessPlugin(tier, id)`.

**`installPlugin(id)` trace (post-fix):**
```ts
export function installPlugin(pluginId: string): Plugin | null {
  const plugin = lookupPlugin(pluginId);   // hasOwnProperty-guarded lookup
  if (!plugin) return null;
  const installed = getInstalledPlugins();
  if (installed.find((p) => p.id === pluginId)) return installed.find(...) as Plugin;
  const newPlugin: Plugin = { ...plugin, active: true, installTime: Date.now() };
  installed.push(newPlugin);
  try { kv().setItem(PLUGINS_KEY, JSON.stringify(installed)); } catch { /* quota */ }
  return newPlugin;
}
```
**No tier check at all.** `installPlugin()` does not call `tierCanAccessPlugin()` — it
installs any known plugin id regardless of the caller's subscription tier. The only tier
gate in the entire flow is `PluginMarketplace.tsx`'s render-time `canAccess` check, which
disables the Install button in the UI. Calling `installPlugin('white-label')` directly
(devtools console, or any future caller) installs it on any tier — again, this is a
by-design consequence of client-only architecture with no enforcement layer to bypass
*yet*, not a regression from some stronger past state.

## 2. The localStorage contract

| Key | Shape | `.bak`-mirrored? | Profile-namespaced? |
| --- | --- | --- | --- |
| `hermes.plugins.v1` | `Plugin[]` (installed only) | **No** | **No** |
| `hermes.subscription.v1` | `{tier, startedAt, expiresAt, purchaseId?}` | **No** | **No** |

Both diverge from `storage.ts`'s established convention (`<key>::<profileId>` namespacing
+ a `.bak` mirror for every vault-adjacent key — see CLAUDE.md's memory-layers table).
Practical effect today: installed plugins and subscription tier are shared across every
profile on the same browser instead of being per-account, and a corrupted write has no
fallback. Not a security bug — a consistency gap worth closing before this system is
switched from "1 profile per browser" to real multi-profile use — filed as a Note in
`IDEAS.md` for the day `PluginMarketplace.tsx` gets wired in.

`getInstalledPlugins()` parses with a type guard (`typeof p === 'object' && ... typeof id
=== 'string'`) but no `stripDangerous`-style key-stripping reviver the way
`shareLink.decodeShare`/`storage.importVault` do. Because the stored value is an *array*
of plain data records (not a keyed object being merged into app state), this isn't a
prototype-pollution vector the way an object-shaped import would be — `JSON.parse` itself
doesn't grant prototype-write access without a custom reviver that does the writing. Still
a discipline gap relative to the rest of the codebase, not a demonstrated live bug.

## 3. Tier / subscription model — `lib/hermes/subscription.ts`

```ts
export type SubscriptionTier = 'free' | 'pro' | 'premium' | 'enterprise';
```
`TIER_FEATURES` is a static `Record<SubscriptionTier, TierFeatures>` (booleans + numeric
quotas per tier). `currentSubscription()` reads `hermes.subscription.v1`, defaults to
`free`, and auto-downgrades if `expiresAt` has passed. `hasFeature(feature)` and
`checkMonthlyQuota()`/`checkVaultQuota()` all read off `currentSubscription().tier` — but
**none of the three are called anywhere reachable in the app.** `grep`-confirmed: the only
non-test call sites are inside `PluginMarketplace.tsx` itself.

`currentSubscription()` has the same "trust the JSON shape" pattern as `plugins.ts` — a
visitor can set `hermes.subscription.v1` to `{"tier":"enterprise","startedAt":0,"expiresAt":null}`
directly in devtools and every `hasFeature()`/`checkMonthlyQuota()` call would honor it
immediately, with zero consequence today because nothing calls those functions in a real
user flow. `upgradeSubscription()`/`downgradeToFree()` exist as the intended real entry
points (for a future Stripe `purchaseId` seam per CLAUDE.md's paid-provider rules) but are
also unwired — no checkout UI calls them yet.

## 4. Tier-gating enforcement — where it is, where it isn't

| Layer | Enforces tier? |
| --- | --- |
| `installPlugin()` (the actual mutation) | **No** — installs any known id unconditionally |
| `PluginMarketplace.tsx` render (`canAccess` → disabled button) | Yes, UI-only |
| Any other component | N/A — nothing else calls plugin/subscription functions |

So: **the only tier gate that exists anywhere is cosmetic**, on a screen nobody can
currently reach. This is the central fact any future security pass on this system needs
to start from — there is no enforcement to defeat yet, because there is no enforcement.

## 5. The Rack's two unlock slots — `components/hermes/Rack.tsx`

`ENGINE_UNITS` (`lib/hermes/engines.ts`) lists the lyrical engines shown in the rack; the
free Local Combinator is always active. Two slots have real BYOK unlock flows:

**Claude Engine** (`lib/hermes/claudeKey.ts`) — `getClaudeKey()`/`setClaudeKey()`/
`clearClaudeKey()`/`isClaudeEngineActive()`. `setClaudeKey()` stores whatever string is
typed with only a `.trim()` — **no format or live validation at store time.** Validation
is a separate, explicit, opt-in step: the "🔌 Test key" button calls
`testClaudeKey()` (`providers/claudeLyricsProvider.ts`), which makes one real request to
`api.anthropic.com` with the visitor's own key from their own browser (never proxied —
this is the SECURITY.md-compliant BYOK design, see `claudeKey.ts`'s header comment).
`claudeEngineReady()` (`!!getClaudeKey() && isClaudeEngineActive()`) is the real,
functional gate consumed by provider selection — this is a genuine unlock, not cosmetic.

**Lightning Engine** (`lib/hermes/lightningKey.ts`) — same shape:
`getLightningEndpoint()`/`setLightningEndpoint()`, `getLightningApiKey()`/
`setLightningApiKey()`, `clearLightningConfig()`, `lightningConfigured()`. Was flagged
dead/unwired earlier in this program's history; **PR #233 (merged 2026-07-07) wired it
into `Rack.tsx` and `ScribeEditor.tsx`** — it is now live, consumed the same way as the
Claude slot. No key-format validation at store time here either (matches Claude's
pattern intentionally — the "Unlock" button just requires both fields non-empty); there
is no equivalent "Test endpoint" button yet, which is a real UX gap worth an IDEAS.md
entry, not a security one (a bad endpoint just fails at generation time with a clear
provider error, per `lightningLyricsProvider.ts`'s existing error handling).

Both slots follow the same, correct security shape: the secret is typed into a password
input, stored only in `localStorage` (this browser only), and used only for a direct
browser→provider network call. Neither key ever reaches a server this repo controls.

## 6. `PluginMarketplace.tsx` — render logic (confirmed orphaned)

Fully built, fully tested via its dependency on `plugins.ts`/`subscription.ts`, but
**never imported by any route or component** — `grep -r "PluginMarketplace"` across
`app/`/`components/` returns only its own file. If it were wired in: plugin names and
descriptions render as plain JSX text interpolation (`{plugin.name}`, `{plugin.description}`)
— no `dangerouslySetInnerHTML` anywhere in the file, so no XSS-shaped risk even though the
data is "first-party but still external to the render," and none would appear even if a
future third-party marketplace entry added attacker-controlled text (JSX escapes by
default). Install/uninstall happen directly on button click with no confirmation step —
fine today since installing is a free, reversible, no-cost metadata toggle.

## 7. Compliance with SECURITY.md / CLAUDE.md's iron laws

- **No secrets in git**: clean — every key in this system (`claudeKey.ts`,
  `lightningKey.ts`) is the *visitor's own*, stored client-side only, never committed,
  never proxied. Matches the documented "Rules for paid providers" boundary exactly.
- **$0 core / no server**: clean — plugin/subscription state never leaves the browser;
  there is no billing backend to call.
  - **Sanitize every import boundary**: partial gap (see §2) — `plugins.ts`/
  `subscription.ts` don't run their localStorage reads through a `stripDangerous`-style
  reviver the way `shareLink.ts`/`storage.ts` do. Lower severity here because the stored
  shapes are simple flat records/arrays with no nested attacker-supplied objects, but it's
  the reason the `__proto__`/`constructor` bypass (§8) was possible — same root pattern
  (trusting a plain-object lookup) rather than a coincidence.
- **No code execution from "installing" anything**: confirmed — a plugin is a metadata
  record with a `version` string field, nothing more. There is no interpreter, loader, or
  `eval`-adjacent path anywhere in this system. This is true today and would remain true
  even with a real third-party marketplace unless a future design choice explicitly added
  a code-loading mechanism (not recommended without a much bigger security pass).

## 8. The confirmed-and-fixed defect

```ts
// Before (lib/hermes/plugins.ts):
const plugin = FIRST_PARTY_PLUGINS[pluginId];   // plain object literal lookup
if (!plugin) return null;
```
`FIRST_PARTY_PLUGINS['constructor']` resolves to `Object` (the inherited constructor
function — truthy), and `FIRST_PARTY_PLUGINS['__proto__']` resolves to `Object.prototype`
itself — both pass the `!plugin` guard. Verified live:
```
$ node -e "const o={a:1}; console.log(!!o['constructor'], !!o['__proto__'])"
true true
```
Fixed by adding a `lookupPlugin()` helper (`DANGEROUS` set + `Object.prototype.
hasOwnProperty.call`, mirroring `shareLink.ts`'s existing `DANGEROUS` pattern) used by
every id-keyed lookup: `installPlugin`, `getPluginMetadata`, `getPluginMinTier`,
`tierCanAccessPlugin`. Six regression tests added to
`lib/hermes/__tests__/plugins.test.ts` covering `constructor`, `__proto__`, `toString`,
`hasOwnProperty` across all four functions. This was **not** exploitable as real
prototype pollution — nothing in the codebase assigns *through* the returned plugin object
back onto `Object.prototype` — but it was a genuine contract violation (an attacker-chosen
id should always yield `null`, and didn't) worth closing on hygiene grounds alone.

## 9. What this means for The Awakening / Lego roadmap

This audit is the concrete grounding for
[`awakening-onboarding-roadmap.md`](awakening-onboarding-roadmap.md):

- **Feature 1 (the Lego `Brick` contract)** should NOT invent a second unlock engine
  next to this one — `PluginMarketplace`'s `canAccess`/`minTier` pattern is the existing
  precedent for "does this visitor have access to this thing," and the new `Brick`
  interface should either subsume plugins as one `BrickKind` or sit clearly beside it with
  one shared `hasFeature()`-equivalent gate, not two competing tier checks.
- **Feature 3.1 (wire `PluginMarketplace.tsx` in)** is real, scoped work — the component
  itself needs no fixes beyond what's now in `plugins.ts`; it just needs a route/entry
  point and, before going live, the `installPlugin()` tier check it's currently missing
  (§4) added at the mutation layer, not just the render layer, if plugins start doing
  anything beyond decorative "installed" status.
- **Feature 3.3 (Lightning key unlock UI)** is already done — PR #233 shipped it; that
  roadmap item can move to shipped/done in a future roadmap pass.

## See also

- [`lib/hermes/plugins.ts`](../lib/hermes/plugins.ts) · [`lib/hermes/subscription.ts`](../lib/hermes/subscription.ts) — the code this doc maps
- [`components/hermes/PluginMarketplace.tsx`](../components/hermes/PluginMarketplace.tsx) · [`components/hermes/Rack.tsx`](../components/hermes/Rack.tsx)
- [`lib/hermes/claudeKey.ts`](../lib/hermes/claudeKey.ts) · [`lib/hermes/lightningKey.ts`](../lib/hermes/lightningKey.ts)
- [`SECURITY.md`](../SECURITY.md) — the iron laws this system was checked against
- [`awakening-onboarding-roadmap.md`](awakening-onboarding-roadmap.md) — the roadmap this audit feeds
