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
  /**
   * CARRY CURVES — a pointer dragging files, not an object being animated.
   *
   * A real drag moves at close to constant speed: the person is steering, not
   * accelerating, and stops where they mean to stop. Both of these keep the
   * velocity essentially flat through the middle of the travel and have no
   * ease-out tail, so the stack never crawls the last few pixels.
   *
   * `linear`: constant velocity, start to finish. Direct and predictable; the
   * stop is a hard stop.
   *
   * `nearLinear`: the same, with only a subtle check in the final fifth —
   * velocity holds within ±9% of the average for the first three quarters,
   * dips to ~70% of it in the last 40ms, and the final 1% of the distance
   * takes ~5ms (the shipped `outSoft` spends 111ms on it). No spring, no
   * overshoot; the arrival point is identical.
   */
  linear: (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x),
  nearLinear: cubicBezier(0.4, 0.4, 0.8, 0.9),
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
  /**
   * INITIAL HOLD, ms. The opening frame — panel, files and hand at rest, no
   * arming, no upload — is held still for this long before anything moves.
   * Implemented as a uniform shift of every span in `heroSpans`, so every beat
   * after it keeps its exact relative timing. Global: the same hold applies to
   * every responsive band.
   */
  initialHoldDuration: number;
  // hand + file stack
  /**
   * The stack and the hand each get their OWN travel. They default to identical
   * values, which is what keeps them rigidly attached exactly as before; giving
   * them separate dials is what allows one to lead, trail or be repositioned
   * without touching code.
   */
  /**
   * RETIRED (2026-09-08): the files no longer have a trajectory of their own,
   * so they have no start of their own either — they begin wherever the
   * pointer begins, plus the grip offset. Kept as stored keys so no saved
   * tuning payload is rewritten; nothing reads them.
   */
  stackStartX: number;
  stackStartY: number;
  /**
   * THE GRIP. Still the files' position at the target, and now also what
   * defines the fixed offset they hold from the pointer for the whole carry:
   * grip = stackTarget - handTarget. Tuning it moves the files relative to the
   * hand without giving them any independent motion.
   */
  stackTargetX: number;
  stackTargetY: number;
  handStartX: number;
  handStartY: number;
  handTargetX: number;
  handTargetY: number;
  /** Static offset of the hand from its authored spot inside the stack frame. */
  handOffsetX: number;
  handOffsetY: number;
  /**
   * RETIRED (2026-09-08): the cards no longer drift after the drop — they cut
   * to hidden at the release event. Kept as stored keys so no saved tuning
   * payload is rewritten; nothing reads them. Not shown in the lab.
   */
  releaseOffsetX: number;
  releaseOffsetY: number;
  handOpacity: number;
  stackOpacity: number;
  /** RETIRED (2026-09-08): see releaseOffsetX. The cards are never blurred. */
  releaseBlur: number;
  /**
   * RETIRED (2026-09-08): the cards are rigidly attached to the pointer, so
   * there is no trailing to cap and no velocity-derived tilt. Key kept for
   * backward compatibility; nothing reads it.
   */
  cardLag: number;
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
  /**
   * RETIRED (2026-09-08): a settle is motion the files would have on their own
   * after the pointer has stopped, which is exactly what the rigid link
   * removes. Key kept; nothing reads it.
   */
  settleOffsetY: number;
  /**
   * RETIRED (2026-09-09): the hand does not open over time any more. Opening
   * IS the drop, so it happens on the drop frame, in one step, together with
   * the files being released. Key kept; nothing reads it.
   */
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
  /**
   * How long the target takes to acknowledge contact. Since 2026-09-09 the
   * only thing it drives is the dashed rule's stroke crossfade — the panel
   * itself no longer responds at all.
   */
  armDuration: number;
  /**
   * RETIRED (2026-09-08): the drop no longer has a press, a black ring or a
   * confirmation beat — the upload panel IS the confirmation. Kept as stored
   * keys so no saved tuning payload is rewritten; nothing reads them and the
   * lab does not show them.
   */
  pressAmount: number;
  pressStart: number;
  pressDuration: number;
  /**
   * RETIRED (2026-09-09): the panel's grey armed fill was removed, so there is
   * no intensity left to scale. Key kept so stored payloads are not rewritten;
   * nothing reads it.
   */
  armedIntensity: number;
  confirmOpacity: number;
  confirmInStart: number;
  confirmInDuration: number;
  confirmHoldDuration: number;
  confirmOutDuration: number;
  /**
   * RETIRED (2026-09-08): the drop is a STATE SWITCH, not a set of fades. The
   * dashed target, the instruction copy and the whole drop overlay are gone on
   * the drop frame, so there is no start and no duration left to tune. Keys
   * kept so stored payloads are not rewritten; nothing reads them.
   */
  dashedFadeStart: number;
  dashedFadeDuration: number;
  copyFadeStart: number;
  copyFadeDuration: number;
  // upload state
  /**
   * RETIRED (2026-09-08): the upload panel has NO entrance any more. It is
   * absent before the drop and present, at full opacity and its final tuned
   * position, from the release event onward — a cut, like the cards. Keys are
   * kept so stored payloads are not rewritten; nothing reads them.
   */
  uploadInStart: number;
  uploadInDuration: number;
  uploadY: number;
  /** Steady-state opacity of the upload panel while it is shown. */
  uploadOpacity: number;
  /**
   * RETIRED (2026-09-08): progress starts AT THE DROP, the same event that
   * shows the panel — an upload that starts on its own, not one waiting for
   * a scheduled time. Key kept so stored payloads are not rewritten.
   */
  uploadStart: number;
  uploadDuration: number;
  progressCurve: ProgressCurveName;
  textureOpacity: number;
  textureBandStrength: number;
  completeMixDuration: number;
  completeBlur: number;
  // workspace handoff
  /**
   * THE COMPLETION HOLD, ms. How long the finished upload — 100%, "Uploaded 3
   * files", checkmark — is held before the workspace takes over. Measured from
   * the END of the label/icon crossfade, so the state is fully established
   * before the clock on it starts. Shown in the lab as Resolve Delay.
   */
  resolveDelay: number;
  /**
   * RETIRED (2026-09-08): the upload panel does not dissolve into the
   * workspace any more — it is replaced by it, in one frame. There is no
   * resolve window, no dismissal and no reveal left to time. Keys kept so
   * stored payloads are not rewritten; nothing reads them.
   */
  resolveDuration: number;
  /** Opacity the settled workspace is drawn at. 1 is the shipped value. */
  workspaceOpacity: number;
  /** RETIRED (2026-09-08): see resolveDuration. Nothing fades or blurs. */
  dismissDuration: number;
  dismissBlur: number;
  revealDelay: number;
};

export type EaseName = keyof typeof EASE;
export type ProgressCurveName = 'blend' | 'easeOut' | 'clerk' | 'linear';

/** The shipped sequence, value for value. */
export const HERO_REVEAL_DEFAULTS: HeroRevealTuning = {
  /*
   * APPROVED TUNING — baked from the Motion Lab snapshot saved 2026-09-08T17:53:59.514Z
   * (src/dev/motion-lab/tuning/snapshots/hero-reveal.snapshot.json,
   * sha256 bd82809d3fed9118…). These literals ARE the shipped sequence; production
   * reads nothing else. Re-bake by saving a new snapshot and promoting it.
   * Position dials here (stack/hand start, target, offsets, pointer exit)
   * are overridden per band by HERO_RESPONSIVE_DEFAULTS at render time.
   * Retired keys are still carried so stored payloads round-trip; they are
   * baked at whatever the snapshot holds and nothing reads them.
   */
  initialHoldDuration: 1000,
  stackStartX: -500,
  stackStartY: 35,
  stackTargetX: 415,
  stackTargetY: 32,
  handStartX: -500,
  handStartY: 35,
  handTargetX: 360,
  handTargetY: 32,
  handOffsetX: -16,
  handOffsetY: -18,
  releaseOffsetX: 26,
  releaseOffsetY: -22,
  handOpacity: 1,
  stackOpacity: 1,
  releaseBlur: 0,
  cardLag: 0,
  approachStart: 0,
  approachDuration: 1200,
  approachEase: "out2",
  arrivalHoldDuration: 700,
  releaseDelay: 0,
  settleOffsetY: 0,
  handOpenDuration: 60,
  releaseDuration: 120,
  pointerExitDelay: 700,
  pointerExitDuration: 900,
  pointerExitX: -300,
  pointerExitY: 25,
  armTrigger: "contact",
  pointerExitOpacity: 0,
  pointerExitEase: "clerkReveal",
  armStart: 640,
  armDuration: 240,
  pressAmount: 0.006,
  pressStart: 900,
  pressDuration: 280,
  armedIntensity: 1.15,
  confirmOpacity: 1,
  confirmInStart: 900,
  confirmInDuration: 180,
  confirmHoldDuration: 200,
  confirmOutDuration: 280,
  dashedFadeStart: 1290,
  dashedFadeDuration: 100,
  copyFadeStart: 1100,
  copyFadeDuration: 80,
  uploadInStart: 1320,
  uploadInDuration: 420,
  uploadY: 6,
  uploadOpacity: 1,
  uploadStart: 1460,
  uploadDuration: 1800,
  progressCurve: "blend",
  textureOpacity: 1,
  textureBandStrength: 1,
  completeMixDuration: 300,
  completeBlur: 2,
  resolveDelay: 360,
  resolveDuration: 760,
  workspaceOpacity: 1,
  dismissDuration: 300,
  dismissBlur: 5,
  revealDelay: 250,
};

/*
 * There is no longer a "baseline release time": every post-drop beat is
 * anchored to the release event itself (see rawSpans), so nothing needs to be
 * re-based when the hold or the approach changes.
 */

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

/**
 * Every phase span, with the INITIAL HOLD applied.
 *
 * The hold is a single uniform shift: `rawSpans` lays the sequence out exactly
 * as authored, from time 0, and every span then moves later by
 * `initialHoldDuration`. No phase is retimed individually, so the relative
 * timing between approach, release, upload and resolve is untouched, and the
 * frame shown throughout the hold is the authored frame 0.
 */
export function heroSpans(k: HeroRevealTuning) {
  const raw = rawSpans(k);
  const hold = k.initialHoldDuration;
  if (!hold) return raw;
  return Object.fromEntries(
    Object.entries(raw).map(([name, [from, to]]) => [name, [from + hold, to + hold] as const]),
  ) as unknown as ReturnType<typeof rawSpans>;
}

function rawSpans(k: HeroRevealTuning) {
  /*
   * Arrival -> hold -> hand opens -> delay -> release. Everything downstream of
   * the release is SHIFTED by however much that moved, so lengthening the hold
   * delays the whole response rather than letting the panel acknowledge a drop
   * that has not happened yet. `shift` is 0 at the shipped values.
   */
  const approachEnd = k.approachStart + k.approachDuration;
  const handOpenStart = approachEnd + k.arrivalHoldDuration;
  const releaseStart = handOpenStart + k.releaseDelay;
  /*
   * The upload runs from the drop: the panel appears and its progress starts
   * in the same frame, so there is never an idle "0%" beat waiting for a
   * scheduled start. Everything after completion is measured from its end.
   */
  const uploadStart = releaseStart;
  const uploadEnd = uploadStart + k.uploadDuration;
  /*
   * THE COMPLETED STATE IS ESTABLISHED FIRST, THEN HELD, THEN REPLACED.
   *
   * The label and the icon finish crossfading at `completeMixEnd`; only from
   * there does the completion hold run. Cutting from the hold's old anchor
   * (the end of the progress) would have started the clock while the panel
   * still said "Uploading", which is the one thing the completed state exists
   * to show.
   */
  const completeMixEnd = uploadEnd + k.completeMixDuration;
  const switchAt = completeMixEnd + k.resolveDelay;
  /* Grey is a response to contact, not a timestamp. See `heroContactTime`. */
  const armStart = k.armTrigger === 'contact' ? heroContactTime(k) : k.armStart;
  return {
    approach: [k.approachStart, k.approachStart + k.approachDuration] as const,
    arm: [armStart, armStart + k.armDuration] as const,
    /** Stack has landed; nothing has been released yet. */
    arrivalHold: [approachEnd, handOpenStart] as const,
    release: [releaseStart, releaseStart + k.releaseDuration] as const,
    pointerExit: [
      releaseStart + k.pointerExitDelay,
      releaseStart + k.pointerExitDelay + k.pointerExitDuration,
    ] as const,
    /*
     * THE DROP IS A STATE SWITCH, NOT A SET OF FADES.
     *
     * Everything that belongs to the drag / drop state — the grey armed fill,
     * the dashed target, the instruction copy, the overlay backdrop and the
     * files — is gone on the drop frame, and the upload state is fully present
     * on that same frame. The two states never overlap, so there are no
     * "resolving" spans left here: see `dropped` in the sampler.
     */
    upload: [uploadStart, uploadEnd] as const,
    completeMix: [uploadEnd, uploadEnd + k.completeMixDuration] as const,
    /*
     * The finished state, held. Its end IS the handoff: on that frame the
     * upload panel stops being rendered and the workspace is drawn at full
     * opacity. One frame, no window, so there is nothing to overlap.
     */
    completeHold: [completeMixEnd, switchAt] as const,
  };
}

/** Total run time for a given tuning — the latest end across all phases. */
export function heroRevealDuration(k: HeroRevealTuning = HERO_REVEAL_DEFAULTS) {
  const s = heroSpans(k);
  return Math.max(...Object.values(s).map((span) => span[1]));
}

/*
 * A `heroWorkspaceHandoff` helper used to live here, exposing the dismiss /
 * reveal progress so a renderer could sequence framing with the crossfade.
 * There is no crossfade any more — the handoff is a single frame — so it had
 * nothing left to report and has been removed.
 */

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
    { id: 'hold', label: 'Opening frame', time: 0 },
    { id: 'start', label: 'Files approach', time: T.approach[0] },
    { id: 'armed', label: 'Target armed', time: T.arm[1] },
    /* The cards cut to hidden at the release event — this is the visible drop. */
    { id: 'drop', label: 'Drop', time: T.release[0] },
    { id: 'upload', label: 'Upload starts', time: T.upload[0] },
    { id: 'at85', label: 'Authored 85%', time: timeAtUploadProgress(0.8504) },
    { id: 'at92', label: '92%', time: timeAtUploadProgress(0.92) },
    { id: 'complete', label: '100%', time: T.upload[1] },
    /* The one frame the workspace replaces the panel. */
    { id: 'workspace', label: 'Workspace', time: T.completeHold[1] },
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
  /** 0..1 strength of the #f3f3f3 dim over the inner panel. Rendered as opacity. */
  dim: number;
  overlay: {
    /** Dropzone surface + dashed rule. 1 while the drag / drop state is up. */
    opacity: number;
    /** Instruction copy, multiplied by `opacity` — leads the dashed rule out. */
    copyOpacity: number;
    /** 0..1 crossfade from the unarmed stroke to the armed one. */
    armed: number;
  } | null;
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
    /**
     * `stackOpacity` until the drop, then exactly 0 from the first frame of the
     * release span: a HARD CUT, no interpolation. The renderer does not draw
     * the cards at 0. Nothing about the cards animates after the drop.
     */
    cardOpacity: number;
    pointerOpacity: number;
    /** Exit displacement, added on top of the hand's travel. */
    pointerExitX: number;
    pointerExitY: number;
    /** 0 = closed/grabbing hand, 1 = open hand. Crossfaded. */
    handOpen: number;
  } | null;
  upload: {
    /** Steady: the panel is either drawn at this or not drawn at all. */
    opacity: number;
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

  /*
   * THE DROP IS A CUT. The moment the release span begins — the hand has
   * opened and the files leave it — the cards are gone. No fade, blur, drift
   * or settle follows: a dropped file does not linger under the pointer, and
   * the panel's own acknowledgement (press, black ring, upload panel) carries
   * the continuity from here. The condition is the release EVENT itself, not a
   * separate timer, so it moves with every dial that moves the release.
   */
  const dropped = t >= S.release[0];
  /*
   * Contact acknowledgement, and ONLY on the dashed rule's stroke: the panel
   * itself does not react to the files arriving over it (2026-09-09). Ramps in
   * on contact and is simply not there once they have been dropped.
   */
  const arm = dropped ? 0 : phase(t, S.arm, EASE.out2);
  /*
   * Departure, not an arrival. `depart` accelerates away from a near-standstill
   * so the hand lingers while the drop registers, then leaves — subordinate
   * secondary motion rather than a snap.
   */
  const pointerOut = phase(t, S.pointerExit, EASE[k.pointerExitEase]);
  /*
   * The upload panel CUTS IN at the drop (2026-09-08): no opacity ramp, no
   * slide, no easing. Same event that hides the cards, so the picture goes
   * files-over-target -> uploading in one frame.
   */
  /*
   * THE HANDOFF IS ONE FRAME. Before it the upload panel is the only thing
   * drawn over the panel; from it the workspace is, at full opacity. There is
   * no window in which both exist, and none in which neither does.
   */
  const switched = t >= S.completeHold[1];

  /*
   * No press and no black confirmation ring any more (2026-09-08): the drop
   * goes straight to the upload panel. See rawSpans.
   */

  /*
   * ONE DRAG UNIT, ONE TRAJECTORY.
   *
   * The pointer is the only thing that moves: it interpolates from its own
   * start to its own target on the approach curve. The files do not
   * interpolate at all — they are placed at the pointer plus a FIXED grip
   * offset, so by construction they share the pointer's progress, its
   * velocity, its first moving frame and its last. Nothing can drift, lag,
   * catch up, settle or tilt, because there is no second interpolation left
   * to disagree with the first.
   *
   * The grip is taken at the TARGET, so both the pointer's and the files'
   * arrival positions are exactly what the band's dials say; only the files'
   * (mostly off-screen) starting point is now derived rather than dialled.
   */
  const p = approachAt(t);
  const handX = lerp(k.handStartX, k.handTargetX, p);
  const handY = lerp(k.handStartY, k.handTargetY, p);
  const stackX = handX + (k.stackTargetX - k.handTargetX);
  const stackY = handY + (k.stackTargetY - k.handTargetY);

  /* Present from the drop until the workspace replaces it. Never both. */
  const uploadActive = dropped && !switched;
  const uploadT = clamp01((t - S.upload[0]) / (S.upload[1] - S.upload[0]));
  const progress = t < S.upload[0] ? 0 : progressCurveFor(k.progressCurve)(uploadT);

  return {
    /*
     * Figma stacks #f3f3f3 over #ffffff for the transfer (scene 3) and back to
     * white for the workspace (scene 4). The white belongs to the drag / drop
     * state, so it goes with the rest of it: the interior is the transfer's
     * fill from the drop frame, not 430ms later underneath an upload panel
     * that is already fully present. It resolves back to white as the
     * workspace reveals. Rendered as an opacity layer, which is both the
     * faithful stacking and composite-only.
     */
    dim: dropped && !switched ? 1 : 0,
    /*
     * The whole drop overlay — backdrop, dashed rule and instruction copy —
     * belongs to the drag / drop state and is removed with it, on the drop
     * frame. Nothing of it survives under the upload panel.
     */
    overlay: dropped
      ? null
      : {
          opacity: 1,
          copyOpacity: 1,
          // Crossfaded between two strokes, not a per-frame stroke rewrite.
          armed: arm,
        },
    /*
     * Only the pointer is left after the drop, so the node survives until the
     * release span and the exit have both finished — the same moment as
     * before, expressed against the span rather than an eased value nothing
     * else needs any more.
     */
    dragStack:
      t >= S.release[1] && pointerOut >= 1
        ? null
        : {
            stackX,
            stackY,
            handX,
            handY,
            handOffsetX: k.handOffsetX,
            handOffsetY: k.handOffsetY,
            cardOpacity: dropped ? 0 : k.stackOpacity,
            pointerOpacity: lerp(k.handOpacity, k.pointerExitOpacity, pointerOut),
            pointerExitX: k.pointerExitX * pointerOut,
            pointerExitY: k.pointerExitY * pointerOut,
            /*
             * ONE EVENT, THREE STATE CHANGES. The hand opening, the closed
             * hand leaving and the files being released are the same physical
             * moment, so they are the same boolean: on the drop frame the grab
             * hand is off, the open hand is on and the cards are gone. A
             * crossfade here — even a short one — showed an open hand still
             * holding the files, which is the disconnect this removes.
             */
            handOpen: dropped ? 1 : 0,
          },
    upload: uploadActive
      ? {
          opacity: k.uploadOpacity,
          progress,
          complete: phase(t, S.completeMix, EASE.clerkReveal),
        }
      : null,
    workspaceOpacity: switched ? k.workspaceOpacity : 0,
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
/**
 * The stepped frames for a given tuning.
 *
 * DERIVED FROM THE SPANS, not authored as absolute times: every checkpoint has
 * to be a SETTLED state, and fixed timestamps silently stopped being settled
 * as the sequence was retimed — the old third frame (3620 + hold) ended up
 * past the end of the shortened sequence, so it clamped onto the workspace and
 * the stepper showed that state twice. Each frame below is the middle of a
 * phase, so it moves with whatever the tuning does:
 *
 *   1. mid arrival hold  — files over the target, hand still closed
 *   2. mid upload        — the transfer, in progress
 *   3. mid completion    — "Uploaded", checkmark, panel still up
 *   4. the settled, interactive workspace
 *
 * The stepper jumps straight to the first, so reduced-motion visitors never
 * sit through the initial hold.
 */
export function heroReducedSteps(k: HeroRevealTuning = HERO_REVEAL_DEFAULTS): readonly number[] {
  const S = heroSpans(k);
  const mid = (span: readonly [number, number]) => Math.round((span[0] + span[1]) / 2);
  return [mid(S.arrivalHold), mid(S.upload), mid(S.completeHold), heroRevealDuration(k)];
}

export const HERO_REDUCED_STEPS = heroReducedSteps();
export const HERO_REDUCED_STEP_MS = 520;

/** Panel geometry is re-exported so consumers never reach for a second source. */
export { HERO_PANEL };
