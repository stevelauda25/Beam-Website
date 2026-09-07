/**
 * Hero — Real Condition. DEV ONLY.
 *
 * The reveal running in the hero's real container, with review controls.
 *
 * The container is the production one: HeroRevealSequence imports
 * HeroVisual.module.css, and the wrapper below carries the same width classes
 * the Hero section gives its key visual, mirrored from Hero.tsx (`mx-auto
 * w-full max-w-[1440px] min-[744px]:w-[680px] lg:w-[min(...)]`) rather than
 * invented. So the panel here sits exactly where it sits on the homepage.
 *
 * What this does NOT reproduce: the headline and CTA block above the visual.
 * Those are untouched production markup and copying them here would be a fork.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDialKitController, type DialConfig } from 'dialkit';
import { HeroRevealSequence } from '../../../components/visuals/hero/reveal/HeroRevealSequence';
import {
  HERO_REVEAL_DEFAULTS,
  heroSpans,
  type HeroRevealTuning,
} from '../../../components/visuals/hero/reveal/heroRevealTimeline';
import {
  HERO_TUNING_RANGES,
  HERO_TUNING_SELECTS,
  heroBreakpointKeys,
  heroResponsiveRange,
  useHeroRevealTuning,
  type HeroTuningSnapshot,
} from '../tuning/heroRevealTuningStore';
import {
  HERO_RESPONSIVE_DEFAULTS,
  heroBreakpoint,
  heroComposition,
  type HeroBreakpoint,
  type HeroResponsiveTuning,
} from '../../../components/visuals/hero/reveal/heroRevealComposition';
import {
  heroRevealMarkers,
  HERO_FRAME_MS,
  HERO_REVEAL_FPS,
} from '../../../components/visuals/hero/reveal/heroRevealTimeline';
import { useHeroRevealPlayer } from '../../../components/visuals/hero/reveal/useHeroRevealPlayer';
import labStyles from '../MotionLab.module.css';
import styles from './HeroSceneReview.module.css';

/** Phase rows for the readout — same spans the timeline runs on. */
/** Phase rows for the readout, derived from whatever tuning is live. */
function phasesFor(k: HeroRevealTuning) {
  const S = heroSpans(k);
  return [
    { label: 'Files approach', span: S.approach },
    { label: 'Arrival hold (settle)', span: S.arrivalHold },
    { label: 'Target arms', span: S.arm },
    { label: 'Files release', span: S.release },
    { label: 'Hand opens', span: S.handOpen },
    { label: 'Panel press', span: S.panelPress },
    { label: 'Black confirmation fades in', span: S.confirmIn },
    { label: 'Black confirmation holds', span: S.confirmHold },
    { label: 'Black returns to default', span: S.confirmOut },
    { label: 'Pointer exits', span: S.pointerExit },
    { label: 'Instruction copy resolves', span: S.copyOut },
    { label: 'Dashed target resolves', span: S.dashedOut },
    { label: 'Upload panel in', span: S.uploadIn },
    { label: 'Upload 0 → 100%', span: S.upload },
    { label: 'Hold at 100%', span: S.hold },
    { label: 'Upload panel dismisses (fade + blur)', span: S.dismiss },
    { label: 'Workspace reveals', span: S.reveal },
  ];
}

const MARKERS = heroRevealMarkers();

/** One logical panel, so it reconnects to itself across Motion Lab entries. */
const PANEL_ID = 'hero-reveal-tuning';
const RESET_ACTION = 'resetToCurrent';

/** Arrow keys step this many frames of the animation's own 60fps clock. */
const FRAME_STEP = 5;
/** Ctrl + arrow steps a single frame, for landing on an exact one. */
const FINE_FRAME_STEP = 1;

/** A slider row: [value, min, max, step] — DialKit's tuple form. */
const dial = (key: string, value: number) => {
  const { min, max, step } = HERO_TUNING_RANGES[key];
  return [value, min, max, step] as [number, number, number, number];
};

/** Same, for a responsive dial — mobile's composition rows have own ranges. */
const rdial = (key: string, value: number) => {
  const { min, max, step } = heroResponsiveRange(key);
  return [value, min, max, step] as [number, number, number, number];
};

/**
 * DialKit folder name per breakpoint.
 *
 * Only the values that genuinely change with the frame live here. Every span,
 * easing, opacity and progress curve stays in the folders above, shared by all
 * three bands — there is ONE timeline, and these dials only say where the hand
 * and the stack enter and leave it, plus how mobile frames the canvas.
 */
const RESPONSIVE_FOLDERS: Record<string, HeroBreakpoint> = {
  responsiveDesktop: 'desktop',
  responsiveTablet: 'tablet',
  responsiveMobile: 'mobile',
};

function responsiveFolder(
  responsive: HeroResponsiveTuning,
  breakpoint: HeroBreakpoint,
): Record<string, [number, number, number, number]> {
  const values = responsive[breakpoint] as unknown as Record<string, number>;
  return Object.fromEntries(
    heroBreakpointKeys(breakpoint).map((key) => [key, rdial(key, values[key])]),
  );
}

/**
 * A LOCKED row: a select with exactly one option.
 *
 * DialKit 1.4.3 has no `disabled` on any control. Reverting a value after the
 * fact lets the slider move and snap back, and pinning min === max makes its
 * Slider divide by (max - min) — zero — and render NaN. So a locked dial is not
 * a greyed-out slider: it is not a slider at all. It shows its value and there
 * is no second option to pick, so no drag, keypress or shortcut can move it.
 */
const lockedRow = (value: number | string) => ({
  type: 'select' as const,
  options: [`${value} · locked`],
  default: `${value} · locked`,
});

/**
 * Four folders matching the four things actually being tuned. Every default is
 * the current sequence, so a freshly opened panel reproduces what ships and
 * "Reset to current" returns to it.
 *
 * When locked, every row becomes a single-option select and the Reset action is
 * removed entirely, so it is genuinely unavailable rather than a button that
 * silently declines.
 */
function buildConfig(
  k: HeroRevealTuning,
  responsive: HeroResponsiveTuning,
  locked: boolean,
): DialConfig {
  if (locked) {
    const record = k as unknown as Record<string, number | string>;
    const folderOf = (keys: readonly string[]) =>
      Object.fromEntries(keys.map((key) => [key, lockedRow(record[key])]));
    const lockedBand = (breakpoint: HeroBreakpoint) => {
      const values = responsive[breakpoint] as unknown as Record<string, number>;
      return Object.fromEntries(
        heroBreakpointKeys(breakpoint).map((key) => [key, lockedRow(values[key])]),
      );
    };
    return {
      lockSettings: true,
      handAndStack: folderOf(FOLDER_KEYS.handAndStack),
      dropResponse: folderOf(FOLDER_KEYS.dropResponse),
      uploadState: folderOf(FOLDER_KEYS.uploadState),
      workspaceHandoff: folderOf(FOLDER_KEYS.workspaceHandoff),
      responsiveDesktop: lockedBand('desktop'),
      responsiveTablet: lockedBand('tablet'),
      responsiveMobile: lockedBand('mobile'),
    };
  }
  return {
    lockSettings: false,
    handAndStack: {
      /*
       * Entry, target and exit positions are NOT here: they are resolved per
       * breakpoint (see the three responsive folders), so a copy in this folder
       * would be a control that silently does nothing. That now covers the
       * whole positioning set — entry, target, hand-to-stack offset and release
       * offset all live in the three RESPONSIVE folders below, because each of
       * them can legitimately differ per breakpoint. What stays here is what is
       * genuinely shared: opacities, spans and easings.
       */
      handOpacity: dial('handOpacity', k.handOpacity),
      stackOpacity: dial('stackOpacity', k.stackOpacity),
      releaseBlur: dial('releaseBlur', k.releaseBlur),
      approachStart: dial('approachStart', k.approachStart),
      approachDuration: dial('approachDuration', k.approachDuration),
      approachEase: {
        type: 'select',
        options: [...HERO_TUNING_SELECTS.approachEase],
        default: k.approachEase,
      },
      arrivalHoldDuration: dial('arrivalHoldDuration', k.arrivalHoldDuration),
      releaseDelay: dial('releaseDelay', k.releaseDelay),
      settleOffsetY: dial('settleOffsetY', k.settleOffsetY),
      handOpenDuration: dial('handOpenDuration', k.handOpenDuration),
      releaseDuration: dial('releaseDuration', k.releaseDuration),
      pointerExitDelay: dial('pointerExitDelay', k.pointerExitDelay),
      pointerExitDuration: dial('pointerExitDuration', k.pointerExitDuration),
      pointerExitOpacity: dial('pointerExitOpacity', k.pointerExitOpacity),
      pointerExitEase: {
        type: 'select',
        options: [...HERO_TUNING_SELECTS.pointerExitEase],
        default: k.pointerExitEase,
      },
    },
    dropResponse: {
      armTrigger: {
        type: 'select',
        options: [...HERO_TUNING_SELECTS.armTrigger],
        default: k.armTrigger,
      },
      armStart: dial('armStart', k.armStart),
      armDuration: dial('armDuration', k.armDuration),
      armedIntensity: dial('armedIntensity', k.armedIntensity),
      pressAmount: dial('pressAmount', k.pressAmount),
      pressStart: dial('pressStart', k.pressStart),
      pressDuration: dial('pressDuration', k.pressDuration),
      confirmOpacity: dial('confirmOpacity', k.confirmOpacity),
      confirmInStart: dial('confirmInStart', k.confirmInStart),
      confirmInDuration: dial('confirmInDuration', k.confirmInDuration),
      confirmHoldDuration: dial('confirmHoldDuration', k.confirmHoldDuration),
      confirmOutDuration: dial('confirmOutDuration', k.confirmOutDuration),
      dashedFadeStart: dial('dashedFadeStart', k.dashedFadeStart),
      dashedFadeDuration: dial('dashedFadeDuration', k.dashedFadeDuration),
      copyFadeStart: dial('copyFadeStart', k.copyFadeStart),
      copyFadeDuration: dial('copyFadeDuration', k.copyFadeDuration),
    },
    uploadState: {
      uploadInStart: dial('uploadInStart', k.uploadInStart),
      uploadInDuration: dial('uploadInDuration', k.uploadInDuration),
      uploadY: dial('uploadY', k.uploadY),
      uploadOpacity: dial('uploadOpacity', k.uploadOpacity),
      uploadStart: dial('uploadStart', k.uploadStart),
      uploadDuration: dial('uploadDuration', k.uploadDuration),
      progressCurve: {
        type: 'select',
        options: [...HERO_TUNING_SELECTS.progressCurve],
        default: k.progressCurve,
      },
      textureOpacity: dial('textureOpacity', k.textureOpacity),
      textureBandStrength: dial('textureBandStrength', k.textureBandStrength),
      completeMixDuration: dial('completeMixDuration', k.completeMixDuration),
      completeBlur: dial('completeBlur', k.completeBlur),
    },
    workspaceHandoff: {
      resolveDelay: dial('resolveDelay', k.resolveDelay),
      resolveDuration: dial('resolveDuration', k.resolveDuration),
      workspaceOpacity: dial('workspaceOpacity', k.workspaceOpacity),
      dismissDuration: dial('dismissDuration', k.dismissDuration),
      dismissBlur: dial('dismissBlur', k.dismissBlur),
      revealDelay: dial('revealDelay', k.revealDelay),
    },
    responsiveDesktop: responsiveFolder(responsive, 'desktop'),
    responsiveTablet: responsiveFolder(responsive, 'tablet'),
    responsiveMobile: responsiveFolder(responsive, 'mobile'),
    [RESET_ACTION]: { type: 'action', label: 'Reset to current sequence' },
  };
}

/** Which tuning keys live in which folder — one source for config and reset. */
const FOLDER_KEYS = {
  handAndStack: [
    'handOpacity', 'stackOpacity', 'releaseBlur', 'approachStart', 'approachDuration', 'approachEase',
    'arrivalHoldDuration', 'releaseDelay', 'settleOffsetY',
    'handOpenDuration', 'releaseDuration',
    'pointerExitDelay', 'pointerExitDuration',
    'pointerExitOpacity', 'pointerExitEase',
  ],
  dropResponse: [
    'armTrigger', 'armStart', 'armDuration', 'armedIntensity', 'pressAmount', 'pressStart',
    'pressDuration', 'confirmOpacity', 'confirmInStart', 'confirmInDuration',
    'confirmHoldDuration', 'confirmOutDuration', 'dashedFadeStart',
    'dashedFadeDuration', 'copyFadeStart', 'copyFadeDuration',
  ],
  uploadState: [
    'uploadInStart', 'uploadInDuration', 'uploadY', 'uploadOpacity', 'uploadStart',
    'uploadDuration', 'progressCurve', 'textureOpacity', 'textureBandStrength',
    'completeMixDuration', 'completeBlur',
  ],
  workspaceHandoff: [
    'resolveDelay', 'resolveDuration', 'workspaceOpacity',
    'dismissDuration', 'dismissBlur', 'revealDelay',
  ],
} as const;

/**
 * True when the event came from somewhere the user is typing or adjusting a
 * value, so the shortcut must stay out of the way. Buttons are included on
 * purpose: Space already activates a focused button natively, and handling it
 * here as well would toggle playback twice.
 */
function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON|OPTION)$/.test(target.tagName)) return true;
  if (target.closest('input, textarea, select, button, [contenteditable="true"]')) return true;
  // Any DialKit control, whatever element it happens to render as.
  if (target.closest('[class*="dial" i], [role="slider"], [role="combobox"], [role="spinbutton"]')) {
    return true;
  }
  return false;
}

/**
 * The key-visual container width the Hero gives its visual at a viewport width.
 *
 * This is a JS mirror of Hero.tsx's own classes:
 *   mx-auto w-full max-w-[1440px]
 *   min-[744px]:w-[680px]
 *   lg:w-[min(calc((100vw-264px)*1.2365),1454px)]
 *
 * It exists because those are CSS MEDIA QUERIES: they resolve against the real
 * browser window, so a "Tablet 834" preview kept the desktop 1454px container
 * and drew the panel at 1.16x instead of 0.58x. The framing was right and the
 * render was wrong, which is exactly the mismatch that made Motion Lab disagree
 * with the real site.
 *
 * Nothing else is simulated — the resolver, the store, breakpoint detection,
 * the framing offsets and the DialKit values are the shared ones. Only this
 * number is computed instead of being read from a media query, and it computes
 * to what the real site measures at the same width (834/768 -> 680,
 * 430/390/375 -> the viewport, 1440 -> 1454).
 */
function heroLogicalContainerWidth(viewportWidth: number) {
  if (viewportWidth >= 1024) return Math.min((viewportWidth - 264) * 1.2365, 1454);
  if (viewportWidth >= 744) return 680;
  return viewportWidth;
}

/** Pull one folder's values out of DialKit's resolved object. */
function folder(values: Record<string, unknown>, name: string) {
  const group = values[name];
  return group && typeof group === 'object' ? (group as Record<string, unknown>) : {};
}

export function HeroRealCondition({
  /** Motion Lab's logical viewport preset — see `viewport` below. */
  viewportWidth,
}: {
  viewportWidth?: number;
}) {
  const {
    state,
    responsive,
    snapshot,
    externalUpdate,
    commit,
    commitResponsive,
    reset,
    locked,
    setLocked,
    undo,
    redo,
  } = useHeroRevealTuning();
  const config = useMemo(
    () => buildConfig(state, responsive, locked),
    [state, responsive, locked],
  );

  /*
   * The live viewport, for the composition readout below. The sequence measures
   * its own container; this is only so the reviewer can see which band is
   * active and what rectangle is framed without opening devtools.
   */
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  /*
   * The lab's viewport preset is the logical width being previewed, and it has
   * to drive the RESPONSIVE BAND as well as the stage size. Without this,
   * "Tablet 834" shrank the preview while the reveal carried on resolving
   * DESKTOP from the real browser window — which is exactly what made every
   * tablet and mobile dial look inert.
   */
  const viewport = viewportWidth ?? windowWidth;
  const holderRef = useRef<HTMLDivElement>(null);
  const [holderWidth, setHolderWidth] = useState(0);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    const node = holderRef.current;
    if (!node) return;
    const read = () => setHolderWidth(node.getBoundingClientRect().width);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { values, setValues } = useDialKitController('Hero · reveal', config, {
    id: PANEL_ID,
    onAction: (action) => {
      if (action !== RESET_ACTION) return;
      if (locked) return;
      reset();
      // Through DialKit too: a live panel keeps its values over changed defaults.
      pushToPanelRef.current?.({
        base: HERO_REVEAL_DEFAULTS,
        responsive: HERO_RESPONSIVE_DEFAULTS,
      });
    },
  });

  /*
   * Mirror DialKit into the store, which persists it. Only real changes are
   * written (commit compares first), so this settles after one pass rather than
   * looping.
   */
  const raw = values as Record<string, unknown>;

  /*
   * BOOT HANDSHAKE — storage wins over whatever DialKit reconnected with.
   *
   * DialKit reconnects to its panel by `id`, so on a remount it can come back
   * holding values from earlier in the session. The mirroring effects below run
   * on that first render and would write those straight back over a newer
   * stored payload — which is exactly how the lab clobbered a tuning change
   * made in another tab.
   *
   * So: on mount, push the STORE into the panel and record what was pushed.
   * The mirrors stay shut until DialKit's live values actually match it, after
   * which they resume normally. Declared before the mirrors so it runs first.
   */
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  /*
   * Declared up here because the boot effect below needs it; the assignment
   * happens further down, during render, so it is always set by the time any
   * effect runs.
   */
  const pushToPanelRef = useRef<((next: HeroTuningSnapshot) => void) | null>(null);
  const booted = useRef(false);

  /*
   * One skip per mirror, per push.
   *
   * A push calls `setValues`, which re-renders with the pushed values, so the
   * mirror's NEXT pass already sees them. Skipping exactly one pass is
   * therefore enough to stop the pre-push values being written back — and,
   * unlike waiting for the panel to compare equal, it cannot wedge shut if
   * DialKit ever hands a value back in a different shape than it took.
   * A ref per mirror, so one clearing the flag cannot un-gate the other.
   */
  const skipBaseMirror = useRef(false);
  const skipResponsiveMirror = useRef(false);
  const armSkip = () => {
    skipBaseMirror.current = true;
    skipResponsiveMirror.current = true;
  };
  const passes = (gate: { current: boolean }) => {
    if (!gate.current) return true;
    gate.current = false;
    return false;
  };

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    armSkip();
    pushToPanelRef.current?.(snapshotRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** DialKit owns the live lock switch; mirror it into the store. */
  const liveLock = typeof raw.lockSettings === 'boolean' ? raw.lockSettings : locked;
  useEffect(() => {
    if (liveLock !== locked) setLocked(liveLock);
  }, [liveLock, locked, setLocked]);

  /*
   * Mirror DialKit into the store, which persists it. Only real changes are
   * written (commit compares first), so this settles after one pass.
   *
   * While locked every row is a single-option SELECT whose value is a decorated
   * string ("240 · locked"), never a number — so the numeric guard below is what
   * stops a locked panel from writing its own labels back over the tuning.
   */
  useEffect(() => {
    if (locked || !passes(skipBaseMirror)) return;
    const patch: Record<string, unknown> = {};
    for (const [name, keys] of Object.entries(FOLDER_KEYS)) {
      const group = folder(raw, name);
      for (const key of keys) {
        const value = group[key];
        const isSelect = key in HERO_TUNING_SELECTS;
        if (typeof value === 'number' && !isSelect) patch[key] = value;
        if (typeof value === 'string' && isSelect) patch[key] = value;
      }
    }
    commit(patch as Partial<HeroRevealTuning>);
  }, [raw, commit, locked]);

  /* Same mirroring for the three responsive bands, one commit per band. */
  useEffect(() => {
    if (locked || !passes(skipResponsiveMirror)) return;
    for (const [name, breakpoint] of Object.entries(RESPONSIVE_FOLDERS)) {
      const group = folder(raw, name);
      const patch: Record<string, number> = {};
      for (const key of heroBreakpointKeys(breakpoint)) {
        const value = group[key];
        if (typeof value === 'number') patch[key] = value;
      }
      if (Object.keys(patch).length) commitResponsive(breakpoint, patch);
    }
  }, [raw, commitResponsive, locked]);

  /** Push a whole snapshot back into the live panel (undo/redo and reset). */
  const pushToPanel = useCallback(
    (next: HeroTuningSnapshot) => {
      const record = next.base as unknown as Record<string, number | string>;
      const payload: Record<string, Record<string, number | string>> = {};
      for (const [name, keys] of Object.entries(FOLDER_KEYS)) {
        payload[name] = Object.fromEntries(keys.map((key) => [key, record[key]]));
      }
      for (const [name, breakpoint] of Object.entries(RESPONSIVE_FOLDERS)) {
        const band = next.responsive[breakpoint] as unknown as Record<string, number>;
        payload[name] = Object.fromEntries(
          heroBreakpointKeys(breakpoint).map((key) => [key, band[key]]),
        );
      }
      setValues(payload as never);
    },
    [setValues],
  );

  /*
   * onAction is captured when the panel registers, so it cannot close over a
   * later pushToPanel. A ref keeps the action pointing at the current one.
   */
  pushToPanelRef.current = pushToPanel;

  /*
   * RECONCILE DIALKIT TO THE STORE, ONCE, ON MOUNT.
   *
   * DialKit reconnects to its panel by `id`, so it can come back holding values
   * from earlier in the session. Those are not authoritative — storage is — and
   * the mirroring effect above would otherwise write them straight back over a
   * newer stored payload. Pushing the store into the panel on mount makes the
   * direction of truth explicit: storage wins, always.
   */
  /*
   * A change adopted from another tab has to reach DialKit too, and it takes
   * the same handshake: arm the gate, push, and keep the mirrors shut until the
   * panel is showing the adopted values — otherwise the next mirror pass would
   * write the pre-adoption values straight back out.
   */
  useEffect(() => {
    if (!externalUpdate || locked) return;
    armSkip();
    pushToPanel(externalUpdate);
  }, [externalUpdate, pushToPanel, locked]);

  const player = useHeroRevealPlayer(true, state);

  /*
   * Space toggles playback. `toggle` resumes from the current position — the
   * player only rewinds when it is already parked at the end — so the shortcut
   * and the Play/Pause button drive exactly the same state and stay in sync by
   * construction rather than by mirroring.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      /*
       * Undo / redo first: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z restore a whole
       * tuning state, pushed back into DialKit so the panel, the store and the
       * preview cannot disagree. Locked means locked — the shortcut is inert
       * rather than silently reverting values behind a locked panel.
       */
      const undoCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z';
      if (undoCombo) {
        if (isEditableTarget(event.target)) return; // leave native text undo alone
        event.preventDefault();
        if (locked) return;
        const restored = event.shiftKey ? redo() : undo();
        if (restored) pushToPanel(restored);
        return;
      }

      const isSpace = event.code === 'Space' || event.key === ' ';
      const isRight = event.key === 'ArrowRight';
      const isLeft = event.key === 'ArrowLeft';
      if (!isSpace && !isRight && !isLeft) return;
      // Meta/Alt stay free for browser and OS shortcuts. Ctrl is claimed by the
      // arrows only, where it means "one frame" rather than five.
      if (event.metaKey || event.altKey) return;
      if (isSpace && event.ctrlKey) return;
      if (isEditableTarget(event.target)) return;
      // Space scrolls and the arrows scroll horizontally; the lab is a document.
      event.preventDefault();
      if (isSpace) {
        player.toggle();
        return;
      }
      /*
       * `seek` pauses first and clamps to [0, duration], so stepping from a
       * playing timeline stops it at the current position and moves from there
       * rather than from wherever the clock happens to land next.
       */
      const frames = event.ctrlKey ? FINE_FRAME_STEP : FRAME_STEP;
      const delta = (isRight ? 1 : -1) * frames * HERO_FRAME_MS;
      player.seek(player.time + delta);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [player, locked, undo, redo, pushToPanel]);
  const band = heroBreakpoint(viewport);
  const comp = heroComposition(viewport, responsive);
  const compScale = holderWidth > 0 ? holderWidth / comp.width : 1;
  const PHASES = useMemo(() => phasesFor(state), [state]);
  const active = PHASES.filter((p) => player.time >= p.span[0] && player.time <= p.span[1]);

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <button type="button" className={labStyles.chip} onClick={player.replay}>
          Replay
        </button>
        <button
          type="button"
          className={labStyles.chip}
          onClick={player.toggle}
          disabled={player.reducedMotion}
          title="Space"
        >
          {player.playing ? 'Pause' : 'Play'}
          <span className={styles.tick}>space</span>
        </button>
        <button type="button" className={labStyles.chip} onClick={player.restart}>
          Restart
        </button>
        <span className={styles.spacer} />
        <span className={labStyles.mono}>
          {Math.round(player.time)} / {player.duration} ms · frame{' '}
          {Math.round(player.time / HERO_FRAME_MS)} @ {HERO_REVEAL_FPS}fps
        </span>
        <span className={styles.barLabel}>
          space · ←/→ 5f · ctrl+←/→ 1f · {'\u2318'}Z undo
        </span>
        <span className={locked ? styles.lockOn : styles.lockOff}>
          {locked ? 'settings locked' : 'settings unlocked'}
        </span>
      </div>

      <div className={styles.bar}>
        {/* Space toggles playback; arrows step 5 frames, Ctrl+arrows step 1. */}
        <input
          type="range"
          min={0}
          max={player.duration}
          step={1}
          value={Math.round(player.time)}
          onChange={(event) => player.seek(Number(event.target.value))}
          className={styles.scrub}
          aria-label="Scrub the hero reveal"
        />
      </div>

      <div className={styles.bar}>
        <span className={styles.barLabel}>Jump to</span>
        {MARKERS.map((marker) => (
          <button
            key={marker.id}
            type="button"
            className={labStyles.chip}
            onClick={() => player.seek(marker.time)}
          >
            {marker.label}
          </button>
        ))}
      </div>

      {/* Mirrors Hero.tsx's key-visual wrapper. */}
      {/*
        * Same wrapper the Hero section gives its key visual. When a logical
        * viewport is being previewed the width is set explicitly, because the
        * class-based rules would otherwise answer for the real browser window.
        */}
      <div
        /*
         * Stands in for production's <main class="overflow-x-clip">: the
         * stage is the logical viewport, so clipping at its width is what the
         * real site does at the browser edge. Desktop is left exactly as it
         * was — its 1454px column already sat unclipped in the lab.
         */
        style={
          viewportWidth !== undefined && viewportWidth < 1200
            ? { width: '100%', overflowX: 'clip' }
            : undefined
        }
      >
      <div
        ref={holderRef}
        className="mx-auto w-full max-w-[1440px] min-[744px]:w-[680px] lg:w-[min(calc((100vw-264px)*1.2365),1454px)] lg:max-w-none"
        style={
          viewportWidth === undefined
            ? undefined
            : { width: heroLogicalContainerWidth(viewportWidth), maxWidth: 'none' }
        }
      >
        {/*
          * No column clip here. Production's HeroKeyVisual wraps the SHIPPING
          * hero in `overflow-hidden`; the reveal preview does not, so a band
          * drawn larger than its column spills into the margins and is cut at
          * the viewport by <main class="overflow-x-clip"> — mirrored below by
          * the clipping holder, which is the logical viewport in the lab.
          */}
        <div className="flex w-full justify-center">
          <HeroRevealSequence
            time={player.time}
            tuning={state}
            responsive={responsive}
            viewportWidth={viewport}
          />
        </div>
      </div>
      </div>

      <div className={styles.readout}>
        {player.reducedMotion && (
          <div className={styles.continuity} data-ok>
            <strong>Reduced motion is on.</strong> The sequence steps through representative
            frames with hard cuts instead of tweening — no movement is interpolated — and rests on
            the settled, interactive workspace. Section 6 requires &ldquo;gentler, not zero&rdquo;
            and, for explanatory visuals, jumping between states so every state is still received.
            Replay re-runs the stepped variant; continuous playback is disabled by design.
          </div>
        )}
        <div className={styles.continuity} data-ok>
          <strong>Composition:</strong>{' '}
          <span className={labStyles.mono}>
            {band} · viewport {viewport}px · container {holderWidth.toFixed(0)}px · scale{' '}
            {compScale.toFixed(4)}
          </span>
          <br />
          Framing canvas x{' '}
          <span className={labStyles.mono}>
            {comp.x.toFixed(1)} – {(comp.x + comp.width).toFixed(1)}
          </span>{' '}
          (w {comp.width.toFixed(1)}), y{' '}
          <span className={labStyles.mono}>
            {comp.y.toFixed(1)} – {(comp.y + comp.height).toFixed(1)}
          </span>
          . One timeline drives every band; only this rectangle and the entry/exit
          positions resolved against its left edge change with the viewport.
        </div>
        <div>
          <strong>Now:</strong>{' '}
          {active.length ? active.map((p) => p.label).join(' · ') : 'settled'}
        </div>
        <ul className={styles.boundsList}>
          {PHASES.map((p) => (
            <li key={p.label}>
              <span className={styles.boundsName}>{p.label}</span>
              <span className={labStyles.mono}>
                {p.span[0]}–{p.span[1]} ms ({p.span[1] - p.span[0]} ms)
              </span>
            </li>
          ))}
        </ul>
        <div>
          The workspace is mounted for the whole sequence and revealed by opacity, so the handoff
          involves no remount and no geometry change, and the production drag-and-drop is live the
          moment it is visible. Scrub to <span className={labStyles.mono}>92%</span> to check the
          upload panel against Figma — note the bar is synchronised to the label there, so it sits
          at 92% rather than the authored frame&rsquo;s 85.04%. Scene Review still shows the
          authored frame as drawn.
        </div>
      </div>
    </div>
  );
}
