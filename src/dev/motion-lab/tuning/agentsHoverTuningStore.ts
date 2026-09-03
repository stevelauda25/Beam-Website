/**
 * Agents hover tuning store — DEV ONLY.
 *
 * Same architecture as syncTrailTuningStore (own key, own payload, clamped on
 * the way in, lock enforced in commit), deliberately kept as a separate small
 * store rather than generalising the Sync one: the two panels tune different
 * quantities (multipliers vs milliseconds) with different ranges, and a shared
 * abstraction would have to know about both.
 *
 * Nothing here reaches production. The lab hands AgentVisual plain milliseconds
 * through its optional `hoverTuning` prop; with the prop absent the component
 * runs both hover halves at 1x.
 */

import { useCallback, useRef, useState } from 'react';

export const AGENTS_TUNING_STORAGE_KEY = 'beam.motionlab.agentsTuning.v1';

export type AgentsTuningDial =
  | 'reverseDuration'
  | 'startHold'
  | 'replayDuration';

/** The authoring range of each dial — the SAME numbers handed to DialKit. */
export const AGENTS_TUNING_RANGES: Record<
  AgentsTuningDial,
  { min: number; max: number; step: number }
> = {
  reverseDuration: { min: 300, max: 3000, step: 50 },
  startHold: { min: 0, max: 1000, step: 50 },
  replayDuration: { min: 300, max: 3000, step: 50 },
};

export const AGENTS_TUNING_DIALS = Object.keys(
  AGENTS_TUNING_RANGES,
) as AgentsTuningDial[];

/**
 * Production defaults. The two durations equal the authored intro duration,
 * which is 1x playback in each direction, and the hold matches the component's
 * own HOVER_HOLD_DEFAULT_MS — exactly what the homepage does with no prop.
 */
export const AGENTS_TUNING_BASELINE: Record<AgentsTuningDial, number> = {
  reverseDuration: 2300,
  startHold: 300,
  replayDuration: 2300,
};

export type AgentsTuningState = Record<AgentsTuningDial, number> & {
  locked: boolean;
};

export const AGENTS_TUNING_DEFAULTS: AgentsTuningState = {
  ...AGENTS_TUNING_BASELINE,
  locked: false,
};

/**
 * Clamp to the dial's range and snap to its step, mirroring DialKit's own slider
 * normalisation so the panel and the store never disagree. Anything non-finite
 * falls back to that dial's production default.
 */
export function clampAgentsDial(
  dial: AgentsTuningDial,
  value: unknown,
): number {
  const { min, max, step } = AGENTS_TUNING_RANGES[dial];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return AGENTS_TUNING_BASELINE[dial];
  }
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

export function sameAgentsTuning(a: AgentsTuningState, b: AgentsTuningState) {
  return (
    a.locked === b.locked &&
    AGENTS_TUNING_DIALS.every((dial) => a[dial] === b[dial])
  );
}

/** Coerce anything into a usable state; `repaired` reports that it was not clean. */
export function sanitizeAgentsTuning(raw: unknown): {
  state: AgentsTuningState;
  repaired: boolean;
} {
  if (!raw || typeof raw !== 'object') {
    return { state: { ...AGENTS_TUNING_DEFAULTS }, repaired: true };
  }
  const source = raw as Record<string, unknown>;
  let repaired = false;

  const state = { ...AGENTS_TUNING_DEFAULTS };
  for (const dial of AGENTS_TUNING_DIALS) {
    const stored = source[dial];
    const clamped = clampAgentsDial(dial, stored);
    // Absent = an older payload from before this dial existed. Fall back to the
    // production default quietly; only a value that was PRESENT and had to be
    // corrected counts as a repair worth reporting.
    if (stored !== undefined && clamped !== stored) repaired = true;
    state[dial] = clamped;
  }
  if (typeof source.locked === 'boolean') {
    state.locked = source.locked;
  } else {
    repaired = true;
  }
  return { state, repaired };
}

/** localStorage can throw outright (private mode, blocked site data). */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export type AgentsTuningSource = 'stored' | 'defaults' | 'unavailable';

export function readStoredAgentsTuning(): {
  state: AgentsTuningState;
  source: AgentsTuningSource;
  repaired: boolean;
} {
  const storage = getStorage();
  const fallback = { ...AGENTS_TUNING_DEFAULTS };
  if (!storage) {
    return { state: fallback, source: 'unavailable', repaired: false };
  }
  let text: string | null = null;
  try {
    text = storage.getItem(AGENTS_TUNING_STORAGE_KEY);
  } catch {
    return { state: fallback, source: 'unavailable', repaired: false };
  }
  if (text === null) {
    return { state: fallback, source: 'defaults', repaired: false };
  }
  try {
    const { state, repaired } = sanitizeAgentsTuning(JSON.parse(text));
    return { state, source: 'stored', repaired };
  } catch {
    // Truncated or hand-mangled JSON: fall back rather than throw on mount.
    return { state: fallback, source: 'stored', repaired: true };
  }
}

/** Returns false when the write could not be made (quota, blocked storage). */
export function writeStoredAgentsTuning(state: AgentsTuningState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(AGENTS_TUNING_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * React binding. Hydrates once per mount from localStorage — which is what makes
 * tuning survive entry switches, remounts, refreshes and HMR — then writes back
 * on every deliberate change.
 */
export function useAgentsHoverTuning() {
  const [hydrated] = useState(readStoredAgentsTuning);
  const [state, setState] = useState<AgentsTuningState>(hydrated.state);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [storageOk, setStorageOk] = useState(hydrated.source !== 'unavailable');

  // commit() must not change identity (it is an effect dependency), so the
  // current state is read through a ref rather than closed over.
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback((patch: Partial<AgentsTuningState>) => {
    const current = stateRef.current;
    const nextLocked =
      typeof patch.locked === 'boolean' ? patch.locked : current.locked;

    /*
     * THE LOCK IS ENFORCED HERE, not in the panel. While locked the only field
     * that can change is the lock itself: dial values are taken from the current
     * state and the patch's are discarded. Removing the sliders stops a person
     * editing them, but DialKit's updateValue has no validation, so a stray
     * programmatic write could still land a number on a locked path.
     */
    const dialSource = current.locked ? current : { ...current, ...patch };

    const next: AgentsTuningState = {
      locked: nextLocked,
      ...AGENTS_TUNING_BASELINE,
    };
    for (const dial of AGENTS_TUNING_DIALS) {
      next[dial] = clampAgentsDial(dial, dialSource[dial]);
    }

    if (sameAgentsTuning(next, current)) return;
    stateRef.current = next;
    setState(next);
    setStorageOk(writeStoredAgentsTuning(next));
    setSavedAt(Date.now());
  }, []);

  return {
    state,
    commit,
    source: hydrated.source,
    repaired: hydrated.repaired,
    savedAt,
    storageOk,
  };
}
