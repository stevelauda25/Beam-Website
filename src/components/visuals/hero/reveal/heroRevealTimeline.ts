/**
 * Hero reveal — the timeline.
 *
 * Everything here is a PURE FUNCTION OF TIME. `sampleHeroReveal(t)` returns the
 * complete visual state at t milliseconds, so playback, pausing and scrubbing
 * are all the same operation: set t, render. There is no tween state to get out
 * of sync, and the sequence is deterministic and repeatable by construction —
 * the same t always produces the same frame.
 *
 * No value here changes the hero container. The panel is painted from
 * HERO_PANEL in every frame; the timeline only drives contents and paint.
 */
import { HERO_DROP_TARGET, HERO_PANEL, HERO_POINTER_HOTSPOT } from './heroRevealScenes';

/* ------------------------------------------------------------------ easing */

/** Standard CSS cubic-bezier, solved by Newton-Raphson with a bisection fallback. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v > x) hi = t;
      else lo = t;
      t = (hi + lo) / 2;
      if (hi - lo < 1e-6) break;
    }
    return sampleY(t);
  };
}

export const EASE = {
  /**
   * The approach — a HAND CARRYING something, not an object thrown.
   *
   * The previous curve (0.28, 0.66, 0.2, 1) put 79% of the 470px travel into
   * the first 240ms, peaked at 1858 px/s, then crawled: the final 25% of the
   * time covered 1% of the distance at 13-44 px/s. That is an impulse decay,
   * and the long sub-100 px/s tail read as an easing curve rather than an arm.
   *
   * Both control points sit near the diagonal with the second pushed late, so
   * velocity holds 669-844 px/s across the middle (peak 844 — less than half
   * the old one) and the deceleration is concentrated in the last quarter,
   * which now covers 12% of the distance instead of 1%. Still lands exactly on
   * the same arrival point with no overshoot.
   */
  approach: cubicBezier(0.45, 0.45, 0.7, 1),
  /** The project's existing entrance curve (Hero AgentPromptButton, OnDemand). */
  outSoft: cubicBezier(0.22, 1, 0.36, 1),
  /**
   * easeOutCubic — Clerk's second most frequent curve (x58 in the audit).
   * Carries arming, release, dismissal and the pointer exit.
   */
  out2: cubicBezier(0.33, 1, 0.68, 1),
  /**
   * Clerk's DOMINANT curve, and the exact curve its scroll-entry reveals use
   * (opacity-only, 500ms). Used here for the workspace handoff.
   */
  clerkReveal: cubicBezier(0.4, 0, 0.2, 1),
  /**
   * The drop confirmation wipe. Clerk's reveal curve is nearly flat for its
   * first tenth — only 13px of ring after 40ms — so the acknowledgement was
   * technically running while still invisible. This reaches 48px at 40ms and
   * 87px at 60ms, then eases to 80% by half-time and settles: readable
   * immediately, still a travelling mask rather than a snap.
   */
  confirm: cubicBezier(0.33, 0.18, 0.25, 1),
  /**
   * Material's Acceleration curve, used ONLY for the pointer leaving the canvas
   * entirely: "elements leave the screen at full velocity. They do not
   * decelerate when off-screen." Emil's ban on ease-in protects elements the
   * user is waiting on; nobody waits on a departure's final pixel.
   */
  depart: cubicBezier(0.4, 0, 1, 1),
  /** ease-in-out — only for motion already on screen, never for enter/exit. */
  inOut: cubicBezier(0.65, 0, 0.35, 1),
} as const;

/*
 * NOTE ON A REMOVED CURVE.
 *
 * An earlier pass used a power2.in curve — cubic-bezier(0.32, 0, 0.67, 0) —
 * for the pointer exit. Both ANIMATION_RULES.md section 5 ("Never `ease-in` on
 * responsive UI") and the animations.dev guidance ("Never use `ease-in` on UI.
 * It starts slow — delaying the exact moment the user is watching") forbid it,
 * and the curve-family table puts BOTH entering and exiting the screen on
 * ease-out. The exit now uses `out2`.
 */

/* ---------------------------------------------------------------- timeline */

/* ------------------------------------------------------------------ tuning */

/**
 * Every value the Motion Lab can tune, as a flat record.
 *
 * The defaults below ARE the current sequence — `sampleHeroReveal(t)` with no
 * tuning argument produces byte-identical frames to before this type existed,
 * which is what keeps production (and Scene Review) unaffected. DialKit is an
 * editor over this object; nothing here changes behaviour on its own.
 *
 * Phases are expressed as START + DURATION rather than [start, end] because the
 * beats deliberately overlap: giving each its own start means lengthening one
 * does not cascade into the others and silently restructure the sequence.
 */
export type HeroRevealTuning = {
  // hand + file stack
  /**
   * The stack and the hand each get their OWN travel. They default to identical
   * values, which is what keeps them rigidly attached exactly as before; giving
   * them separate dials is what allows one to lead, trail or be repositioned
   * without touching code.
   */
  stackStartX: number;
  stackStartY: number;
  stackTargetX: number;
  stackTargetY: number;
  handStartX: number;
  handStartY: number;
  handTargetX: number;
  handTargetY: number;
  /** Static offset of the hand from its authored spot inside the stack frame. */
  handOffsetX: number;
  handOffsetY: number;
  /** Where the cards drift to as they release. */
  releaseOffsetX: number;
  releaseOffsetY: number;
  handOpacity: number;
  stackOpacity: number;
  /**
   * Peak blur on the released cards, px. Grows with the same linear presence
   * decay that drives their opacity, so the files read as resolving into the
   * upload state rather than simply switching off. Opacity stays the primary
   * cue; the hand is not blurred.
   */
  releaseBlur: number;
  approachStart: number;
  approachDuration: number;
  approachEase: EaseName;
  /**
   * The beat between arrival and release.
   *
   *   approach ends -> arrivalHold -> hand opens -> releaseDelay -> files go
   *
   * `handOpenStart` and `releaseStart` are no longer dials because they are
   * consequences of this, not independent facts: if the hold could move without
   * the release following it, the panel would react before the files left.
   */
  arrivalHoldDuration: number;
  releaseDelay: number;
  /** Tiny settle as the stack lands: an offset that eases to 0 over the hold. */
  settleOffsetY: number;
  handOpenDuration: number;
  releaseDuration: number;
  /** Delay after the release begins before the pointer starts leaving. */
  pointerExitDelay: number;
  pointerExitDuration: number;
  /** Travel distance to the left; the small downward drift scales with it. */
  /** Explicit exit target, rather than a distance with a derived drift. */
  pointerExitX: number;
  pointerExitY: number;
  /**
   * How the grey armed state is triggered.
   *
   * 'contact' derives it from the animated geometry — see `heroContactTime`.
   * 'time' falls back to the `armStart` dial, for isolating the ramp itself.
   */
  armTrigger: 'contact' | 'time';
  /** Opacity the pointer fades TO. 0 leaves nothing behind. */
  pointerExitOpacity: number;
  pointerExitEase: EaseName;
  // drop response
  armStart: number;
  armDuration: number;
  pressAmount: number;
  pressStart: number;
  pressDuration: number;
  armedIntensity: number;
  /** Peak opacity of the black confirmation ring. */
  confirmOpacity: number;
  confirmInStart: number;
  confirmInDuration: number;
  confirmHoldDuration: number;
  confirmOutDuration: number;
  dashedFadeStart: number;
  dashedFadeDuration: number;
  copyFadeStart: number;
  copyFadeDuration: number;
  // upload state
  uploadInStart: number;
  uploadInDuration: number;
  uploadY: number;
  uploadOpacity: number;
  uploadStart: number;
  uploadDuration: number;
  progressCurve: ProgressCurveName;
  textureOpacity: number;
  textureBandStrength: number;
  completeMixDuration: number;
  completeBlur: number;
  // workspace handoff
  resolveDelay: number;
  resolveDuration: number;
  workspaceOpacity: number;
  /**
   * The upload panel's dismissal, inside the resolve window: how long its
   * blur + fade takes from the start of that window, and its peak blur in px.
   * Opacity is the primary cue; the blur is restrained on purpose.
   */
  dismissDuration: number;
  dismissBlur: number;
  /**
   * When the workspace starts to reveal, from the start of the resolve window.
   * Kept later than most of the dismissal so the panel is already nearly gone
   * before the content under it becomes readable — a small crossfade for
   * continuity, never a frame where both are strong.
   */
  revealDelay: number;
};

export type EaseName = keyof typeof EASE;
export type ProgressCurveName = 'blend' | 'easeOut' | 'clerk' | 'linear';

/** The shipped sequence, value for value. */
export const HERO_REVEAL_DEFAULTS: HeroRevealTuning = {
  stackStartX: -470,
  stackStartY: 34,
  stackTargetX: 0,
  stackTargetY: 0,
  handStartX: -470,
  handStartY: 34,
  handTargetX: 0,
  handTargetY: 0,
  handOffsetX: 0,
  handOffsetY: 0,
  releaseOffsetX: 46,
  releaseOffsetY: -22,
  handOpacity: 1,
  stackOpacity: 1,
  releaseBlur: 4,
  approachStart: 0,
  approachDuration: 720,
  approachEase: 'approach',
  /*
   * 130 + 50 reproduces the previous absolute timings exactly: the approach
   * ends at 720, the hand opens at 850 and the files leave at 900. Long enough
   * to read as "deliberately positioned over the target", short enough that
   * nothing sits still — the target is still arming through it.
   */
  arrivalHoldDuration: 130,
  releaseDelay: 50,
  settleOffsetY: 0,
  handOpenDuration: 120,
  releaseDuration: 280,
  /*
   * The exit waits for the drop acceptance to register (the confirmation has
   * faded in by 1080, the press peaks ~993) and then leaves over 360ms rather
   * than 220ms. `depart` accelerates away from a near-standstill, so the hand
   * lingers briefly and then goes — secondary motion, not a snap. It still
   * clears before the progress bar starts moving at 1460.
   */
  pointerExitDelay: 220,
  pointerExitDuration: 360,
  pointerExitX: -300,
  pointerExitY: 26,
  armTrigger: 'contact',
  pointerExitOpacity: 0,
  pointerExitEase: 'depart',
  armStart: 640,
  armDuration: 240,
  pressAmount: 0.006,
  pressStart: 900,
  pressDuration: 280,
  armedIntensity: 1,
  confirmOpacity: 1,
  confirmInStart: 900,
  confirmInDuration: 180,
  confirmHoldDuration: 200,
  confirmOutDuration: 280,
  dashedFadeStart: 1180,
  dashedFadeDuration: 260,
  copyFadeStart: 1100,
  copyFadeDuration: 200,
  uploadInStart: 1160,
  uploadInDuration: 420,
  uploadY: 6,
  uploadOpacity: 1,
  uploadStart: 1460,
  uploadDuration: 1800,
  progressCurve: 'blend',
  textureOpacity: 1,
  textureBandStrength: 1,
  completeMixDuration: 300,
  completeBlur: 2,
  resolveDelay: 420,
  resolveDuration: 500,
  workspaceOpacity: 1,
  dismissDuration: 300,
  dismissBlur: 5,
  revealDelay: 250,
};

/** The release time the shipped sequence is authored around. */
const BASELINE_RELEASE_START = 900;

/** Resolve the tuning into the absolute spans the sampler runs on. */
/**
 * WHEN THE DRAG PHYSICALLY ENTERS THE DROP TARGET.
 *
 * The grey armed state is a response to contact, so it is derived from the
 * animated geometry rather than set by a timestamp: change where the stack
 * travels to, or how fast it gets there, and the grey follows on its own. Each
 * breakpoint therefore arms at its own moment, because each has its own target.
 *
 * WHAT COUNTS AS CONTACT: the POINTER HOTSPOT — the centre of the authored
 * cursor frame — crossing into the drop target's bounds. That is the point a
 * real drag-and-drop hit-tests with, and it is the reading that matches the
 * picture: the hand is what carries the files, and the files are drawn around
 * it. The alternative (any corner of the card bounding box touching the zone)
 * fires while the stack is still visibly outside, because the cards are drawn
 * rotated and their box overhangs the artwork.
 *
 * The vertical test is a formality — the hotspot sits at canvas y 293 for the
 * whole approach and the drop target spans y 69.5..532.5 — but it is checked so
 * that moving the stack vertically cannot silently arm the panel from outside.
 *
 * Returns the approach's end if contact never happens, so a target parked
 * outside the zone still arms on arrival instead of never arming at all.
 */
export function heroContactTime(k: HeroRevealTuning): number {
  const approachEnd = k.approachStart + k.approachDuration;
  const ease = EASE[k.approachEase];

  const hotspotX = (p: number) =>
    HERO_POINTER_HOTSPOT.x + lerp(k.handStartX, k.handTargetX, p) + k.handOffsetX;
  const hotspotY = (p: number) =>
    HERO_POINTER_HOTSPOT.y + lerp(k.handStartY, k.handTargetY, p) + k.handOffsetY;

  const inside = (p: number) => {
    const x = hotspotX(p);
    const y = hotspotY(p);
    return (
      x >= HERO_DROP_TARGET.left &&
      x <= HERO_DROP_TARGET.left + HERO_DROP_TARGET.width &&
      y >= HERO_DROP_TARGET.top &&
      y <= HERO_DROP_TARGET.top + HERO_DROP_TARGET.height
    );
  };

  if (inside(ease(1))) {
    /*
     * Bisect on the LINEAR fraction of the approach, evaluating the eased
     * progress at each step. Solving the easing analytically would need its
     * inverse; sampling the forward curve needs neither and cannot disagree
     * with what the renderer draws, because it calls the same easing.
     */
    if (inside(ease(0))) return k.approachStart;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inside(ease(mid))) hi = mid;
      else lo = mid;
    }
    return k.approachStart + hi * k.approachDuration;
  }
  return approachEnd;
}

export function heroSpans(k: HeroRevealTuning) {
  /*
   * Arrival -> hold -> hand opens -> delay -> release. Everything downstream of
   * the release is SHIFTED by however much that moved, so lengthening the hold
   * delays the whole response rather than letting the panel acknowledge a drop
   * that has not happened yet. `shift` is 0 at the shipped values.
   */
  const approachEnd = k.approachStart + k.approachDuration;
  const handOpenStart = approachEnd + k.arrivalHoldDuration;
  const releaseStart = handOpenStart + k.releaseDelay;
  const shift = releaseStart - BASELINE_RELEASE_START;
  const at = (ms: number) => ms + shift;
  const confirmInStart = at(k.confirmInStart);
  const confirmInEnd = confirmInStart + k.confirmInDuration;
  const confirmHoldEnd = confirmInEnd + k.confirmHoldDuration;
  const uploadStart = at(k.uploadStart);
  const uploadEnd = uploadStart + k.uploadDuration;
  const resolveStart = uploadEnd + k.resolveDelay;
  const resolveEnd = resolveStart + k.resolveDuration;
  /* Grey is a response to contact, not a timestamp. See `heroContactTime`. */
  const armStart = k.armTrigger === 'contact' ? heroContactTime(k) : k.armStart;
  return {
    approach: [k.approachStart, k.approachStart + k.approachDuration] as const,
    arm: [armStart, armStart + k.armDuration] as const,
    /** Stack has landed; nothing has been released yet. */
    arrivalHold: [approachEnd, handOpenStart] as const,
    handOpen: [handOpenStart, handOpenStart + k.handOpenDuration] as const,
    release: [releaseStart, releaseStart + k.releaseDuration] as const,
    panelPress: [at(k.pressStart), at(k.pressStart) + k.pressDuration] as const,
    pointerExit: [
      releaseStart + k.pointerExitDelay,
      releaseStart + k.pointerExitDelay + k.pointerExitDuration,
    ] as const,
    confirmIn: [confirmInStart, confirmInEnd] as const,
    confirmHold: [confirmInEnd, confirmHoldEnd] as const,
    confirmOut: [confirmHoldEnd, confirmHoldEnd + k.confirmOutDuration] as const,
    copyOut: [at(k.copyFadeStart), at(k.copyFadeStart) + k.copyFadeDuration] as const,
    dashedOut: [
      at(k.dashedFadeStart),
      at(k.dashedFadeStart) + k.dashedFadeDuration,
    ] as const,
    uploadIn: [at(k.uploadInStart), at(k.uploadInStart) + k.uploadInDuration] as const,
    upload: [uploadStart, uploadEnd] as const,
    completeMix: [uploadEnd, uploadEnd + k.completeMixDuration] as const,
    hold: [uploadEnd, resolveStart] as const,
    resolve: [resolveStart, resolveEnd] as const,
    /*
     * The handoff is two phases inside the resolve window, not one shared
     * value. Driving the panel out and the workspace in from the SAME number
     * put both at 0.5 in the middle — the overlap this exists to remove. Both
     * are clamped inside the window so the total duration cannot change.
     */
    dismiss: [resolveStart, Math.min(resolveStart + k.dismissDuration, resolveEnd)] as const,
    reveal: [Math.min(resolveStart + k.revealDelay, resolveEnd - 1), resolveEnd] as const,
  };
}

/** Total run time for a given tuning — the latest end across all phases. */
export function heroRevealDuration(k: HeroRevealTuning = HERO_REVEAL_DEFAULTS) {
  const s = heroSpans(k);
  return Math.max(...Object.values(s).map((span) => span[1]));
}

/** The progress shapes selectable in the lab. `blend` is the shipped one. */
export function progressCurveFor(name: ProgressCurveName): (p: number) => number {
  if (name === 'easeOut') return (p) => EASE.out2(clamp01(p));
  if (name === 'clerk') return (p) => EASE.clerkReveal(clamp01(p));
  if (name === 'linear') return clamp01;
  return uploadCurve;
}

/**
 * Phase boundaries in ms, derived from the shipped tuning so the spans and the
 * tunable defaults can never drift apart. Overlaps are deliberate: beats hand
 * over to each other rather than queueing, which is what keeps the sequence
 * continuous.
 */
export const T = heroSpans(HERO_REVEAL_DEFAULTS);

/**
 * The sequence's reference frame rate.
 *
 * Every span above is authored in milliseconds against a 60fps clock — the
 * player's own rAF loop advances on real elapsed time and clamps a stalled
 * frame to 64ms, i.e. just under four frames at this rate. Frame-stepping in
 * the lab converts through this rather than through an invented step size, so
 * one "frame" in the scrubber is one frame of the animation as authored.
 */
export const HERO_REVEAL_FPS = 60;
export const HERO_FRAME_MS = 1000 / HERO_REVEAL_FPS;

export const HERO_REVEAL_DURATION = heroRevealDuration();

/**
 * Solve the upload curve for a target progress. Used for the review markers so
 * they cannot drift from the curve if its shape is retuned.
 */
export function timeAtUploadProgress(target: number): number {
  const [from, to] = T.upload;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (uploadCurve(mid) < target) lo = mid;
    else hi = mid;
  }
  return Math.round(from + ((lo + hi) / 2) * (to - from));
}

/** Named markers for the lab scrubber. */
export function heroRevealMarkers(): { id: string; label: string; time: number }[] {
  return [
    { id: 'start', label: 'Files approach', time: 0 },
    { id: 'armed', label: 'Target armed', time: T.arm[1] },
    { id: 'drop', label: 'Drop', time: T.release[1] },
    { id: 'upload', label: 'Upload starts', time: T.upload[0] },
    { id: 'at85', label: 'Authored 85%', time: timeAtUploadProgress(0.8504) },
    { id: 'at92', label: '92%', time: timeAtUploadProgress(0.92) },
    { id: 'complete', label: '100%', time: T.upload[1] },
    { id: 'workspace', label: 'Workspace', time: T.resolve[1] },
  ];
}

/* ----------------------------------------------------------------- helpers */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Normalised, eased progress through a phase. */
function phase(t: number, span: readonly [number, number], ease: (x: number) => number) {
  const [from, to] = span;
  return ease(clamp01((t - from) / (to - from)));
}

/*
 * A hoisted declaration, not a const arrow: `heroContactTime` is called from
 * `heroSpans`, which runs at module scope to build the default spans — before
 * this line is reached. A const would still be in its temporal dead zone.
 */
function lerp(a: number, b: number, p: number) {
  return a + (b - a) * p;
}

/**
 * Upload rhythm: quick early, steady through the middle, decelerating to a
 * clean resolve. Deterministic, monotonic, and — critically — its RATE never
 * approaches zero.
 *
 * The previous version stitched three eased segments together. Sampling its
 * rate exposed two dead intervals: progress sat at ~52% for roughly 300ms
 * (rate 0.01) and again at ~89%, then RE-ACCELERATED into the finish. Section 6
 * (Perceived Speed) calls dead intervals defects, and a late surge is the
 * opposite of the brief's "small slowdown near completion".
 *
 * Blending a strong ease-out with a linear term keeps the front-loading while
 * bounding the rate from below: it decays monotonically 1.82 -> 0.30 with no
 * stall, reaching 47.5% in the first 30% of the time and spending the last 10%
 * of the time on the final 3.3%.
 */
export function uploadCurve(p: number): number {
  const x = clamp01(p);
  return 0.72 * (1 - Math.pow(1 - x, 2.2)) + 0.28 * x;
}

/* ------------------------------------------------------------------- state */

export type HeroRevealFrame = {
  /** 0..1 strength of the armed fill on the panel frame. Rendered as opacity. */
  panelArm: number;
  /** 0..1 strength of the #f3f3f3 dim over the inner panel. Rendered as opacity. */
  dim: number;
  rightWashOpacity: number;
  overlay: {
    /** Dropzone surface + dashed rule. */
    opacity: number;
    /** Instruction copy, multiplied by `opacity` — leads the dashed rule out. */
    copyOpacity: number;
    /** 0..1 crossfade from the unarmed stroke to the armed one. */
    armed: number;
  } | null;
  /**
   * Uniform scale on the panel frame — the whole surface, ring included.
   * Returns to exactly 1; this is a compression, not an overshoot.
   */
  panelPress: number;
  /** Black confirmation ring opacity — fades in, holds, fades to default. */
  borderConfirm: number;
  dragStack: {
    /** Stack travel — carries the cards. */
    stackX: number;
    stackY: number;
    /** Hand travel — defaults to the stack's, so they read as attached. */
    handX: number;
    handY: number;
    /** Static hand offset within the stack frame. */
    handOffsetX: number;
    handOffsetY: number;
    /** Cards trail the pointer proportionally to speed. */
    cardLagX: number;
    cardRotate: number;
    cardOpacity: number;
    /** Release blur, px. 0 until the hand opens. */
    cardBlur: number;
    cardScale: number;
    /** Drift toward the upload panel on release — object permanence. */
    cardDropX: number;
    cardDropY: number;
    pointerOpacity: number;
    /** Exit displacement, added on top of the hand's travel. */
    pointerExitX: number;
    pointerExitY: number;
    /** 0 = closed/grabbing hand, 1 = open hand. Crossfaded. */
    handOpen: number;
  } | null;
  upload: {
    opacity: number;
    y: number;
    /** Dismissal blur, px. 0 until the panel starts to leave. */
    blur: number;
    /**
     * THE canonical progress value, 0..1. Everything inside the panel derives
     * from this one number — percentage, line width, transferred region and the
     * leading texture — so nothing can drift apart.
     */
    progress: number;
    /** 0..1 crossfade from the "Uploading" label to the "Uploaded" one. */
    complete: number;
  } | null;
  workspaceOpacity: number;
};

/** Sampling gap used to derive the cards' trailing lag from pointer speed. */
const LAG_MS = 70;
const LAG_GAIN = 0.5;
const LAG_MAX = 26;

/**
 * The whole sequence at time `t`, for a given tuning.
 *
 * Called with no tuning it reproduces the shipped sequence exactly — that is
 * what keeps Scene Review and any future production wiring independent of the
 * Motion Lab. DialKit edits the tuning object; it never reaches in here.
 */
export function sampleHeroReveal(
  time: number,
  k: HeroRevealTuning = HERO_REVEAL_DEFAULTS,
): HeroRevealFrame {
  const S = k === HERO_REVEAL_DEFAULTS ? T : heroSpans(k);
  const t = Math.max(0, Math.min(heroRevealDuration(k), time));

  const approachAt = (at: number) => phase(at, S.approach, EASE[k.approachEase]);
  const stackXAt = (at: number) => lerp(k.stackStartX, k.stackTargetX, approachAt(at));
  const stackYAt = (at: number) => lerp(k.stackStartY, k.stackTargetY, approachAt(at));

  const arm = phase(t, S.arm, EASE.out2);
  const release = phase(t, S.release, EASE.out2);
  /*
   * The cards' MOTION eases out, but their PRESENCE decays evenly. Fading
   * opacity on the same front-loaded curve put them at 0.02 by 1100 — visually
   * gone before the upload panel even started arriving, which reopened the void
   * the handoff exists to close.
   */
  const releasePresence = clamp01((t - S.release[0]) / (S.release[1] - S.release[0]));
  const dashedOut = phase(t, S.dashedOut, EASE.out2);
  const copyOut = phase(t, S.copyOut, EASE.out2);
  /*
   * Departure, not an arrival. `depart` accelerates away from a near-standstill
   * so the hand lingers while the drop registers, then leaves — subordinate
   * secondary motion rather than a snap.
   */
  const pointerOut = phase(t, S.pointerExit, EASE[k.pointerExitEase]);
  /*
   * Clerk's reveal curve, not a steep entrance: a front-loaded curve landed the
   * panel before the dropzone had resolved and never actually crossfaded with
   * the confirmation. A gentler curve keeps it rising across the whole window.
   */
  const uploadIn = phase(t, S.uploadIn, EASE.clerkReveal);
  /*
   * Dismiss first, reveal after. `dismiss` takes the upload panel out (opacity
   * plus a restrained blur), `reveal` brings the workspace in. See heroSpans.
   */
  const dismiss = phase(t, S.dismiss, EASE.clerkReveal);
  const reveal = phase(t, S.reveal, EASE.clerkReveal);

  /*
   * The press. Asymmetric: it compresses in the first third and eases back over
   * the remaining two thirds. A symmetric swell builds as slowly as it decays,
   * which reads as staged and contradicts Clerk's "immediate response".
   */
  const pressRaw = clamp01((t - S.panelPress[0]) / (S.panelPress[1] - S.panelPress[0]));
  const ATTACK = 1 / 3;
  const press =
    pressRaw <= 0
      ? 0
      : pressRaw < ATTACK
        ? EASE.out2(pressRaw / ATTACK)
        : 1 - EASE.out2((pressRaw - ATTACK) / (1 - ATTACK));

  /*
   * The confirmation is an OPACITY transition, not a travelling mask: it fades
   * in with the release and the press, holds, then fades back toward the
   * default ring as the upload panel arrives — one continuous response rather
   * than a separate gesture with its own direction.
   */
  const confirmIn = phase(t, S.confirmIn, EASE.out2);
  const confirmOut = phase(t, S.confirmOut, EASE.out2);
  const handOpen = phase(t, S.handOpen, EASE.out2);

  const stackX = stackXAt(t);
  /*
   * The settle: a small offset present the instant the stack lands, easing to 0
   * across the hold. Defaults to 0, so the shipped sequence has none.
   */
  const settle = k.settleOffsetY
    ? k.settleOffsetY * (1 - phase(t, S.arrivalHold, EASE.out2))
    : 0;
  const stackY = stackYAt(t) + (t >= S.approach[1] ? settle : 0);
  const handX = lerp(k.handStartX, k.handTargetX, approachAt(t));
  const handY = lerp(k.handStartY, k.handTargetY, approachAt(t));
  // Lag is derived from the STACK's own speed — it is the cards that trail.
  const lag = Math.max(
    -LAG_MAX,
    Math.min(LAG_MAX, -(stackX - stackXAt(t - LAG_MS)) * LAG_GAIN),
  );

  const uploadActive = t >= S.uploadIn[0];
  const uploadT = clamp01((t - S.upload[0]) / (S.upload[1] - S.upload[0]));
  const progress = t < S.upload[0] ? 0 : progressCurveFor(k.progressCurve)(uploadT);

  return {
    /*
     * Grey ARMED holds beneath the black confirmation and releases with it, so
     * the ring resolves once rather than stepping black -> grey -> default.
     * Figma authors the black-20% fill on scene 2 only, so it must not survive
     * into the upload state or the handoff lands on a darker panel than ships.
     */
    panelArm: arm * (1 - confirmOut) * k.armedIntensity,
    // Compression only, and back to exactly 1. No elastic overshoot.
    panelPress: 1 - k.pressAmount * press,
    borderConfirm: confirmIn * (1 - confirmOut) * k.confirmOpacity,
    /*
     * Figma stacks #f3f3f3 over #ffffff for the transfer (scene 3) and back to
     * white for the workspace (scene 4), so the dim is driven by the drop
     * itself, not by arming — the two release at different times. Rendered as
     * an opacity layer, which is both the faithful stacking and composite-only.
     */
    dim: release * (1 - reveal),
    rightWashOpacity: 1 - dashedOut,
    overlay:
      dashedOut >= 1
        ? null
        : {
            opacity: 1 - dashedOut,
            /*
             * Copy carries its own alpha ON TOP of the layer's, so it resolves
             * ahead of the dashed rule without needing a second element tree.
             */
            copyOpacity: 1 - copyOut,
            // Crossfaded between two strokes, not a per-frame stroke rewrite.
            armed: arm,
          },
    dragStack:
      release >= 1 && pointerOut >= 1
        ? null
        : {
            stackX,
            stackY,
            handX,
            handY,
            handOffsetX: k.handOffsetX,
            handOffsetY: k.handOffsetY,
            cardLagX: lag,
            cardRotate: lag * 0.06,
            cardOpacity: (1 - releasePresence) * k.stackOpacity,
            cardBlur: k.releaseBlur * releasePresence,
            cardScale: lerp(1, 0.94, release),
            /*
             * Object permanence: the files must not dissolve where they stand
             * and be replaced by an unrelated panel. They drift toward where
             * the upload panel is about to appear. A directional hint, not a
             * flight.
             */
            cardDropX: lerp(0, k.releaseOffsetX, release),
            cardDropY: lerp(0, k.releaseOffsetY, release),
            pointerOpacity: lerp(k.handOpacity, k.pointerExitOpacity, pointerOut),
            pointerExitX: k.pointerExitX * pointerOut,
            pointerExitY: k.pointerExitY * pointerOut,
            handOpen,
          },
    upload: uploadActive
      ? {
          opacity: (1 - dismiss) * uploadIn * k.uploadOpacity,
          /* Entrance slide only. Dismissal is opacity + blur, no movement. */
          y: lerp(k.uploadY, 0, uploadIn),
          blur: k.dismissBlur * dismiss,
          progress,
          complete: phase(t, S.completeMix, EASE.clerkReveal),
        }
      : null,
    workspaceOpacity: reveal * k.workspaceOpacity,
  };
}

/** The settled end state — the handoff target. */
export const HERO_REVEAL_END = sampleHeroReveal(HERO_REVEAL_DURATION);

/**
 * Reduced motion: STEP, do not skip.
 *
 * Section 6 (Reduced Motion) is explicit — "gentler, not zero", and "for
 * explanatory visuals where motion carries the explanation, jump between states
 * rather than tweening between them, so the visitor still receives every
 * state." This reveal exists to explain that the hero accepts dropped files, so
 * skipping straight to the workspace would withhold the explanation rather than
 * soften it.
 *
 * These are representative frames, held and hard-cut: no movement, only the
 * state changes that carry meaning. The last entry is the settled workspace, so
 * the sequence still ends usable and interactive.
 */
/*
 * Every checkpoint must be a SETTLED state. 3400 used to sit inside the label
 * crossfade (measured 0.27 / 0.73), so the stepped variant landed on a frame
 * showing two overlapping strings — the exact transitional frame stepping
 * exists to avoid. 3620 is after the crossfade completes and before the
 * workspace reveal begins.
 * 845 replaces 880 for the same reason: pulling `handOpen` earlier (850-970)
 * put 880 inside the hand crossfade, which would have rendered two ghosted
 * hands. At 845 the target is visually armed (arm resolves to 0.99), the hand
 * is still fully closed and the files are intact.
 */
export const HERO_REDUCED_STEPS = [845, 2200, 3620, HERO_REVEAL_DURATION] as const;
export const HERO_REDUCED_STEP_MS = 520;

/** Panel geometry is re-exported so consumers never reach for a second source. */
export { HERO_PANEL };
