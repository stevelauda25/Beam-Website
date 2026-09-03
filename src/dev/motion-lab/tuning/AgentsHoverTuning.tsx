/**
 * Agents hover tuning — DEV ONLY.
 *
 * Wraps the REAL production AgentVisual and feeds it plain milliseconds from
 * DialKit. The dependency direction is one-way on purpose:
 *
 *   Motion Lab / DialKit / localStorage  ->  production AgentVisual
 *
 * AgentVisual imports nothing from src/dev, knows nothing about DialKit and
 * never touches storage; it only accepts an optional `hoverTuning` prop. With
 * the prop absent — which is how the homepage renders it — both hover halves
 * run the authored timeline at 1x.
 *
 * WHAT IS AND IS NOT TUNABLE HERE
 *
 * Three dials, each reaching exactly one thing: how long the hover REWIND takes,
 * how long it then HOLDS on the start pose, and how long the REPLAY takes. The
 * two durations are converted to a playback rate over the same 2300ms authored
 * keyframes (see resolveHoverTiming) and the hold is a controller pause at
 * currentTime 0, so no beat, offset, easing or piece of artwork can be changed
 * from this panel. The viewport intro is out of reach entirely — it always plays
 * the authored 2300ms forward story at 1x, tuned or not.
 *
 * Locking removes the dials from the panel rather than pretending: DialKit 1.4.3
 * has no `disabled` on any control, so a locked dial becomes a single-option
 * select showing its value, and the store discards any dial write that arrives
 * while locked.
 */
import { useEffect, useMemo } from 'react';
import { useDialKitController, type DialConfig } from 'dialkit';
import { AgentVisual } from '../../../components/visuals/agents/AgentVisual';
import {
  AGENTS_TUNING_BASELINE,
  AGENTS_TUNING_DIALS,
  AGENTS_TUNING_RANGES,
  AGENTS_TUNING_STORAGE_KEY,
  useAgentsHoverTuning,
  type AgentsTuningDial,
  type AgentsTuningState,
} from './agentsHoverTuningStore';
import styles from '../MotionLab.module.css';

/** One logical panel, so it reconnects to itself across Motion Lab entries. */
const PANEL_ID = 'agents-hover-tuning';
const RESET_ACTION = 'resetToProduction';
/** The authored forward timeline the master progress is mapped onto. */
const INTRO_MS = 2300;

/**
 * A locked dial: a select with exactly one option, so there is nothing else to
 * pick and no drag, keypress or shortcut can reach it. Swapping slider <-> select
 * on the same path is safe both ways — DialKit's reconciler rejects a preserved
 * value whose type does not match the control and falls back to the config
 * default, which is the stored value either way.
 */
const lockedRow = (ms: number) => ({
  type: 'select' as const,
  options: [`${ms}ms · locked`],
  default: `${ms}ms · locked`,
});

const slider = (dial: AgentsTuningDial, value: number) => {
  const { min, max, step } = AGENTS_TUNING_RANGES[dial];
  return [value, min, max, step] as [number, number, number, number];
};

/**
 * The panel config, derived from the stored state. Sliders open on the stored
 * values, which is what restores tuning after a remount. Reset does NOT go
 * through here — a live panel keeps its current values over changed defaults by
 * design — so it is applied with `setValues` instead.
 */
function buildConfig(state: AgentsTuningState): DialConfig {
  if (state.locked) {
    return {
      lockTuning: true,
      hoverMotion: {
        reverseDuration: lockedRow(state.reverseDuration),
        startHold: lockedRow(state.startHold),
        replayDuration: lockedRow(state.replayDuration),
      },
    };
  }
  return {
    lockTuning: false,
    hoverMotion: {
      reverseDuration: slider('reverseDuration', state.reverseDuration),
      startHold: slider('startHold', state.startHold),
      replayDuration: slider('replayDuration', state.replayDuration),
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

export function AgentsHoverTuning() {
  const { state, commit, source, repaired, savedAt, storageOk } =
    useAgentsHoverTuning();

  const config = useMemo(() => buildConfig(state), [state]);
  const { values, setValues } = useDialKitController(
    'Agents · hover motion',
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
          hoverMotion: {
            reverseDuration: AGENTS_TUNING_BASELINE.reverseDuration,
            startHold: AGENTS_TUNING_BASELINE.startHold,
            replayDuration: AGENTS_TUNING_BASELINE.replayDuration,
          },
        });
      },
    },
  );

  const raw = values as Record<string, unknown>;
  const liveLock =
    typeof raw.lockTuning === 'boolean' ? raw.lockTuning : state.locked;
  const liveReverse = readDial(raw.hoverMotion, 'reverseDuration');
  const liveHold = readDial(raw.hoverMotion, 'startHold');
  const liveReplay = readDial(raw.hoverMotion, 'replayDuration');

  /*
   * Mirror DialKit into the store, which persists it. Only real changes are
   * written (commit() compares first), so this settles after one pass instead of
   * looping. The dials are absent while locked, which is exactly when they must
   * NOT be written back — readDial returns null and the patch omits them.
   */
  useEffect(() => {
    const patch: Partial<AgentsTuningState> = { locked: liveLock };
    if (liveReverse !== null) patch.reverseDuration = liveReverse;
    if (liveHold !== null) patch.startHold = liveHold;
    if (liveReplay !== null) patch.replayDuration = liveReplay;
    commit(patch);
  }, [commit, liveLock, liveReverse, liveHold, liveReplay]);

  /*
   * Self-heal a locked dial. A locked dial holds a display STRING and the store
   * discards dial writes while locked, but DialKit's `updateValue` performs no
   * validation, so a stray programmatic write could leave a raw number on a
   * locked path — which its reconciler would then adopt as a valid slider value
   * the moment the lock came off.
   */
  useEffect(() => {
    if (!state.locked) return;
    const strays: Record<string, string> = {};
    if (liveReverse !== null) {
      strays.reverseDuration = lockedRow(state.reverseDuration).default;
    }
    if (liveHold !== null) {
      strays.startHold = lockedRow(state.startHold).default;
    }
    if (liveReplay !== null) {
      strays.replayDuration = lockedRow(state.replayDuration).default;
    }
    if (Object.keys(strays).length > 0) setValues({ hoverMotion: strays });
  }, [state, liveReverse, liveHold, liveReplay, setValues]);

  // Live while editing, stored while locked.
  const tuning = state.locked
    ? {
        reverseDurationMs: state.reverseDuration,
        startHoldMs: state.startHold,
        replayDurationMs: state.replayDuration,
      }
    : {
        reverseDurationMs: liveReverse ?? state.reverseDuration,
        startHoldMs: liveHold ?? state.startHold,
        replayDurationMs: liveReplay ?? state.replayDuration,
      };
  const total =
    tuning.reverseDurationMs + tuning.startHoldMs + tuning.replayDurationMs;
  const atBaseline = AGENTS_TUNING_DIALS.every(
    (dial) => state[dial] === AGENTS_TUNING_BASELINE[dial],
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
    storageNote = 'Production defaults — nothing saved yet.';
  }

  return (
    <>
      <AgentVisual hoverTuning={tuning} />

      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>agents hover motion</span>
        <span className={state.locked ? styles.statusOn : styles.statusOff}>
          {state.locked ? 'locked' : 'editable'}
        </span>
        <span className={styles.statusHint}>
          {storageNote}
          {state.locked
            ? ' Turn Lock Tuning off in the panel to edit or reset.'
            : atBaseline
              ? ' At the production defaults.'
              : ' Tuned away from production.'}
        </span>
      </div>

      <p className={styles.presetNote}>
        <strong>Hover</strong> — Reverse{' '}
        <span className={styles.mono}>{tuning.reverseDurationMs}ms</span> → Start
        Hold <span className={styles.mono}>{tuning.startHoldMs}ms</span> (paused
        on frame 1) → Replay{' '}
        <span className={styles.mono}>{tuning.replayDurationMs}ms</span> · one
        hover transaction <span className={styles.mono}>{total}ms</span>.
        <br />
        Both directions are scrubbed on ONE master progress (ease-in-out{' '}
        <span className={styles.mono}>.42, 0, .58, 1</span>) mapped to a single
        authored time written to all 21 animations, so the composition can only
        move as one. Reverse and Replay are DURATIONS over the one authored{' '}
        <span className={styles.mono}>{INTRO_MS}ms</span> timeline, and Start Hold
        is a controller pause at exact{' '}
        <span className={styles.mono}>currentTime 0</span> — no second timeline,
        no changed beat, no dead time added to the story. The viewport intro
        always plays that same story forward at 1× and is not tunable from here,
        and neither are the beats, easings, connector, travel distance or artwork.
        <br />
        <strong>Persistence</strong> — all three values plus the lock are stored
        under <span className={styles.mono}>{AGENTS_TUNING_STORAGE_KEY}</span>{' '}
        and reloaded on every mount, so tuning survives entry switches, remounts,
        refreshes and HMR until it is reset. Production is unaffected: the
        homepage renders{' '}
        <span className={styles.mono}>&lt;AgentVisual /&gt;</span> with no tuning
        prop and never reads storage.
      </p>
    </>
  );
}
