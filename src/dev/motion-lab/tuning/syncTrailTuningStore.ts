/**
 * Sync trail tuning store — DEV ONLY.
 *
 * Owns the Founder's in-progress trail tuning so it survives switching Motion
 * Lab entries, remounts, refreshes and HMR, and stays put until it is explicitly
 * reset. Nothing here is imported by production code: the store hands the lab a
 * plain `{ length, scale, glowIntensity, glowRadius }` object, and production
 * SyncVisual has no idea it exists.
 *
 * WHY A WRAPPER RATHER THAN DialKit's OWN PERSISTENCE
 *
 * DialKit 1.4.3 does have `useDialKit(name, config, { id, persist })`, which
 * stores values under a custom localStorage key and retains the panel across
 * unmounts. It is not enough on its own for two reasons:
 *
 *   1. It cannot persist the LOCK. `persist` covers dial values, presets and the
 *      active preset — there is no lock concept in the library at all.
 *   2. It reads back whatever is in storage. There is no per-control validation
 *      hook, so a hand-edited or stale payload would be adopted as-is.
 *
 * Running DialKit's persistence AND this layer would mean two writers, two
 * shapes and two chances to drift, so this module is the single owner: one key,
 * one payload, clamped on the way in. DialKit is given a stable `id` (so the
 * panel is one logical panel) but no `persist`.
 */

import { useCallback, useRef, useState } from 'react';

export const SYNC_TUNING_STORAGE_KEY = 'beam.motionlab.syncTrailTuning.v1';

export type SyncTuningDial =
  | 'trailLength'
  | 'dotScale'
  | 'glowIntensity'
  | 'glowRadius';

/**
 * The authoring range of each dial — the SAME numbers handed to DialKit, so a
 * value that is legal in the panel is legal in storage and vice versa.
 */
export const SYNC_TUNING_RANGES: Record<
  SyncTuningDial,
  { min: number; max: number; step: number }
> = {
  trailLength: { min: 0.8, max: 2, step: 0.05 },
  dotScale: { min: 0.6, max: 1.2, step: 0.05 },
  glowIntensity: { min: 0, max: 2, step: 0.05 },
  glowRadius: { min: 0.5, max: 2, step: 0.05 },
};

export const SYNC_TUNING_DIALS = Object.keys(
  SYNC_TUNING_RANGES,
) as SyncTuningDial[];

/**
 * Production-relative baseline. 1.00x on all four IS what the homepage renders
 * — the Founder-approved profile is baked into SyncVisual itself, so "reset to
 * production" means "back to 1.00x", not "back to some earlier look".
 */
export const SYNC_TUNING_BASELINE: Record<SyncTuningDial, number> = {
  trailLength: 1,
  dotScale: 1,
  glowIntensity: 1,
  glowRadius: 1,
};

export type SyncTuningState = Record<SyncTuningDial, number> & {
  locked: boolean;
};

export const SYNC_TUNING_DEFAULTS: SyncTuningState = {
  ...SYNC_TUNING_BASELINE,
  locked: false,
};

/**
 * Clamp to the dial's range and snap to its step, mirroring DialKit's own slider
 * normalisation (`min + round((v - min) / step) * step`, clamped, fixed to the
 * step's precision). Matching it matters: if the store rounded differently from
 * the panel, every mount would nudge the value and re-save it.
 *
 * Anything non-finite — NaN, Infinity, a string that survived JSON — falls back
 * to that dial's baseline rather than poisoning the visual.
 */
export function clampDial(dial: SyncTuningDial, value: unknown): number {
  const { min, max, step } = SYNC_TUNING_RANGES[dial];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return SYNC_TUNING_BASELINE[dial];
  }
  const snapped = min + Math.round((value - min) / step) * step;
  const clamped = Math.min(max, Math.max(min, snapped));
  const decimals = String(step).split('.')[1]?.length ?? 0;
  return Number(clamped.toFixed(decimals));
}

/** True when two states are value-identical, so nothing needs saving. */
export function sameTuningState(a: SyncTuningState, b: SyncTuningState) {
  return (
    a.locked === b.locked &&
    SYNC_TUNING_DIALS.every((dial) => a[dial] === b[dial])
  );
}

/**
 * Coerce anything into a usable state. `repaired` reports that the input was not
 * already a clean payload, so the panel can say so instead of silently
 * pretending the Founder's numbers were honoured.
 */
export function sanitizeTuningState(raw: unknown): {
  state: SyncTuningState;
  repaired: boolean;
} {
  if (!raw || typeof raw !== 'object') {
    return { state: { ...SYNC_TUNING_DEFAULTS }, repaired: true };
  }
  const source = raw as Record<string, unknown>;
  let repaired = false;

  const state = { ...SYNC_TUNING_DEFAULTS };
  for (const dial of SYNC_TUNING_DIALS) {
    const clamped = clampDial(dial, source[dial]);
    if (clamped !== source[dial]) repaired = true;
    state[dial] = clamped;
  }
  if (typeof source.locked === 'boolean') {
    state.locked = source.locked;
  } else {
    repaired = true;
  }
  return { state, repaired };
}

/** localStorage can throw outright (Safari private mode, blocked site data). */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export type TuningSource = 'stored' | 'defaults' | 'unavailable';

export function readStoredTuning(): {
  state: SyncTuningState;
  source: TuningSource;
  repaired: boolean;
} {
  const storage = getStorage();
  if (!storage) {
    return {
      state: { ...SYNC_TUNING_DEFAULTS },
      source: 'unavailable',
      repaired: false,
    };
  }
  let text: string | null = null;
  try {
    text = storage.getItem(SYNC_TUNING_STORAGE_KEY);
  } catch {
    return {
      state: { ...SYNC_TUNING_DEFAULTS },
      source: 'unavailable',
      repaired: false,
    };
  }
  if (text === null) {
    return {
      state: { ...SYNC_TUNING_DEFAULTS },
      source: 'defaults',
      repaired: false,
    };
  }
  try {
    const { state, repaired } = sanitizeTuningState(JSON.parse(text));
    return { state, source: 'stored', repaired };
  } catch {
    // Truncated or hand-mangled JSON: fall back rather than throw on mount.
    return { state: { ...SYNC_TUNING_DEFAULTS }, source: 'stored', repaired: true };
  }
}

/** Returns false when the write could not be made (quota, blocked storage). */
export function writeStoredTuning(state: SyncTuningState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(SYNC_TUNING_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * React binding for the store.
 *
 * Hydrates once per mount from localStorage (which is what makes tuning survive
 * entry switches, remounts, refreshes and HMR — every one of those re-runs this
 * initialiser), then writes back on every deliberate change.
 *
 * `commit` is deliberately a no-op when nothing actually changed. The lab mirrors
 * DialKit's live values into the store on every value change, so without that
 * guard the mirror would re-render and re-save forever.
 */
export function useSyncTrailTuning() {
  const [hydrated] = useState(readStoredTuning);
  const [state, setState] = useState<SyncTuningState>(hydrated.state);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [storageOk, setStorageOk] = useState(hydrated.source !== 'unavailable');

  // commit() must not change identity (it is an effect dependency), so the
  // current state is read through a ref rather than closed over.
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback((patch: Partial<SyncTuningState>) => {
    const current = stateRef.current;
    const nextLocked =
      typeof patch.locked === 'boolean' ? patch.locked : current.locked;

    /*
     * THE LOCK IS ENFORCED HERE, not in the panel.
     *
     * While locked, the only field that can change is the lock itself: dial
     * values are taken from the current state and the patch's are discarded.
     * Removing the sliders from the panel stops a person editing them, but
     * DialKit's `updateValue` has no type or range validation, so a stray
     * programmatic write can still land a number on a locked path. This is the
     * gate that makes such a write unable to reach the visual or storage.
     */
    const dialSource = current.locked ? current : { ...current, ...patch };

    const next: SyncTuningState = { locked: nextLocked, ...SYNC_TUNING_BASELINE };
    for (const dial of SYNC_TUNING_DIALS) {
      next[dial] = clampDial(dial, dialSource[dial]);
    }

    if (sameTuningState(next, current)) return;
    stateRef.current = next;
    setState(next);
    setStorageOk(writeStoredTuning(next));
    setSavedAt(Date.now());
  }, []);

  return {
    state,
    commit,
    /** Where this mount's opening values came from. */
    source: hydrated.source,
    /** Stored payload was malformed/out of range and had to be corrected. */
    repaired: hydrated.repaired,
    /** Set once a change has been written this mount — drives the "Saved" note. */
    savedAt,
    /** False when localStorage refused the write, so the panel can say so. */
    storageOk,
  };
}
