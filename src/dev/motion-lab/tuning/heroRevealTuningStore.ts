/**
 * Hero reveal tuning store — DEV ONLY.
 *
 * Owns the in-progress Hero tuning so it survives switching Motion Lab entries,
 * remounts, refreshes and HMR. Nothing here is imported by production: the store
 * hands the lab a plain `HeroRevealTuning` object, and the reveal components
 * take it as an optional prop whose default is the shipped sequence.
 *
 * Same single-owner arrangement as syncTrailTuningStore: one key, one payload,
 * clamped on the way in. DialKit gets a stable `id` but not `persist`, so there
 * is only ever one writer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HERO_REVEAL_DEFAULTS,
  type HeroRevealTuning,
} from '../../../components/visuals/hero/reveal/heroRevealTimeline';
import {
  HERO_BREAKPOINT_DIALS,
  HERO_BREAKPOINT_KEYS,
  HERO_FRAMING_DIALS,
  HERO_MOBILE_DIALS,
  HERO_PLACEMENT_DIALS,
  HERO_RESPONSIVE_DEFAULTS,
  HERO_SUPERSEDED_DESKTOP_TARGET,
  HERO_SUPERSEDED_SIDE_TARGETS,
  type HeroBreakpoint,
  type HeroResponsiveTuning,
} from '../../../components/visuals/hero/reveal/heroRevealComposition';

export const HERO_TUNING_STORAGE_KEY = 'beam.motionlab.heroReveal.v1';
export const HERO_TUNING_LOCK_KEY = 'beam.motionlab.heroReveal.locked.v1';
/**
 * Separate key so tuning saved before the responsive work still loads.
 *
 * v2 exists because the desktop release target changed from the panel's left
 * edge to the drop target's centre. Defaults are applied PER KEY, so anyone
 * holding a v1 payload kept the superseded 0 forever and never saw the new
 * value — that is the regression. `migrateHeroResponsiveV1` upgrades those
 * payloads in place instead of discarding them; the v1 key is deliberately
 * left on disk, so nothing a person tuned is ever thrown away.
 */
export const HERO_RESPONSIVE_STORAGE_KEY = 'beam.motionlab.heroReveal.responsive.v3';
export const HERO_RESPONSIVE_LEGACY_KEYS = [
  'beam.motionlab.heroReveal.responsive.v2',
  'beam.motionlab.heroReveal.responsive.v1',
] as const;

type Range = { min: number; max: number; step: number };

/**
 * Authoring range per dial — the SAME numbers handed to DialKit, so a value
 * that is legal in the panel is legal in storage and vice versa.
 *
 * Ranges are deliberately narrow enough that no single dial can break the
 * design: durations cannot reach zero, opacities cannot exceed 1, the press
 * cannot become a bounce, and travel distances stay inside the canvas.
 */
export const HERO_TUNING_RANGES: Record<string, Range> = {
  /*
   * Positioning ranges are deliberately wide — wide enough to move the hand and
   * the stack anywhere sensible on the 1440 x 540 canvas without editing code,
   * and to send either well off-canvas on entry or exit. They are still bounded
   * so a dial cannot fling something so far it silently disappears forever.
   */
  stackStartX: { min: -1200, max: 300, step: 10 },
  stackStartY: { min: -400, max: 400, step: 1 },
  stackTargetX: { min: -600, max: 600, step: 1 },
  stackTargetY: { min: -400, max: 400, step: 1 },
  handStartX: { min: -1200, max: 300, step: 10 },
  handStartY: { min: -400, max: 400, step: 1 },
  handTargetX: { min: -600, max: 600, step: 1 },
  handTargetY: { min: -400, max: 400, step: 1 },
  handOffsetX: { min: -300, max: 300, step: 2 },
  handOffsetY: { min: -300, max: 300, step: 2 },
  releaseOffsetX: { min: -300, max: 300, step: 2 },
  releaseOffsetY: { min: -300, max: 300, step: 2 },
  /* Global still frame before motion begins. */
  initialHoldDuration: { min: 0, max: 2000, step: 50 },
  handOpacity: { min: 0.2, max: 1, step: 0.05 },
  stackOpacity: { min: 0.2, max: 1, step: 0.05 },
  releaseBlur: { min: 0, max: 8, step: 0.5 },
  approachStart: { min: 0, max: 600, step: 20 },
  approachDuration: { min: 320, max: 1400, step: 20 },
  /*
   * Bounded so the hold reads as a settle rather than a stall: at 400ms the
   * stack sits visibly still, which is the top of what reads as intentional
   * before it becomes a dead interval.
   */
  arrivalHoldDuration: { min: 0, max: 400, step: 10 },
  releaseDelay: { min: 0, max: 300, step: 10 },
  settleOffsetY: { min: -12, max: 12, step: 1 },
  handOpenDuration: { min: 60, max: 400, step: 10 },
  releaseDuration: { min: 120, max: 600, step: 10 },
  pointerExitDelay: { min: 0, max: 700, step: 10 },
  pointerExitDuration: { min: 160, max: 900, step: 20 },
  pointerExitX: { min: -1200, max: 1200, step: 10 },
  pointerExitY: { min: -600, max: 600, step: 1 },
  pointerExitOpacity: { min: 0, max: 0.6, step: 0.05 },
  // drop response
  armStart: { min: 300, max: 1000, step: 10 },
  armDuration: { min: 100, max: 600, step: 10 },
  pressAmount: { min: 0, max: 0.02, step: 0.001 },
  pressStart: { min: 600, max: 1400, step: 10 },
  pressDuration: { min: 140, max: 600, step: 10 },
  armedIntensity: { min: 0, max: 1.4, step: 0.05 },
  confirmOpacity: { min: 0, max: 1, step: 0.05 },
  confirmInStart: { min: 600, max: 1400, step: 10 },
  confirmInDuration: { min: 60, max: 600, step: 10 },
  confirmHoldDuration: { min: 0, max: 700, step: 10 },
  confirmOutDuration: { min: 80, max: 700, step: 10 },
  dashedFadeStart: { min: 800, max: 1800, step: 10 },
  dashedFadeDuration: { min: 100, max: 600, step: 10 },
  copyFadeStart: { min: 700, max: 1700, step: 10 },
  copyFadeDuration: { min: 80, max: 500, step: 10 },
  // upload state
  uploadInStart: { min: 900, max: 2000, step: 20 },
  uploadInDuration: { min: 160, max: 800, step: 20 },
  uploadY: { min: 0, max: 24, step: 1 },
  uploadOpacity: { min: 0.3, max: 1, step: 0.05 },
  uploadStart: { min: 1100, max: 2400, step: 20 },
  uploadDuration: { min: 900, max: 3600, step: 50 },
  textureOpacity: { min: 0, max: 1.6, step: 0.05 },
  textureBandStrength: { min: 0, max: 2, step: 0.05 },
  completeMixDuration: { min: 120, max: 800, step: 20 },
  completeBlur: { min: 0, max: 4, step: 0.25 },
  // workspace handoff
  resolveDelay: { min: 0, max: 1200, step: 20 },
  resolveDuration: { min: 200, max: 1200, step: 20 },
  workspaceOpacity: { min: 0.4, max: 1, step: 0.05 },
  /* Handoff inside the resolve window; both clamp to it, so total time is fixed. */
  dismissDuration: { min: 60, max: 800, step: 10 },
  dismissBlur: { min: 0, max: 12, step: 0.5 },
  revealDelay: { min: 0, max: 800, step: 10 },
};

export const HERO_TUNING_NUMERIC = Object.keys(HERO_TUNING_RANGES);

/** Selects, kept separate because they are strings rather than sliders. */
export const HERO_TUNING_SELECTS = {
  approachEase: ['approach', 'outSoft', 'out2', 'clerkReveal', 'confirm', 'inOut'],
  pointerExitEase: ['depart', 'out2', 'outSoft', 'clerkReveal', 'inOut'],
  progressCurve: ['blend', 'easeOut', 'clerk', 'linear'],
  /* 'contact' derives the grey from geometry; 'time' uses the armStart dial. */
  armTrigger: ['contact', 'time'],
} as const;

/**
 * Mobile-only composition ranges. The position dials reuse the ranges above —
 * they are the same quantities, just resolved per breakpoint — so a value that
 * is legal globally is legal in every band.
 *
 * `compositionScale` is bounded at 1.6 because beyond roughly 1.35 the zoom
 * starts cutting the panel's own edges, which is the one thing the mobile
 * composition exists to keep visible.
 */
export const HERO_RESPONSIVE_RANGES: Record<string, Range> = {
  /*
   * Wide enough to slide the window right across the panel in either direction,
   * bounded so the crop cannot be pushed off the artwork entirely.
   */
  framingOffsetX: { min: -400, max: 400, step: 2 },
  visualScale: { min: 0.8, max: 1.6, step: 0.02 },
  /* Screen px. Bounded so the composition cannot be pushed out of its container. */
  compositionTranslateX: { min: -300, max: 300, step: 2 },
  compositionTranslateY: { min: -300, max: 300, step: 2 },
  /*
   * Hand-only and files-only multipliers. 1 is the authored size. Bounded so
   * the hand cannot vanish or swallow the panel, and so the stack still fits
   * the drop target at the top of the range.
   */
  pointerScale: { min: 0.5, max: 2, step: 0.02 },
  filesScale: { min: 0.5, max: 2, step: 0.02 },
  /* Canvas px, added to the upload panel's authored centring. 0 is authored. */
  uploadOffsetX: { min: -600, max: 600, step: 2 },
  uploadOffsetY: { min: -300, max: 300, step: 2 },
  compositionScale: { min: 0.6, max: 1.6, step: 0.01 },
  compositionOffsetX: { min: -400, max: 400, step: 2 },
  compositionOffsetY: { min: -300, max: 300, step: 2 },
};

/** The authoring range for a responsive dial, wherever it is defined. */
export function heroResponsiveRange(key: string): Range {
  return HERO_RESPONSIVE_RANGES[key] ?? HERO_TUNING_RANGES[key];
}

/** Clamp and snap exactly the way DialKit's slider normalises, so mounting is idempotent. */
export function clampHeroDial(key: string, value: unknown): number {
  const range = HERO_TUNING_RANGES[key];
  const fallback = (HERO_REVEAL_DEFAULTS as unknown as Record<string, number>)[key];
  if (!range || typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const snapped = range.min + Math.round((value - range.min) / range.step) * range.step;
  const clamped = Math.min(range.max, Math.max(range.min, snapped));
  const decimals = String(range.step).split('.')[1]?.length ?? 0;
  return Number(clamped.toFixed(decimals));
}

/** Coerce anything into a usable tuning; `repaired` reports that it was not clean. */
export function sanitizeHeroTuning(raw: unknown): {
  state: HeroRevealTuning;
  repaired: boolean;
} {
  const state = { ...HERO_REVEAL_DEFAULTS };
  if (!raw || typeof raw !== 'object') return { state, repaired: true };
  const src = raw as Record<string, unknown>;
  let repaired = false;
  for (const key of HERO_TUNING_NUMERIC) {
    const clamped = clampHeroDial(key, src[key]);
    if (clamped !== src[key]) repaired = true;
    (state as unknown as Record<string, number>)[key] = clamped;
  }
  for (const [key, options] of Object.entries(HERO_TUNING_SELECTS)) {
    const v = src[key];
    if (typeof v === 'string' && (options as readonly string[]).includes(v)) {
      (state as unknown as Record<string, string>)[key] = v;
    } else {
      repaired = true;
    }
  }
  return { state, repaired };
}

function clampWithRange(range: Range | undefined, value: unknown, fallback: number): number {
  if (!range || typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const snapped = range.min + Math.round((value - range.min) / range.step) * range.step;
  const clamped = Math.min(range.max, Math.max(range.min, snapped));
  const decimals = String(range.step).split('.')[1]?.length ?? 0;
  return Number(clamped.toFixed(decimals));
}

/**
 * Clamp one responsive dial against its band's defaults.
 *
 * BACKWARD COMPATIBILITY: a key that is missing from a stored payload (for
 * example the placement dials added after the payload was written) resolves
 * to its NEUTRAL default here, and every key that is present is carried
 * through unchanged. No stored value is ever rewritten by this fallback.
 */
export function clampHeroResponsiveDial(
  breakpoint: HeroBreakpoint,
  key: string,
  value: unknown,
): number {
  const defaults = HERO_RESPONSIVE_DEFAULTS[breakpoint] as unknown as Record<string, number>;
  return clampWithRange(heroResponsiveRange(key), value, defaults[key]);
}

/**
 * Keys a given band owns, in PANEL ORDER: placement first (what moves and
 * sizes the visual, the hand and the files), then the crop window, then
 * mobile's zoom, then the entry / target / exit positions.
 */
export function heroBreakpointKeys(breakpoint: HeroBreakpoint): readonly string[] {
  if (breakpoint === 'mobile') {
    return [
      ...HERO_PLACEMENT_DIALS,
      ...HERO_FRAMING_DIALS,
      ...HERO_MOBILE_DIALS,
      ...HERO_BREAKPOINT_DIALS,
    ];
  }
  if (breakpoint === 'tablet') {
    return [...HERO_PLACEMENT_DIALS, ...HERO_FRAMING_DIALS, ...HERO_BREAKPOINT_DIALS];
  }
  /* Desktop's framing is the full canvas and deliberately has no window dial. */
  return [...HERO_PLACEMENT_DIALS, ...HERO_BREAKPOINT_DIALS];
}

export function sanitizeHeroResponsive(raw: unknown): {
  state: HeroResponsiveTuning;
  repaired: boolean;
} {
  const state = {
    desktop: { ...HERO_RESPONSIVE_DEFAULTS.desktop },
    tablet: { ...HERO_RESPONSIVE_DEFAULTS.tablet },
    mobile: { ...HERO_RESPONSIVE_DEFAULTS.mobile },
  };
  if (!raw || typeof raw !== 'object') return { state, repaired: true };
  const src = raw as Record<string, unknown>;
  let repaired = false;
  for (const bp of HERO_BREAKPOINT_KEYS) {
    const group = src[bp];
    const values = group && typeof group === 'object' ? (group as Record<string, unknown>) : {};
    if (!group || typeof group !== 'object') repaired = true;
    const target = state[bp] as unknown as Record<string, number>;
    for (const key of heroBreakpointKeys(bp)) {
      const clamped = clampHeroResponsiveDial(bp, key, values[key]);
      if (clamped !== values[key]) repaired = true;
      target[key] = clamped;
    }
  }
  return { state, repaired };
}

export function sameHeroResponsive(a: HeroResponsiveTuning, b: HeroResponsiveTuning) {
  return HERO_BREAKPOINT_KEYS.every((bp) => {
    const left = a[bp] as unknown as Record<string, number>;
    const right = b[bp] as unknown as Record<string, number>;
    return heroBreakpointKeys(bp).every((key) => left[key] === right[key]);
  });
}

export function sameHeroTuning(a: HeroRevealTuning, b: HeroRevealTuning) {
  return (Object.keys(HERO_REVEAL_DEFAULTS) as (keyof HeroRevealTuning)[]).every(
    (key) => a[key] === b[key],
  );
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** How long a gesture must be still before it becomes one undo entry. */
const HISTORY_QUIET_MS = 400;
/** Bounded so a long tuning session cannot grow without limit. */
const HISTORY_LIMIT = 60;

/**
 * One snapshot of everything the panel owns. Undo/redo, reset and persistence
 * all operate on this, so a responsive tweak is as undoable as a timing one.
 */
export type HeroTuningSnapshot = {
  base: HeroRevealTuning;
  responsive: HeroResponsiveTuning;
};

/**
 * Same-tab change notification.
 *
 * `storage` events only fire in OTHER tabs, which is exactly what we want for
 * "tune in Motion Lab, watch the homepage update" — but it means a reader
 * mounted in the same document as the panel would never hear anything. This
 * event covers that half.
 */
const HERO_TUNING_EVENT = 'beam:hero-reveal-tuning';

/**
 * Upgrade a v1 responsive payload.
 *
 * Every value is carried across untouched EXCEPT a desktop release target that
 * is still sitting on the superseded default — those adopt the centred target.
 * A desktop target someone actually moved is left exactly as they set it, so
 * migrating can never silently undo tuning.
 *
 * Pure, so it can be exercised directly.
 */
export function migrateHeroResponsiveV1(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const src = raw as Record<string, unknown>;
  const desktop = src.desktop;
  if (!desktop || typeof desktop !== 'object') return raw;

  const from = desktop as Record<string, unknown>;
  const to: Record<string, unknown> = { ...from };
  for (const [key, superseded] of Object.entries(HERO_SUPERSEDED_DESKTOP_TARGET)) {
    const stored = from[key];
    const untouched = stored === undefined || stored === superseded;
    if (untouched) {
      to[key] = (HERO_RESPONSIVE_DEFAULTS.desktop as unknown as Record<string, number>)[key];
    }
  }
  return { ...src, desktop: to };
}

/**
 * Upgrade to v3: tablet and mobile adopt the LEFT-side release target.
 *
 * DESKTOP IS COPIED VERBATIM. Not read, not compared, not normalised — the
 * desktop band is passed straight through, so whatever is tuned there survives
 * untouched. Only tablet and mobile are considered, and only where their stored
 * target is still one of the superseded values (the authored 0, or desktop's
 * centred value if a band picked that up). A tablet or mobile target that was
 * deliberately set to anything else is left exactly as it is.
 *
 * Pure, so it can be exercised directly.
 */
export function migrateHeroResponsiveToV3(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const src = raw as Record<string, unknown>;
  const next: Record<string, unknown> = { ...src };

  for (const bp of ['tablet', 'mobile'] as const) {
    const band = src[bp];
    if (!band || typeof band !== 'object') continue;
    const from = band as Record<string, unknown>;
    const to: Record<string, unknown> = { ...from };
    for (const [key, superseded] of Object.entries(HERO_SUPERSEDED_SIDE_TARGETS)) {
      const stored = from[key];
      const untouched =
        stored === undefined || (typeof stored === 'number' && superseded.includes(stored));
      if (untouched) {
        to[key] = (HERO_RESPONSIVE_DEFAULTS[bp] as unknown as Record<string, number>)[key];
      }
    }
    next[bp] = to;
  }
  return next;
}

/** The stored responsive payload, migrated forward from whichever key holds it. */
function readResponsiveRaw(): unknown {
  const storage = getStorage();
  const parse = (key: string): unknown => {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const current = parse(HERO_RESPONSIVE_STORAGE_KEY);
  if (current) return current;
  for (const key of HERO_RESPONSIVE_LEGACY_KEYS) {
    const legacy = parse(key);
    if (!legacy) continue;
    /*
     * v1 payloads need the desktop step as well; v2 already has it. Both then
     * take the v3 step, which never touches desktop. Legacy keys are left on
     * disk deliberately — nothing anyone tuned is ever removed.
     */
    const desktopStepped =
      key === 'beam.motionlab.heroReveal.responsive.v1' ? migrateHeroResponsiveV1(legacy) : legacy;
    return migrateHeroResponsiveToV3(desktopStepped);
  }
  return null;
}

/** Read the persisted snapshot. Always returns something usable. */
export function readHeroTuningSnapshot(): HeroTuningSnapshot {
  const storage = getStorage();
  const read = (key: string): unknown => {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  return {
    base: sanitizeHeroTuning(read(HERO_TUNING_STORAGE_KEY)).state,
    responsive: sanitizeHeroResponsive(readResponsiveRaw()).state,
  };
}

/**
 * Subscribe to tuning changes. ONE implementation, used by the reader and the
 * writer alike, so the Motion Lab panel and the homepage preview cannot end up
 * on different update paths — which is exactly how they drifted apart before.
 *
 * `sameTab` is false for the writer: it DISPATCHES the same-tab event itself,
 * so listening to it would be a feedback loop. The native `storage` event never
 * fires in the tab that wrote, so the writer hears only other tabs — plus focus
 * and visibility, which cover an event dropped while the tab was idle.
 *
 * Updates are coalesced on a short timer: dragging a slider writes on every
 * pointer move, and an un-coalesced listener would re-parse at that rate. A
 * timer rather than rAF, because a background tab has rAF suspended and the
 * whole point is to be correct by the time you look at it.
 */
function subscribeHeroTuning(sync: () => void, { sameTab }: { sameTab: boolean }) {
  let queued: number | null = null;
  const run = () => {
    if (queued !== null) return;
    queued = window.setTimeout(() => {
      queued = null;
      sync();
    }, 16);
  };
  window.addEventListener('storage', run);
  window.addEventListener('focus', run);
  document.addEventListener('visibilitychange', run);
  if (sameTab) window.addEventListener(HERO_TUNING_EVENT, run);
  return () => {
    if (queued !== null) window.clearTimeout(queued);
    window.removeEventListener('storage', run);
    window.removeEventListener('focus', run);
    document.removeEventListener('visibilitychange', run);
    if (sameTab) window.removeEventListener(HERO_TUNING_EVENT, run);
  };
}

/**
 * READ-ONLY view of the tuning, live.
 *
 * This is what lets the local homepage preview and the Motion Lab panel share
 * one source of truth rather than two copies: the panel is the only writer, and
 * every reader re-reads whenever the stored value changes — in this tab via the
 * event above, in other tabs via `storage`. Nothing is copied by hand.
 *
 * Updates are coalesced on a short timer, because dragging a slider writes on
 * every pointer move and an un-coalesced reader would re-parse and re-render at
 * the same rate. A timer rather than rAF: a preview sitting in a BACKGROUND tab
 * has rAF suspended, and the whole point is that it is already correct by the
 * time you switch to it.
 */
export function useHeroRevealTuningValue(): HeroTuningSnapshot {
  const [snapshot, setSnapshot] = useState<HeroTuningSnapshot>(readHeroTuningSnapshot);

  useEffect(
    () => subscribeHeroTuning(() => setSnapshot(readHeroTuningSnapshot()), { sameTab: true }),
    [],
  );

  return snapshot;
}

function sameSnapshot(a: HeroTuningSnapshot, b: HeroTuningSnapshot) {
  return sameHeroTuning(a.base, b.base) && sameHeroResponsive(a.responsive, b.responsive);
}

export function useHeroRevealTuning() {
  const [state, setState] = useState<HeroTuningSnapshot>(() => {
    const storage = getStorage();
    const read = (key: string): unknown => {
      try {
        const raw = storage?.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };
    return {
      base: storage ? sanitizeHeroTuning(read(HERO_TUNING_STORAGE_KEY)).state : { ...HERO_REVEAL_DEFAULTS },
      responsive: sanitizeHeroResponsive(storage ? readResponsiveRaw() : null).state,
    };
  });
  const [locked, setLockedState] = useState<boolean>(() => {
    const storage = getStorage();
    try {
      return storage?.getItem(HERO_TUNING_LOCK_KEY) === '1';
    } catch {
      return false;
    }
  });

  /*
   * Undo history. Entries are pushed only after the values have been STILL for
   * HISTORY_QUIET_MS, so dragging a slider across a hundred intermediate values
   * lands as a single entry rather than a hundred. A push is skipped when the
   * state already equals the entry at the cursor, which is what stops undo and
   * redo from re-recording their own restorations.
   */
  const history = useRef<HeroTuningSnapshot[]>([state]);
  const cursor = useRef(0);
  const timer = useRef<number | null>(null);

  /*
   * The panel owns DialKit's live values, so adopting a change made elsewhere
   * has to be announced — otherwise the store moves and the panel keeps showing
   * (and, on its next commit, writes back) what it had. This holds the snapshot
   * that arrived from outside; the panel pushes it into DialKit.
   */
  const [externalUpdate, setExternalUpdate] = useState<HeroTuningSnapshot | null>(null);
  const latest = useRef(state);
  latest.current = state;

  const schedulePush = useCallback((next: HeroTuningSnapshot) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (sameSnapshot(history.current[cursor.current], next)) return;
      const trimmed = history.current.slice(0, cursor.current + 1);
      trimmed.push(next);
      const overflow = Math.max(0, trimmed.length - HISTORY_LIMIT);
      history.current = trimmed.slice(overflow);
      cursor.current = history.current.length - 1;
    }, HISTORY_QUIET_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /*
   * ADOPT CHANGES MADE ELSEWHERE. Without this the panel read storage once, in
   * its initialiser, and then drifted: another tab (or a migration that landed
   * after mount) could move the stored tuning and the lab would keep showing —
   * and re-saving — the values it happened to load with.
   *
   * `sameTab: false` because this hook is the one dispatching the same-tab
   * event. Its own writes never come back round.
   */
  useEffect(
    () =>
      subscribeHeroTuning(
        () => {
          const next = readHeroTuningSnapshot();
          if (sameSnapshot(latest.current, next)) return;
          latest.current = next;
          setState(next);
          setExternalUpdate(next);
          schedulePush(next);
        },
        { sameTab: false },
      ),
    [schedulePush],
  );

  const commit = useCallback(
    (patch: Partial<HeroRevealTuning>) => {
      setState((prev) => {
        const next: HeroTuningSnapshot = {
          base: sanitizeHeroTuning({ ...prev.base, ...patch }).state,
          responsive: prev.responsive,
        };
        if (sameSnapshot(prev, next)) return prev;
        schedulePush(next);
        return next;
      });
    },
    [schedulePush],
  );

  /** Patch one breakpoint's positions. Other bands are left alone. */
  const commitResponsive = useCallback(
    (breakpoint: HeroBreakpoint, patch: Record<string, number>) => {
      setState((prev) => {
        const merged = {
          ...prev.responsive,
          [breakpoint]: { ...prev.responsive[breakpoint], ...patch },
        };
        const next: HeroTuningSnapshot = {
          base: prev.base,
          responsive: sanitizeHeroResponsive(merged).state,
        };
        if (sameSnapshot(prev, next)) return prev;
        schedulePush(next);
        return next;
      });
    },
    [schedulePush],
  );

  const reset = useCallback(() => {
    const next: HeroTuningSnapshot = {
      base: { ...HERO_REVEAL_DEFAULTS },
      responsive: sanitizeHeroResponsive(null).state,
    };
    setState(next);
    schedulePush(next);
  }, [schedulePush]);

  /**
   * Step the history cursor. Returns the restored snapshot so the caller can
   * push it back into DialKit — the panel owns its live values, so restoring
   * the store alone would leave the two disagreeing.
   */
  const step = useCallback((direction: -1 | 1): HeroTuningSnapshot | null => {
    // A pending push would otherwise land after the step and clobber it.
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const target = cursor.current + direction;
    if (target < 0 || target >= history.current.length) return null;
    cursor.current = target;
    const restored = history.current[target];
    setState(restored);
    return restored;
  }, []);

  const undo = useCallback(() => step(-1), [step]);
  const redo = useCallback(() => step(1), [step]);

  const setLocked = useCallback((next: boolean) => {
    setLockedState(next);
    const storage = getStorage();
    try {
      storage?.setItem(HERO_TUNING_LOCK_KEY, next ? '1' : '0');
    } catch {
      /* blocked site data — the lock simply does not persist */
    }
  }, []);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(HERO_TUNING_STORAGE_KEY, JSON.stringify(state.base));
      storage.setItem(HERO_RESPONSIVE_STORAGE_KEY, JSON.stringify(state.responsive));
      // Readers in THIS tab; other tabs get the native `storage` event.
      window.dispatchEvent(new Event(HERO_TUNING_EVENT));
    } catch {
      /* quota or blocked site data — tuning simply does not persist */
    }
  }, [state]);

  return {
    state: state.base,
    responsive: state.responsive,
    snapshot: state,
    /** Changes identity only when a change from OUTSIDE this hook is adopted. */
    externalUpdate,
    commit,
    commitResponsive,
    reset,
    locked,
    setLocked,
    undo,
    redo,
    canUndo: cursor.current > 0,
    canRedo: cursor.current < history.current.length - 1,
  };
}
