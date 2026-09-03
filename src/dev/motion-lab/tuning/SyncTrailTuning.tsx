/**
 * Sync trail tuning — DEV ONLY.
 *
 * Wraps the REAL production SyncVisual and feeds it plain numbers from DialKit.
 * The dependency direction is one-way on purpose:
 *
 *   Motion Lab / DialKit / localStorage  ->  production SyncVisual
 *
 * SyncVisual imports nothing from src/dev, knows nothing about DialKit and never
 * touches storage; it only accepts an optional `trailTuning` prop. With the prop
 * absent — which is how the homepage renders it — the approved profile is
 * reproduced exactly.
 *
 * BASELINE: every dial is a multiplier over the Founder-approved profile that
 * now lives in SyncVisual itself (32 particles, 248-unit span, head core 3.36,
 * head halo 0.22 at a 7.028-unit footprint, blur 1.35). All four baseline at
 * 1.00, so "Reset to production" reproduces the homepage exactly — 1.00 IS the
 * approved look, not the pre-tuning one it was derived from.
 *
 * Four dials, in two folders, matching what is actually being tuned:
 *
 *   Trail  — packet LENGTH and particle CORE size
 *   Glow   — halo INTENSITY (opacity of the blurred underlay) and halo RADIUS
 *            (its footprint and blur, together)
 *
 * Each dial reaches exactly one layer. Length adds particles at fixed spacing;
 * Dot Scale touches cores only; Glow Intensity and Glow Radius touch the halo
 * only, multiplying the same front-loaded falloff so the head stays the
 * brightest and the tail stays dark. Connector, velocity, direction and the
 * 1.8s transaction clock are all out of reach from here by construction.
 *
 * PERSISTENCE AND LOCK (see syncTrailTuningStore.ts)
 *
 * Values live in localStorage, so they survive switching entries, remounts,
 * refreshes and HMR. The store is the owner; DialKit is the editor. The one
 * exception is LOCKED, where the flow inverts: the dials are removed from the
 * panel entirely and the store alone feeds the visual.
 *
 * WHY LOCKING REMOVES THE DIALS
 *
 * DialKit 1.4.3 has no `disabled` on any control — `ControlMeta` carries type,
 * path, label, min/max/step, options and shortcut, and nothing else. Two
 * alternatives were rejected as fake: reverting a value after the fact lets the
 * slider move and snap back, and pinning min === max makes DialKit's own Slider
 * divide by `(max - min)` — zero — and render NaN. So a locked dial is not a
 * disabled slider: it is not a slider at all. It becomes a single-option select
 * showing its locked value, which DialKit cannot change because there is nothing
 * else to pick, and which no drag, keypress or bound shortcut can reach. The
 * store is then a second hard gate: while locked the visual reads from it, so
 * even a value that somehow changed in the panel could not reach the animation.
 */
import { useEffect, useMemo } from 'react';
import { useDialKitController, type DialConfig } from 'dialkit';
import {
  describeTrail,
  SyncVisual,
} from '../../../components/visuals/sync/SyncVisual';
import {
  SYNC_TUNING_BASELINE,
  SYNC_TUNING_DIALS,
  SYNC_TUNING_RANGES,
  SYNC_TUNING_STORAGE_KEY,
  useSyncTrailTuning,
  type SyncTuningDial,
  type SyncTuningState,
} from './syncTrailTuningStore';
import styles from '../MotionLab.module.css';

/** One logical panel, so it reconnects to itself across Motion Lab entries. */
const PANEL_ID = 'sync-trail-tuning';
const RESET_ACTION = 'resetToProduction';

const asMultiplier = (value: number) => `${value.toFixed(2)}×`;

/**
 * A locked dial: a select with exactly one option. DialKit renders the row and
 * the value, and there is no second option to switch to, so the value cannot
 * move. Swapping a slider for a select on the same path is safe in both
 * directions — DialKit's reconciler rejects a preserved value whose type does
 * not match the control (number into a select, string back into a slider) and
 * falls back to the config default, which is the stored value either way.
 */
const lockedRow = (value: number) => ({
  type: 'select' as const,
  options: [`${asMultiplier(value)} · locked`],
  default: `${asMultiplier(value)} · locked`,
});

const slider = (dial: SyncTuningDial, value: number) => {
  const { min, max, step } = SYNC_TUNING_RANGES[dial];
  return [value, min, max, step] as [number, number, number, number];
};

/**
 * The panel config, derived from the stored state.
 *
 * Sliders open on the stored values, which is what restores tuning after a
 * remount: DialKit seeds a freshly registered panel from the config defaults.
 * Reset does NOT go through here — a live panel keeps its current values over
 * changed defaults by design — so it is applied with `setValues` instead.
 */
function buildConfig(state: SyncTuningState): DialConfig {
  if (state.locked) {
    return {
      lockTuning: true,
      trail: {
        trailLength: lockedRow(state.trailLength),
        dotScale: lockedRow(state.dotScale),
      },
      glow: {
        glowIntensity: lockedRow(state.glowIntensity),
        glowRadius: lockedRow(state.glowRadius),
      },
    };
  }
  return {
    lockTuning: false,
    trail: {
      trailLength: slider('trailLength', state.trailLength),
      dotScale: slider('dotScale', state.dotScale),
    },
    glow: {
      glowIntensity: slider('glowIntensity', state.glowIntensity),
      glowRadius: slider('glowRadius', state.glowRadius),
    },
    // Present only while unlocked, so Reset is genuinely unavailable when
    // locked rather than a button that silently declines.
    [RESET_ACTION]: { type: 'action', label: 'Reset to production' },
  };
}

/** Reads one numeric dial out of DialKit's resolved values, if it is a slider. */
function readDial(group: unknown, key: string): number | null {
  if (!group || typeof group !== 'object') return null;
  const value = (group as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : null;
}

export function SyncTrailTuning() {
  const { state, commit, source, repaired, savedAt, storageOk } =
    useSyncTrailTuning();

  const config = useMemo(() => buildConfig(state), [state]);
  const { values, setValues } = useDialKitController(
    'Sync · dotted trail',
    config,
    {
      id: PANEL_ID,
      onAction: (action) => {
        if (action !== RESET_ACTION) return;
        // Belt and braces: the action row does not exist while locked.
        if (state.locked) return;
        // Through DialKit, not the store — the live panel owns its values, and
        // the mirror effect below persists the result.
        setValues({
          trail: {
            trailLength: SYNC_TUNING_BASELINE.trailLength,
            dotScale: SYNC_TUNING_BASELINE.dotScale,
          },
          glow: {
            glowIntensity: SYNC_TUNING_BASELINE.glowIntensity,
            glowRadius: SYNC_TUNING_BASELINE.glowRadius,
          },
        });
      },
    },
  );

  const raw = values as Record<string, unknown>;
  const liveLock =
    typeof raw.lockTuning === 'boolean' ? raw.lockTuning : state.locked;
  const liveLength = readDial(raw.trail, 'trailLength');
  const liveScale = readDial(raw.trail, 'dotScale');
  const liveIntensity = readDial(raw.glow, 'glowIntensity');
  const liveRadius = readDial(raw.glow, 'glowRadius');

  /*
   * Mirror DialKit into the store, which persists it. Only real changes are
   * written (commit() compares first), so this settles after one pass instead of
   * looping. The dials are absent while locked, which is exactly when they must
   * NOT be written back — readDial returns null and the patch omits them, so the
   * locked values stand.
   */
  useEffect(() => {
    const patch: Partial<SyncTuningState> = { locked: liveLock };
    if (liveLength !== null) patch.trailLength = liveLength;
    if (liveScale !== null) patch.dotScale = liveScale;
    if (liveIntensity !== null) patch.glowIntensity = liveIntensity;
    if (liveRadius !== null) patch.glowRadius = liveRadius;
    commit(patch);
  }, [commit, liveLock, liveLength, liveScale, liveIntensity, liveRadius]);

  /*
   * Self-heal a locked dial.
   *
   * A locked dial holds a display STRING, and the store discards any dial value
   * that arrives while locked — but DialKit's `updateValue` performs no
   * validation, so a stray programmatic write can still leave a raw number
   * sitting on a locked path. Left there it would show as a broken row and, worse,
   * would be adopted as a valid slider value the moment the lock came off
   * (DialKit's reconciler keeps a live numeric value over the config default).
   * Putting the locked string back makes the lock hold across the unlock too.
   */
  useEffect(() => {
    if (!state.locked) return;
    const strays: Record<string, Record<string, string>> = {};
    if (liveLength !== null) {
      strays.trail = { ...strays.trail, trailLength: lockedRow(state.trailLength).default };
    }
    if (liveScale !== null) {
      strays.trail = { ...strays.trail, dotScale: lockedRow(state.dotScale).default };
    }
    if (liveIntensity !== null) {
      strays.glow = { ...strays.glow, glowIntensity: lockedRow(state.glowIntensity).default };
    }
    if (liveRadius !== null) {
      strays.glow = { ...strays.glow, glowRadius: lockedRow(state.glowRadius).default };
    }
    if (Object.keys(strays).length > 0) setValues(strays);
  }, [state, liveLength, liveScale, liveIntensity, liveRadius, setValues]);

  /*
   * What the visual actually renders. Live values while editing, so dragging is
   * immediate; the STORE while locked, so nothing in the panel can move it.
   */
  const tuning = state.locked
    ? {
        length: state.trailLength,
        scale: state.dotScale,
        glowIntensity: state.glowIntensity,
        glowRadius: state.glowRadius,
      }
    : {
        length: liveLength ?? state.trailLength,
        scale: liveScale ?? state.dotScale,
        glowIntensity: liveIntensity ?? state.glowIntensity,
        glowRadius: liveRadius ?? state.glowRadius,
      };
  const shape = describeTrail(tuning);
  // Path length is fixed by the authored connector geometry.
  const spanPct = ((shape.spanUnits / 412.3) * 100).toFixed(1);
  const atBaseline = SYNC_TUNING_DIALS.every(
    (dial) => state[dial] === SYNC_TUNING_BASELINE[dial],
  );

  let storageNote: string;
  if (!storageOk) {
    storageNote =
      'localStorage is unavailable, so tuning will NOT survive a refresh.';
  } else if (repaired) {
    storageNote =
      'Stored values were malformed or out of range and were corrected to the nearest legal value.';
  } else if (savedAt) {
    storageNote = 'Saved';
  } else if (source === 'stored') {
    storageNote = 'Restored from this browser.';
  } else {
    storageNote = 'Production baseline — nothing saved yet.';
  }

  return (
    <>
      <SyncVisual trailTuning={tuning} />

      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>sync trail tuning</span>
        <span className={state.locked ? styles.statusOn : styles.statusOff}>
          {state.locked ? 'locked' : 'editable'}
        </span>
        <span className={styles.statusHint}>
          {storageNote}
          {state.locked
            ? ' Turn Lock Tuning off in the panel to edit or reset.'
            : atBaseline
              ? ' At the production baseline.'
              : ' Tuned away from production.'}
        </span>
      </div>

      <p className={styles.presetNote}>
        <strong>Trail</strong> — Length{' '}
        <span className={styles.mono}>{tuning.length.toFixed(2)}×</span> → {shape.count} dots,{' '}
        {shape.spanUnits} path units ({spanPct}% of the connector) · Dot Scale{' '}
        <span className={styles.mono}>{tuning.scale.toFixed(2)}×</span> → head{' '}
        {shape.headSize.toFixed(2)} units. Spacing stays{' '}
        <span className={styles.mono}>8</span>.
        <br />
        <strong>Glow</strong> — Intensity{' '}
        <span className={styles.mono}>{tuning.glowIntensity.toFixed(2)}×</span> → head halo
        opacity {shape.headHalo.toFixed(2)}
        {shape.haloCount > 0 ? `, ${shape.haloCount} haloed particles` : ', halo off (cores only)'}{' '}
        · Radius <span className={styles.mono}>{tuning.glowRadius.toFixed(2)}×</span> → head halo{' '}
        {shape.headHaloSize.toFixed(2)} units, blur {shape.haloBlur.toFixed(2)}. Cores, connector,
        velocity and timing are untouched by either.
        <br />
        <strong>Persistence</strong> — all four dials plus the lock are stored under{' '}
        <span className={styles.mono}>{SYNC_TUNING_STORAGE_KEY}</span> and reloaded on every
        mount, so tuning survives entry switches, remounts, refreshes and HMR until it is reset.
        Production is unaffected: the homepage renders <span className={styles.mono}>
          &lt;SyncVisual /&gt;
        </span>{' '}
        with no tuning prop and never reads storage.
      </p>
    </>
  );
}
