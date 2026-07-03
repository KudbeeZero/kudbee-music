A living spec for the "WIFI DJ" visual redesign — the founder-supplied production UI
kit + Lyrics Editor mockups that reimagine the whole Hit Factory UI. Read this first
before touching any redesign PR; it's the cross-reference between what the mockups
show and what exists in code today, plus the phased build order. Read by whoever
picks up the next redesign slice (human or agent) — update the phase table as slices
ship.

## Source mockups

- `assets/concept-art/wifi-dj-production-ui-kit-desktop-mobile.png` — "WIFI DJ —
  Production UI Kit / Mobile + Desktop Menu System": a Desktop Studio panel, a Mobile
  Studio (landscape) panel, and a 24-element UI component library. Cyan/magenta/amber
  neon theme (matches the existing `globals.css` palette closely).
- `assets/concept-art/wifi-dj-lyrics-editor.png` — a full-screen "Lyrics Editor," deep
  violet/purple theme (distinct from the kit above — same chrome shape, different
  accent palette; treat as either an alternate theme or a confirmation the app uses
  more than one accent family per screen, not yet resolved — flagged for the founder
  if it matters later).

Both are concept/pitch art (AI-generated mockup renders), not production assets —
same rule as `assets/concept-art/README.md`: reference for direction, not a literal
crop.

## Directory — every button/panel, mapped to what exists

### Desktop Studio (new)

| Mockup element | Existing equivalent | Gap |
|---|---|---|
| Left sidebar nav (Studio/Create/Explore/Library/Sessions/Marketplace/Profile/Settings) + user/XP card | **None** — today's nav is a flat row of header ghost-buttons (`HermesHitFactory.tsx` `🚀 Agent · ✨ New · ✍️ Lyric Lab · 🧭 Crossroads · Albums · Vault · profile · Sign out`), no sidebar | **Net-new** — biggest structural gap |
| Top bar: project dropdown, transport (prev/play/next), time/BPM/key, Publish, grid icon | Partial — `Studio.tsx`'s clip timeline has no transport chrome; no project-switcher exists (one song in progress at a time today) | **Net-new** |
| Waveform + 5 track lanes (DRUMS/BASS/SYNTH/VOCAL/FX) with clips, S/M buttons | **None** — `Studio.tsx` shows a *lyric section* clip timeline (verse/chorus blocks colored by label), not audio track lanes; there's no per-instrument-stem concept anywhere (HERMES doesn't synthesize/own separate stems) | **Net-new, and arguably fictional** — HERMES doesn't have real multi-stem audio today; this is the biggest "does it make sense" flag, see Notes below |
| Mixer strip (Volume/Filter/Reverb/Delay knobs + AI Assist orb) | **None** — no audio FX chain exists | **Net-new, same caveat** |
| AI Co-Pilot slide-out (Generate Ideas/Mix Assistant/Master Track/Suggest Plugins) + Community Feed | Loosely: `Rack.tsx` (engine units), `Council.tsx`'s guest-judge/community-vote pattern, `RecommendationsPanel.tsx` | Partial — the *shape* (a slide-out AI panel) is new, but the underlying capabilities already exist under different names |

### Mobile Studio (landscape) (new)

| Mockup element | Existing equivalent | Gap |
|---|---|---|
| Bottom dock (Studio/Create/Explore/Sessions/Library + hex "more" button) | `BottomNav.tsx` — already a 5-item bottom dock (`🧪 Lab · ⚖️ Council · 🎚️ Studio · 📦 Package · 🎒 Vault`), phone-only via `device.ui.singleColumn` | **Closest 1:1 match in the whole mockup** — relabel/reskin, not rebuild |
| Right icon rail (AI Co-Pilot/Mix/Effects/Master) | None as a rail; same underlying panels exist elsewhere in the deck | Partial |
| Track lanes / transport / top bar | Same gaps as desktop | **Net-new** |

### UI Component Library (24 elements)

Cross-referenced against `hermes.module.css`'s existing primitives (`.chip`, `.flag`,
`.ghostBtn`, `.panel`, knobs used in `Rack.tsx`/mixer-style controls if any):

| # | Mockup label | Existing equivalent | Gap |
|---|---|---|---|
| 1 | Primary Button | `.ghostBtn` exists but is outline-style, not filled/glowing | Restyle |
| 2 | Secondary Button | none filled-outline in this exact style | Restyle |
| 3 | Icon Button (round) | `AgentAvatar`/close-X buttons exist ad hoc, no shared round icon-button class | New shared class |
| 4 | Toggle Button | none — no on/off switch component exists anywhere today | **Net-new** |
| 5 | Top Nav Tab | Studio Flow rail buttons (`flowRail`) are conceptually this | Restyle |
| 6 | Segmented Tab | none — no 3-way segmented control exists | **Net-new** |
| 7 | Menu Pill | `.chip` is close (pill shape) but no dropdown-chevron variant | Extend `.chip` |
| 8 | Slide-out Card | none — no slide-out panel pattern exists (everything is inline in the 3-col deck or a full drawer like `LyricLab`) | **Net-new pattern** |
| 9 | Council Card | **`Council.tsx`'s `.flag` rows are the direct ancestor** — avatar row + vote framing is new | Closest match after the dock |
| 10 | Vote Button | `Council.tsx` has no up/down vote UI; `CrossroadsBoard.tsx` has vote-style choice buttons | Partial (Crossroads) |
| 11 | Status Badge | none | **Net-new** |
| 12 | Notification Pill | none | **Net-new** |
| 13 | Level Strip | `YourAgent.tsx`'s memory/level readout is the same *data*, different visual | Restyle |
| 14 | Progress Ring | none — XP is shown as a bar, not a ring | **Net-new** |
| 15 | Waveform Preview | `BrainScan`/`Studio` don't render a raw waveform thumbnail | **Net-new** |
| 16 | Playback Controls | none — HERMES doesn't play audio in-app at all today (Suno handoff is external) | **Net-new, same audio-stem caveat** |
| 17 | Volume Knob | none | **Net-new** |
| 18 | Slider Fader | none | **Net-new** |
| 19 | Filter Dropdown | plain `<select>` styling exists (pattern pack/rhyme-scheme dropdowns) | Restyle |
| 20 | Tempo Display | tempo min/max inputs exist as plain number fields | Restyle |
| 21 | Key Display | no musical-key concept surfaced in UI today | **Net-new** |
| 22 | Dock Button | **`BottomNav.tsx` items are this exactly** | Restyle only |
| 23 | Floating Action | none | **Net-new** |
| 24 | Close/X Button | ad hoc X buttons exist (Rack, YourAgent upgrade rows) | Extend to shared class |

### Lyrics Editor (new)

| Mockup element | Existing equivalent | Gap |
|---|---|---|
| Top bar: Lyrics/Melody/Structure segmented tabs, tempo/key/play | None — no segmented tab control exists (see #6 above) | **Net-new** |
| Left panel: Song Section dropdown, Smart Assist (suggested words + rhyme groups) | `lib/hermes/lexicon.ts` + `rhyme.ts` already compute this data; `LyricLab.tsx`'s writers-room shows *some* AI-suggested hook cards, but no live word/rhyme-chip sidebar | Data exists, UI doesn't |
| Center: numbered, directly-editable verse lines, per-line Auto-Flow/Suggest/Rhyme/overflow menu, Add Line | **`LyricLab.tsx` is structurally a different thing** — a 9-step wizard/Q&A, not an inline text editor with line-level actions. `SongPackageView`'s lyrics display is read-mostly | **Net-new editor**, the single biggest non-DAW gap |
| Right panel: Section Tools (duplicate/delete/move), Lyric Stats (words/chars/lines/syllables), Vibe/Energy | Stats are computable from existing section data; no UI surfaces them together like this | Data exists, UI doesn't |
| Bottom nav: Lyrics/Topline/Flow/Theme tabs + transport + Export/Save/Finish Song | None of this exists as a bottom bar in `LyricLab` | **Net-new** |

## Notes — things flagged as "doesn't quite make sense yet"

Per the founder's go-ahead (design agents "can use a little bit of their creativity...
if two of them get together and make a decision they can go ahead and do it"), these
are logged rather than blocking:

1. **Real multi-stem audio tracks (DRUMS/BASS/SYNTH/VOCAL/FX) don't exist in HERMES.**
   The engine generates lyrics/structure/production *notes*, not separate audio stems —
   audio itself is rendered externally (Suno). The mixer/track-lane visual can still be
   built as a **faithful, honest simulation** (the same "brain scan" honesty rule
   `brainAtlas.test.ts` already enforces elsewhere) — i.e. the lanes can visualize the
   *planned* arrangement (which section calls for which instrument emphasis, per
   `Beat Oracle`'s production notes) rather than claim to be live audio stems. Treat
   this as a UI metaphor, same spirit as the anatomical Brain Scan.
2. **Two color themes (cyan/magenta vs. violet/purple) across the two mockups.**
   Until told otherwise, treat the violet Lyrics Editor as a **section-specific accent**
   within one unified token set (add `--violet` variants alongside existing `--cyan`/
   `--magenta`, both already defined in `globals.css`), not a competing theme system.
3. **The existing "brain scan" flagship metaphor (`BrainScan.tsx`) isn't in either
   mockup.** These mockups are a generic AI-DAW skin; they don't replace the anatomical
   brain concept that's this app's actual differentiator (CLAUDE.md's "flagship
   conceit"). Redesign work should **restyle the chrome around BrainScan**, not remove
   it — BrainScan itself stays as the center-stage visual per the existing iron laws.

## Platform build order — decided: mobile-first

The existing responsive system (`useDevice.ts`/`lib/hermes/device.ts`, capability
flags, `scripts/mobile-matrix.mjs` as a required gate) is already mobile-first —
one adaptive layout with `data-touch`/`data-form`/`data-bottomnav` attributes, not
two separate UIs. `BottomNav.tsx` is also already the closest 1:1 match to anything
in the mockups. Building each new piece mobile-first and letting CSS breakpoints
scale it up matches the codebase's existing convention and avoids the classic
DAW-mockup trap (a dense desktop mixer that doesn't compress). Desktop gets the
same components at wider breakpoints/denser grids, not a parallel build.

## Phased build plan

| Phase | Scope | Status |
|---|---|---|
| 0 | This directory + platform-order decision | ✅ done |
| 1 | **Council redesign** (new visual language + logo treatment) — founder's explicit first target | 🔨 next |
| 2 | Shared primitives: Toggle, Segmented Tab, Status Badge, Notification Pill, Progress Ring, Slide-out Card pattern (feeds everything downstream) | 💤 queued |
| 3 | Sidebar nav shell (desktop) / `BottomNav` reskin (mobile) using Phase 2 primitives | 💤 queued |
| 4 | Lyrics Editor rebuild (net-new inline editor, replacing/supplementing `LyricLab`'s wizard) | 💤 queued |
| 5 | Studio/mixer visual layer (arrangement-as-mixer metaphor, honesty-rule respected per Note 1) | 💤 queued |

Each phase ships as its own PR through the full gate suite (`CLAUDE.md`), screenshot-
verified against the relevant mockup crop by an independent review agent before
merging (target ≥9/10; escalate to the founder only after 5 failed review rounds on
the same slice).
