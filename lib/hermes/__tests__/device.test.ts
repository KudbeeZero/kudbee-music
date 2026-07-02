import { describe, it, expect } from 'vitest';
import {
  detectOS, detectBrowser, detectFormFactor, detectPerf,
  deviceProfile, adaptationsFor, adaptToDevice, EMPTY_SNAPSHOT,
  type DeviceSnapshot,
} from '../device';

// Real-world user agents (trimmed to the load-bearing tokens).
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  ipadOsMasquerade:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  pixelChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36',
  galaxySamsung:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  winEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
};

function snap(over: Partial<DeviceSnapshot>): DeviceSnapshot {
  return { ...EMPTY_SNAPSHOT, ...over };
}

describe('device — OS + browser naming', () => {
  it('names iPhone Safari', () => {
    expect(detectOS(UA.iphoneSafari)).toBe('ios');
    expect(detectBrowser(UA.iphoneSafari)).toBe('safari');
  });

  it('names Chrome-on-iOS as chrome (CriOS)', () => {
    expect(detectOS(UA.iphoneChrome)).toBe('ios');
    expect(detectBrowser(UA.iphoneChrome)).toBe('chrome');
  });

  it('resolves the iPadOS "Macintosh" masquerade via touch', () => {
    expect(detectOS(UA.ipadOsMasquerade, true)).toBe('ios');
    expect(detectOS(UA.ipadOsMasquerade, false)).toBe('macos');
  });

  it('names Android Chrome, Samsung Internet, Edge, Firefox', () => {
    expect(detectOS(UA.pixelChrome)).toBe('android');
    expect(detectBrowser(UA.pixelChrome)).toBe('chrome');
    expect(detectBrowser(UA.galaxySamsung)).toBe('samsung');
    expect(detectBrowser(UA.winEdge)).toBe('edge');
    expect(detectBrowser(UA.winFirefox)).toBe('firefox');
    expect(detectOS(UA.winEdge)).toBe('windows');
  });

  it('is calm about garbage', () => {
    expect(detectOS('')).toBe('other');
    expect(detectBrowser('')).toBe('other');
    expect(detectOS('🤖'.repeat(50))).toBe('other');
  });
});

describe('device — form factor (capabilities lead, UA advises)', () => {
  it('phone: touch + short edge < 600', () => {
    expect(detectFormFactor(snap({ ua: UA.iphoneSafari, width: 393, height: 852, touch: true }))).toBe('phone');
  });

  it('a landscape phone is still a phone (short edge rules)', () => {
    expect(detectFormFactor(snap({ ua: UA.pixelChrome, width: 852, height: 393, touch: true }))).toBe('phone');
  });

  it('tablet: touch + short edge ≥ 600 (incl. the iPadOS masquerade)', () => {
    expect(detectFormFactor(snap({ ua: UA.androidTablet, width: 800, height: 1280, touch: true }))).toBe('tablet');
    expect(detectFormFactor(snap({ ua: UA.ipadOsMasquerade, width: 834, height: 1194, touch: true }))).toBe('tablet');
  });

  it('desktop: no touch, even in a narrow window', () => {
    expect(detectFormFactor(snap({ ua: UA.macSafari, width: 500, height: 900, touch: false }))).toBe('desktop');
  });

  it('falls back to the UA when the viewport is unknown', () => {
    expect(detectFormFactor(snap({ ua: UA.iphoneSafari, touch: true }))).toBe('phone');
    expect(detectFormFactor(snap({ ua: UA.androidTablet, touch: true }))).toBe('tablet');
  });
});

describe('device — perf class', () => {
  it('unknown when nothing is reported (Safari/Firefox)', () => {
    expect(detectPerf(snap({}))).toBe('unknown');
  });
  it('low / mid / high from memory + cores', () => {
    expect(detectPerf(snap({ deviceMemory: 2, cores: 8 }))).toBe('low');
    expect(detectPerf(snap({ deviceMemory: 4, cores: 8 }))).toBe('mid');
    expect(detectPerf(snap({ deviceMemory: 8, cores: 10 }))).toBe('high');
    expect(detectPerf(snap({ deviceMemory: 0, cores: 2 }))).toBe('low');
  });
});

describe('device — adaptations (the "it adjusts" contract)', () => {
  it('iPhone gets the full phone treatment', () => {
    const { profile, ui } = adaptToDevice(
      snap({ ua: UA.iphoneSafari, width: 393, height: 852, touch: true, dpr: 3 }),
    );
    expect(profile.formFactor).toBe('phone');
    expect(ui.singleColumn).toBe(true);
    expect(ui.compactBrain).toBe(true);
    expect(ui.touchTargets).toBe(true);
    expect(ui.bottomSheets).toBe(true);
    expect(ui.stickyPrimaryAction).toBe(true);
    expect(ui.animation).toBe('full');
  });

  it('reduced motion turns animation off everywhere', () => {
    const { ui } = adaptToDevice(snap({ ua: UA.pixelChrome, width: 412, height: 915, touch: true, reducedMotion: true }));
    expect(ui.animation).toBe('off');
  });

  it('Data Saver / low-end drops to lite animation + light media', () => {
    const low = adaptToDevice(snap({ ua: UA.pixelChrome, width: 412, height: 915, touch: true, deviceMemory: 2, cores: 4 }));
    expect(low.ui.animation).toBe('lite');
    expect(low.ui.lightMedia).toBe(true);
    const saver = adaptToDevice(snap({ ua: UA.pixelChrome, width: 412, height: 915, touch: true, saveData: true }));
    expect(saver.ui.animation).toBe('lite');
    expect(saver.ui.lightMedia).toBe(true);
  });

  it('desktop keeps the side-by-side studio and mouse ergonomics', () => {
    const { ui } = adaptToDevice(snap({ ua: UA.winEdge, width: 1440, height: 900, touch: false, deviceMemory: 16, cores: 12 }));
    expect(ui.singleColumn).toBe(false);
    expect(ui.compactBrain).toBe(false);
    expect(ui.touchTargets).toBe(false);
    expect(ui.bottomSheets).toBe(false);
    expect(ui.animation).toBe('full');
  });

  it('tablet: touch affordances without the phone layout', () => {
    const { profile, ui } = adaptToDevice(snap({ ua: UA.ipadOsMasquerade, width: 1194, height: 834, touch: true }));
    expect(profile.formFactor).toBe('tablet');
    expect(ui.touchTargets).toBe(true);
    expect(ui.singleColumn).toBe(false);
    expect(ui.bottomSheets).toBe(false);
  });

  it('the empty snapshot (SSR) is a quiet desktop — no phone UI flash', () => {
    const { profile, ui } = adaptToDevice(EMPTY_SNAPSHOT);
    expect(profile.formFactor).toBe('desktop');
    expect(ui.singleColumn).toBe(false);
    expect(ui.animation).toBe('full');
  });

  it('determinism: same snapshot ⇒ identical result objects', () => {
    const s = snap({ ua: UA.galaxySamsung, width: 384, height: 824, touch: true, deviceMemory: 8, cores: 8 });
    expect(adaptToDevice(s)).toEqual(adaptToDevice(s));
  });
});

describe('device — profile odds and ends', () => {
  it('narrow follows the viewport when known, else the form factor', () => {
    expect(deviceProfile(snap({ ua: UA.winEdge, width: 700, height: 900 })).narrow).toBe(true);
    expect(deviceProfile(snap({ ua: UA.iphoneSafari, touch: true })).narrow).toBe(true);
  });

  it('standalone (installed PWA) flows through untouched', () => {
    expect(deviceProfile(snap({ ua: UA.iphoneSafari, touch: true, standalone: true })).standalone).toBe(true);
  });

  it('adaptationsFor never returns undefined fields', () => {
    const ui = adaptationsFor(deviceProfile(EMPTY_SNAPSHOT));
    for (const v of Object.values(ui)) expect(v).not.toBeUndefined();
  });
});
