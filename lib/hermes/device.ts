// Device intelligence — "recognizes what phone or browser and it adjusts."
//
// The pure core of HERMES's mobile optimization: parse the user agent + a snapshot of
// browser capabilities into a DeviceProfile, then derive the concrete UI adaptations
// (animation level, layout density, touch affordances) from that profile. Everything
// in this module is a pure function of its inputs — no window, no navigator, no
// wall-clock — so it unit-tests in Node and stays deterministic. The client-side
// snapshot (reading navigator/matchMedia and re-reading on resize) lives in
// components/hermes/useDevice.ts; this module never touches the DOM.
//
// Honesty note: UA parsing is a heuristic, not an oracle (iPadOS 13+ masquerades as
// macOS; brands lie). So the profile leans on *capabilities* (touch, viewport, memory)
// wherever they're available and uses the UA only to name the OS/browser and catch
// the masquerades.

/** Operating system family, as coarse as the UI actually needs. */
export type DeviceOS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'other';
/** Browser family — enough to special-case rendering quirks, no version wars. */
export type DeviceBrowser = 'safari' | 'chrome' | 'firefox' | 'samsung' | 'edge' | 'opera' | 'other';
/** What the visitor is physically holding. */
export type FormFactor = 'phone' | 'tablet' | 'desktop';
/** How much motion the device should be asked to render. */
export type AnimationLevel = 'full' | 'lite' | 'off';

/** A raw snapshot of the environment — everything the profile derives from. */
export interface DeviceSnapshot {
  /** navigator.userAgent ('' when unknown / server-side). */
  ua: string;
  /** Viewport CSS pixels (visualViewport ?? innerWidth/Height). 0 = unknown. */
  width: number;
  height: number;
  /** navigator.maxTouchPoints > 0 || 'ontouchstart' in window. */
  touch: boolean;
  /** matchMedia('(prefers-reduced-motion: reduce)').matches */
  reducedMotion: boolean;
  /** display-mode: standalone (installed PWA) or navigator.standalone (iOS). */
  standalone: boolean;
  /** navigator.connection?.saveData === true (Data Saver on). */
  saveData: boolean;
  /** navigator.deviceMemory in GB; 0 = unknown (Safari/Firefox never report it). */
  deviceMemory: number;
  /** navigator.hardwareConcurrency; 0 = unknown. */
  cores: number;
  /** window.devicePixelRatio; 0 = unknown. */
  dpr: number;
}

/** A safe all-unknown snapshot (what the server / a test starts from). */
export const EMPTY_SNAPSHOT: DeviceSnapshot = {
  ua: '',
  width: 0,
  height: 0,
  touch: false,
  reducedMotion: false,
  standalone: false,
  saveData: false,
  deviceMemory: 0,
  cores: 0,
  dpr: 0,
};

/** The classified device — what the UI keys its decisions on. */
export interface DeviceProfile {
  os: DeviceOS;
  browser: DeviceBrowser;
  formFactor: FormFactor;
  touch: boolean;
  standalone: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  /** Coarse performance class from memory/cores; 'unknown' when nothing reported. */
  perf: 'low' | 'mid' | 'high' | 'unknown';
  /** Portrait phone / narrow window — the single most load-bearing layout bit. */
  narrow: boolean;
}

/** The concrete UI decisions — components consume THIS, never the raw UA. */
export interface DeviceAdaptations {
  /** How much motion to render (BrainScan sweeps, reveals, glows). */
  animation: AnimationLevel;
  /** Single-column stacked layout (phones) vs the side-by-side studio. */
  singleColumn: boolean;
  /** Render the compact BrainScan (fewer glow layers, smaller canvas). */
  compactBrain: boolean;
  /** Enlarge tap targets + spacing to ≥44px (Apple HIG floor). */
  touchTargets: boolean;
  /** Prefer bottom-sheet ergonomics (thumb reach) over top-anchored panels. */
  bottomSheets: boolean;
  /** Skip autoplaying hero video loops (Data Saver / low perf). */
  lightMedia: boolean;
  /** Sticky primary action above the on-screen keyboard on phones. */
  stickyPrimaryAction: boolean;
}

// ---- UA parsing (pure) ------------------------------------------------------------

/** Name the OS from a UA string. iPadOS-masquerading-as-macOS is resolved by `touch`. */
export function detectOS(ua: string, touch = false): DeviceOS {
  const s = String(ua);
  if (/iPhone|iPad|iPod/i.test(s)) return 'ios';
  // iPadOS 13+ reports "Macintosh" but is the only "Mac" with touch.
  if (/Macintosh/i.test(s)) return touch ? 'ios' : 'macos';
  if (/Android/i.test(s)) return 'android';
  if (/Windows/i.test(s)) return 'windows';
  if (/CrOS|Linux|X11/i.test(s)) return 'linux';
  return 'other';
}

/** Name the browser family. Order matters: derivatives declare Chrome/Safari too. */
export function detectBrowser(ua: string): DeviceBrowser {
  const s = String(ua);
  if (/Edg(e|A|iOS)?\//i.test(s)) return 'edge';
  if (/SamsungBrowser\//i.test(s)) return 'samsung';
  if (/OPR\/|Opera/i.test(s)) return 'opera';
  if (/FxiOS\/|Firefox\//i.test(s)) return 'firefox';
  if (/CriOS\/|Chrome\/|Chromium\//i.test(s)) return 'chrome';
  if (/Safari\//i.test(s)) return 'safari';
  return 'other';
}

/**
 * Classify the physical form factor. Capabilities lead: a touch device is a phone or
 * tablet split on the *shorter* viewport edge (a phone rotated landscape is still a
 * phone); a no-touch device is a desktop regardless of window size.
 */
export function detectFormFactor(snap: Pick<DeviceSnapshot, 'ua' | 'width' | 'height' | 'touch'>): FormFactor {
  const uaSaysMobile = /Mobi|iPhone|iPod/i.test(snap.ua);
  const uaSaysTablet = /iPad|Tablet/i.test(snap.ua) || (/Android/i.test(snap.ua) && !/Mobi/i.test(snap.ua));
  if (!snap.touch && !uaSaysMobile && !uaSaysTablet) return 'desktop';
  const shortEdge = snap.width > 0 && snap.height > 0 ? Math.min(snap.width, snap.height) : 0;
  if (shortEdge > 0) return shortEdge >= 600 ? 'tablet' : 'phone';
  // No viewport info — fall back to the UA's word.
  if (uaSaysTablet) return 'tablet';
  if (uaSaysMobile) return 'phone';
  return snap.touch ? 'phone' : 'desktop';
}

/** Coarse performance class. Unknown stays unknown — never guess a device slow. */
export function detectPerf(snap: Pick<DeviceSnapshot, 'deviceMemory' | 'cores'>): DeviceProfile['perf'] {
  const mem = snap.deviceMemory || 0;
  const cores = snap.cores || 0;
  if (mem === 0 && cores === 0) return 'unknown';
  if ((mem > 0 && mem <= 2) || (cores > 0 && cores <= 2)) return 'low';
  if ((mem > 0 && mem < 8) || (cores > 0 && cores < 8)) return 'mid';
  return 'high';
}

/** Build the full profile from a snapshot. Pure. */
export function deviceProfile(snap: DeviceSnapshot): DeviceProfile {
  const formFactor = detectFormFactor(snap);
  return {
    os: detectOS(snap.ua, snap.touch),
    browser: detectBrowser(snap.ua),
    formFactor,
    touch: snap.touch,
    standalone: snap.standalone,
    reducedMotion: snap.reducedMotion,
    saveData: snap.saveData,
    perf: detectPerf(snap),
    narrow: snap.width > 0 ? snap.width < 760 : formFactor === 'phone',
  };
}

/**
 * Derive the UI adaptations from a profile. This is the whole "it adjusts" contract
 * in one pure, testable place — components read these flags and never re-derive.
 */
export function adaptationsFor(p: DeviceProfile): DeviceAdaptations {
  const phoneish = p.formFactor === 'phone' || (p.narrow && p.touch);
  const animation: AnimationLevel = p.reducedMotion
    ? 'off'
    : p.saveData || p.perf === 'low'
      ? 'lite'
      : 'full';
  return {
    animation,
    singleColumn: p.narrow,
    compactBrain: phoneish || p.perf === 'low',
    touchTargets: p.touch,
    bottomSheets: phoneish,
    lightMedia: p.saveData || p.perf === 'low',
    stickyPrimaryAction: phoneish,
  };
}

/** One-call convenience: snapshot → adaptations. */
export function adaptToDevice(snap: DeviceSnapshot): { profile: DeviceProfile; ui: DeviceAdaptations } {
  const profile = deviceProfile(snap);
  return { profile, ui: adaptationsFor(profile) };
}
