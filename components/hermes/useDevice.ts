'use client';

// The client half of the device intelligence: take a DeviceSnapshot from the real
// browser (navigator, matchMedia, visualViewport), feed it to the pure classifier in
// lib/hermes/device.ts, and keep it fresh across resize / rotation / media-query
// flips. Components consume the returned adaptations and never sniff the UA
// themselves.
//
// SSR-safe by construction: the first render (server + hydration pass) always uses
// EMPTY_SNAPSHOT — a quiet desktop — and the real device arrives in an effect, so
// server and client markup can never disagree (no hydration mismatch, no phone-UI
// flash on desktop).

import { useEffect, useState } from 'react';
import {
  adaptToDevice, EMPTY_SNAPSHOT,
  type DeviceAdaptations, type DeviceProfile, type DeviceSnapshot,
} from '@/lib/hermes/device';

/** Read a fresh snapshot from the live browser. Exported for one-off (non-hook) reads. */
export function readDeviceSnapshot(): DeviceSnapshot {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return EMPTY_SNAPSHOT;
  const nav = navigator as Navigator & {
    standalone?: boolean;
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const vv = window.visualViewport;
  return {
    ua: nav.userAgent ?? '',
    width: Math.round(vv?.width ?? window.innerWidth ?? 0),
    height: Math.round(vv?.height ?? window.innerHeight ?? 0),
    touch: (nav.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    standalone:
      (window.matchMedia?.('(display-mode: standalone)').matches ?? false) || nav.standalone === true,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory ?? 0,
    cores: nav.hardwareConcurrency ?? 0,
    dpr: window.devicePixelRatio ?? 0,
  };
}

export interface UseDeviceResult {
  profile: DeviceProfile;
  ui: DeviceAdaptations;
  /** False on the server/hydration pass; true once the real device has been read. */
  ready: boolean;
}

/**
 * React to the visitor's actual device. Re-classifies on resize, orientation change,
 * and reduced-motion / display-mode media-query flips — rotate the phone and the
 * layout follows.
 */
export function useDevice(): UseDeviceResult {
  const [state, setState] = useState<UseDeviceResult>(() => ({
    ...adaptToDevice(EMPTY_SNAPSHOT),
    ready: false,
  }));

  useEffect(() => {
    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setState((prev) => {
          const next = { ...adaptToDevice(readDeviceSnapshot()), ready: true };
          // Cheap referential stability: only swap state when something changed.
          return prev.ready && JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
      });
    };
    refresh();

    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    window.visualViewport?.addEventListener('resize', refresh);
    const queries = ['(prefers-reduced-motion: reduce)', '(display-mode: standalone)']
      .map((q) => window.matchMedia?.(q))
      .filter((mq): mq is MediaQueryList => !!mq);
    for (const mq of queries) mq.addEventListener?.('change', refresh);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      window.visualViewport?.removeEventListener('resize', refresh);
      for (const mq of queries) mq.removeEventListener?.('change', refresh);
    };
  }, []);

  return state;
}
