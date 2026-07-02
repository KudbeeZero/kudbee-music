# Mobile — how HERMES recognizes your device and how to test on a phone

HERMES is a static, $0 app, and most people who tap a share link will open it on a
phone. Mobile is therefore a first-class target: the app **detects what it's running
on and adjusts**, and the repo ships a workflow for testing those adjustments without
owning a drawer of devices.

## 1. How the app recognizes the device (`lib/hermes/device.ts`)

A pure, unit-tested classifier turns a snapshot of the browser into a profile and a
set of UI decisions:

```
DeviceSnapshot  ──deviceProfile()──▶  DeviceProfile  ──adaptationsFor()──▶  DeviceAdaptations
(ua, viewport,                        (os, browser,                        (animation level,
 touch, memory,                        phone/tablet/desktop,                single column,
 reduced-motion,                       perf class, narrow)                  compact brain,
 data-saver…)                                                              touch targets…)
```

- **Capabilities lead, the UA advises.** Touch + shortest viewport edge decide
  phone vs tablet vs desktop; the UA only names the OS/browser and catches the
  iPadOS-pretends-to-be-macOS masquerade. Rotating a phone doesn't make it a tablet.
- **Performance-aware.** `deviceMemory`/`hardwareConcurrency` (where the browser
  reports them) put the device in a `low`/`mid`/`high` class; low-end devices get the
  `lite` animation level and skip heavy media. Unknown never guesses slow.
- **Respectful by default.** `prefers-reduced-motion` turns animation `off`
  everywhere; Data Saver switches to light media.
- **Deterministic + testable.** Everything is a pure function — see
  `lib/hermes/__tests__/device.test.ts` for the contract, real UA strings included.

The client half is `components/hermes/useDevice.ts` (`useDevice()` hook): reads the
real browser, re-classifies on resize/rotation/media-query flips, and is SSR-safe
(first paint is always the quiet desktop; the device arrives in an effect — so static
export and hydration can never disagree).

Components consume `ui.animation`, `ui.singleColumn`, `ui.compactBrain`,
`ui.touchTargets`, `ui.bottomSheets`, `ui.lightMedia`, `ui.stickyPrimaryAction` —
and never sniff `navigator.userAgent` themselves.

## 2. Install it like an app (PWA)

The export ships `public/manifest.webmanifest` + brand icons, so the studio can be
**added to a home screen** (Android: "Install app"; iOS Safari: Share → "Add to Home
Screen") and opens standalone — full-screen, no browser chrome, with the vault in
that browser's localStorage as usual. `useDevice()` reports `standalone: true` inside
the installed app. Icons are rasterized from `public/icon.svg` by
`node scripts/make-icons.mjs` (Playwright screenshot — no new deps).

## 3. Testing on phones — the workflow

### a. The device matrix, locally (no phone needed)

```bash
STATIC_EXPORT=1 npm run web:build
node scripts/mobile-matrix.mjs                # full matrix
node scripts/mobile-matrix.mjs --device "iPhone SE" --page /hermes
```

Walks real device profiles (iPhone SE / iPhone 14 Pro / Galaxy S9+ / Pixel 7 /
iPad Mini / desktop control) across `/` and `/hermes` and **fails** on console
errors, horizontal overflow, or sub-40px tap targets on touch devices. Screenshots
land in `out/mobile-matrix/` for eyeballing. (Chromium emulates the viewport, DPR,
touch, and UA — layout truth; it is not a WebKit engine test.)

### b. A real phone against a PR branch (the killer feature)

Cloudflare Pages builds **every branch** at its own URL:

```
https://<branch-with-dashes>.wifi-dj-meme.pages.dev
```

(e.g. `feat/mobile-foundation` → `feat-mobile-foundation.wifi-dj-meme.pages.dev`;
check the exact alias on the commit's "Cloudflare Pages" status.) So the phone
workflow is simply: **push the branch → open the preview URL on your phone → test
with your thumbs** — before anything merges. No cables, no tunnels, no app store.

### c. A real phone against your dev machine (same Wi-Fi)

```bash
npm run web:dev -- -H 0.0.0.0        # then on the phone: http://<your-lan-ip>:3000
```

Live-reloading dev server on the handset. (If the phone can't reach it, check the
machine's firewall; corporate/guest Wi-Fi often isolates clients.)

### d. Remote-inspect a real phone (when something only breaks on the device)

- **Android**: `chrome://inspect` on the desktop + USB debugging → full DevTools
  against the phone's tab.
- **iOS**: Safari → Develop menu → the device (enable Web Inspector on the phone in
  Settings → Safari → Advanced).

## What "adjusts" concretely (current + planned)

| Signal | Adjustment |
| --- | --- |
| phone / narrow viewport | single-column studio, bottom-sheet ergonomics, sticky primary action |
| touch | ≥44px tap targets, no hover-only affordances |
| `prefers-reduced-motion` | all animation off (already enforced across landing/studio CSS) |
| Data Saver / low-end device | `lite` animation, no autoplaying hero loops |
| installed PWA (standalone) | full-screen studio, safe-area padding (viewport-fit=cover is already set) |

The detection layer + harness land first; the remaining UI wiring consumes
`useDevice()` incrementally (tracked in TODO.md).
