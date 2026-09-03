import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import {
  CircleAlert,
  CircleCheck,
  File,
  Folder,
  GitCommitHorizontal,
  GitFork,
  LoaderCircle,
  LockKeyhole,
  Monitor,
  RotateCcw,
} from 'lucide-react';
import { BeamMark } from './BeamMark';
import styles from './SolutionVisual.module.css';

const files = [
  { name: 'src/', type: 'folder' },
  { name: 'package.json', type: 'file' },
  { name: 'components/', type: 'file' },
] as const;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const segment = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start));
const smooth = (value: number) => value * value * (3 - 2 * value);

/*
 * STATE 1 TRANSIENT PRESENCE — owned by SCROLL, not by the autoplay clock.
 *
 * The autoplay decides WHICH failure frame is showing. Scroll decides WHETHER
 * State 1 is still allowed on screen at all. Keeping those separate is what the
 * bug came from violating: the clock froze mid-travel and the laser, which lives
 * in `.connector` rather than in the scroll-faded `.problemScene`, had no other
 * opacity source and simply stayed.
 *
 * Every State-1-only transient is now multiplied by this, so it leaves with the
 * Problem state instead of outliving it.
 *
 * The window ends exactly where the autoplay clock freezes (see the `story`
 * threshold below). That alignment matters in BOTH directions: the clock runs
 * for precisely as long as the transient is visible, so a frozen frame can never
 * be seen fading out on the way into State 2, nor fading in on the way back.
 */
const FAILURE_EXIT_FROM = 0.02;
const FAILURE_EXIT_TO = 0.1;

export function failurePresenceFor(progress: number) {
  return 1 - smooth(segment(clamp(progress), FAILURE_EXIT_FROM, FAILURE_EXIT_TO));
}

/** Rail position of the Beam mark. */
const BEAM_MIDPOINT = 0.5;

/**
 * The travelling state crosses the rail at one constant, uninterrupted pace.
 *
 * A single monotonic ramp — no plateau, no dwell, no deceleration at centre.
 * The state never waits for Beam; Beam adapts to the state's approach (see
 * `logoFormationFor`).
 */
const railPosition = (value: number) => segment(value, 0.24, 0.78);

/**
 * Beam's formation is derived from the travelling state's POSITION, not from an
 * independent progress range. That makes the relationship structurally causal:
 * the mark builds as the state closes in, and is finished before it arrives.
 *
 * Invariant: formation completes at rail 0.42, so at the midpoint (0.50) the
 * logo is already fully established — guaranteed by construction, since this is
 * monotonic in rail and saturates below the midpoint.
 */
const logoFormationFor = (rail: number) => smooth(segment(rail, 0.16, 0.42));

/** How close (in rail units) the state must be for Beam to react at all. */
const WAVE_RADIUS = 0.1;
/** Peak sits fractionally past centre, so the wave reads as a consequence. */
const WAVE_PEAK = BEAM_MIDPOINT + 0.012;

/**
 * Beam's reception wave is a pure function of the travelling state's distance
 * from the Beam mark — not a timer, not a one-shot, and not its own timeline.
 *
 * Because it is derived from position, it rises, peaks and decays identically
 * whether the user scrolls forward, stops on centre, or scrubs back through it.
 */
const waveResponseFor = (rail: number) =>
  1 - smooth(clamp(Math.abs(rail - WAVE_PEAK) / WAVE_RADIUS));

/**
 * Every visual property of this scene is a pure function of `progress`.
 *
 * That is the contract: scroll position IS transformation position. Stopping
 * holds an exact intermediate state, scrolling back reverses it deterministically,
 * and every value in 0..1 produces a valid composition. Nothing semantic may run
 * on its own timer, because a timer cannot be scrubbed or reversed.
 *
 * Ranges deliberately overlap so the transformation reads as one continuous
 * change rather than a sequence of discrete steps.
 */
export function setSolutionVisualProgress(
  visual: HTMLElement,
  progress: number,
  reducedMotion = false,
) {
  const rawProgress = clamp(progress);
  const set = (name: string, value: string | number) =>
    visual.style.setProperty(name, String(value));

  if (reducedMotion) {
    // Meaning is preserved — problem, Beam-caused change, ready — but nothing
    // travels across the screen. Path states step rather than tween.
    const reveal = smooth(segment(rawProgress, 0.25, 0.75));
    const arrived = reveal >= 0.5 ? 1 : 0;

    set('--problem-scene-opacity', 1 - reveal);
    set('--problem-scene-scale', 1);
    set('--problem-scene-blur', '0cqw');
    set('--command-emphasis', smooth(segment(rawProgress, 0.05, 0.35)));
    set('--command-y', '0cqw');
    set('--logo-form', reveal);
    set('--logo-scale', 1);
    set('--beam-response', 0);
    set('--pulse-progress', arrived);
    set('--connector-settle', arrived);
    set('--solution-scale', 1);
    set('--dot-field-opacity', reveal);
    set('--destination-problem-opacity', 1 - reveal);
    set('--destination-solution-opacity', reveal);

    /*
     * Reduced motion gets the failure's OUTCOME, not its performance: one pill,
     * already red, no travelling laser and no radial wave. The meaning — this
     * workflow fails — survives without repeated movement.
     */
    set('--f1-opacity', 1);
    set('--f1-y', '0cqw');
    set('--f1-coverage', 1);
    set('--f2-opacity', 0);
    set('--f3-opacity', 0);
    set('--attempt-head', 0);
    set('--attempt-opacity', 0);
    set('--failure-field', 0);
    set('--failure-presence', 0);

    visual.dataset.transform = rawProgress < 0.06 ? 'rest' : 'active';
    // No autoplay under reduced motion — the failure rests on its outcome.
    visual.dataset.story = 'transforming';
    visual.dataset.connector = arrived ? 'settled' : 'transforming';
    visual.dataset.phase = reveal < 0.5 ? 'problem' : 'solution';
    visual.dataset.visualState =
      reveal < 0.5 ? 'Key Visual Problem' : 'Key Visual Solution';
    return;
  }

  // The command leads: it gains emphasis from the very first pixel of scroll,
  // so the trigger is established before any of its effects.
  const commandEmphasis = smooth(segment(rawProgress, 0.0, 0.2));
  // Friction recedes rather than collapsing, overlapping the command.
  const friction = smooth(segment(rawProgress, 0.08, 0.46));
  // One continuous ramp, never eased, so it tracks scroll directly.
  const pulseProgress = railPosition(rawProgress);
  // Both are driven by the state's POSITION, so Beam forms as it approaches and
  // reacts as it passes through — without the state ever changing pace.
  const logoForm = logoFormationFor(pulseProgress);
  const beamResponse = waveResponseFor(pulseProgress);
  const dotReveal = smooth(segment(rawProgress, 0.44, 0.72));
  // The destination starts reacting before full arrival, then resolves.
  const destinationReact = smooth(segment(rawProgress, 0.66, 0.9));
  const destinationResolve = smooth(segment(rawProgress, 0.72, 0.92));
  // Runs to the very end so the final stretch still resolves rather than
  // holding — State 2 lands settled instead of waiting for the pin to release.
  const connectorSettle = smooth(segment(rawProgress, 0.78, 0.99));

  // Scroll's verdict on whether State 1 may still be seen.
  set('--failure-presence', failurePresenceFor(rawProgress));

  set('--problem-scene-opacity', 1 - friction);
  set('--problem-scene-scale', 1 - friction * 0.74);
  set('--problem-scene-blur', `${friction * 0.136}cqw`);

  set('--command-emphasis', commandEmphasis);
  set('--command-y', `${(1 - commandEmphasis) * 0.679}cqw`);

  set('--pulse-progress', pulseProgress);
  set('--connector-settle', connectorSettle);

  set('--logo-form', logoForm);
  set('--logo-scale', 0.26 + logoForm * 0.74);
  set('--beam-response', beamResponse);
  set('--solution-scale', 0.84 + logoForm * 0.16);
  set('--dot-field-opacity', dotReveal);

  set('--destination-problem-opacity', 1 - destinationReact);
  set('--destination-solution-opacity', destinationResolve);

  // `rest` keeps the friction queue cycling only while the scene is untouched,
  // so State 1 reads without waiting and stops competing the moment you scroll.
  visual.dataset.transform = rawProgress < 0.06 ? 'rest' : 'active';
  /*
   * Gates the State 1 autoplay. The failure story is told by its own clock, not
   * by scroll; scroll only decides WHETHER it is still the active story. The
   * loop freezes on its current frame the moment the transformation engages, so
   * leaving and re-entering State 1 never resets or teleports it.
   */
  /*
   * Deliberately the same boundary as FAILURE_EXIT_TO. The clock is allowed to
   * run for exactly as long as the transient can be seen, so there is never a
   * visible frozen frame in either scroll direction.
   */
  visual.dataset.story =
    rawProgress < FAILURE_EXIT_TO ? 'failing' : 'transforming';
  // Gates the ambient final-state laser. It may only run once the connector has
  // substantially resolved into State 2; scrubbing back out removes the
  // animation entirely, so it can never interfere with the semantic transform.
  visual.dataset.connector = connectorSettle >= 0.6 ? 'settled' : 'transforming';
  visual.dataset.phase =
    rawProgress < 0.42
      ? 'problem'
      : rawProgress < 0.9
        ? 'transition'
        : 'solution';
  visual.dataset.visualState =
    rawProgress < 0.5 ? 'Key Visual Problem' : 'Key Visual Solution';
}


/*
 * STATE 1 AUTOPLAY.
 *
 * Two clocks, two responsibilities, no overlap:
 *
 *   autoplay clock  ->  the three failed attempts, looping
 *   scroll progress ->  State 1 composition -> State 2 composition
 *
 * The autoplay never touches the transformation, and scroll never scrubs an
 * individual attempt. `cycle` only advances while the story is active, so
 * pausing freezes the exact frame and resuming continues from it.
 */
/** Next pill arrives while the failed one is still leaving. */
const ENTER_MS = 240;
/** A beat of stable gray before the attempt sets off. */
const REST_MS = 120;
const SWEEP_MS = 260;
/*
 * Long enough for the centred wave to reach the field's rim (390ms) and decay
 * (300ms). The wave simply finishes underneath the pill's exit.
 */
const PULSE_MS = 760;
const HOLD_MS = 220;
const EXIT_MS = 300;
/** Quiet beat between a pill leaving and the next round starting. */
const TAIL_MS = 120;

/*
 * The attempt's SPEED is the approved quantity, not its duration.
 *
 * It was tuned at 380ms across 14.737cqw — the gap between the pill's leading
 * edge and the rail's origin in the original composition. Widening the scene
 * stretches that gap, so holding 380ms would silently make the failed attempt
 * fly. The duration is derived from the measured distance at that same
 * velocity, and the round grows to fit it.
 *
 * Every beat AFTER impact keeps its own duration. Only the travel changes.
 */
const BASE_LASER_MS = 380;
const BASE_ATTEMPT_CQW = 40.917 - 26.18;

export type FailureTiming = {
  laserMs: number;
  impactAt: number;
  exitAt: number;
  roundMs: number;
  loopMs: number;
};

export function failureTiming(laserMs = BASE_LASER_MS): FailureTiming {
  const impactAt = REST_MS + laserMs;
  const exitAt = impactAt + SWEEP_MS + HOLD_MS;
  const roundMs = exitAt + EXIT_MS + TAIL_MS;
  return { laserMs, impactAt, exitAt, roundMs, loopMs: roundMs * 3 };
}

/**
 * Live horizontal geometry, read from computed styles rather than bounding
 * rects so the scene's own scale transform cannot distort it.
 *
 * Returns the attempt distance (which sets the laser's duration) and the rail
 * position where the streak clears the source card (which sets the dot field's
 * anticipation). Both were previously constants baked from one composition;
 * measuring them keeps both correct at every breakpoint.
 */
function readSceneGeometry(visual: HTMLElement) {
  const value = (selector: string, prop: string) => {
    const node = visual.querySelector(selector);
    return node
      ? Number.parseFloat(getComputedStyle(node).getPropertyValue(prop))
      : NaN;
  };

  const width = visual.clientWidth;
  const connectorLeft = value(`.${styles.connector}`, 'left');
  const connectorWidth = value(`.${styles.connector}`, 'width');
  const pillLeft = value(`.${styles.problemPill}`, 'left');
  const cardLeft = value(`.${styles.leftCard}`, 'left');
  const cardWidth = value(`.${styles.leftCard}`, 'width');

  if (
    !width ||
    !connectorWidth ||
    [connectorLeft, pillLeft, cardLeft, cardWidth].some(Number.isNaN)
  ) {
    return null;
  }

  return {
    attemptCqw: ((pillLeft - connectorLeft) / width) * 100,
    /** Rail position at which the streak clears the source card. */
    cardRail: (cardLeft + cardWidth - connectorLeft) / connectorWidth,
  };
}

/** Matches the slide distance the queue used before, in cqw. */
const PILL_SLIDE = 4.35;

/**
 * The failure red. Identical to `.pillFaceFailed`'s `border-color: #e51d31`, so
 * the field's disturbance and the pill's failed state are literally the same
 * red rather than two that happen to look alike.
 */
const FAILURE_RED = '229, 29, 49';

/*
 * ONE pulse-wave system, used by both states. Beam's reception wave and the
 * failure wave share these values verbatim — same centre, same radial
 * propagation, same wave thickness, same onset and decay. The ONLY difference
 * between the two is colour.
 *
 * The pulse is centred on the dot field in both cases. The pill collision is
 * causal in TIME — it is what starts the wave — not in space; it does not move
 * the wave's origin.
 */
const FIELD_REACH = 1.18;
/*
 * The failure wave travels further than Beam's reception wave, on purpose.
 *
 * State 2's wave brightens a field that is ALREADY visible, so its rim reads
 * even where the centre vignette is strong. State 1 has no resting field, so
 * only the moving front is visible — and at the shared 1.18 reach the vignette
 * left everything past d=0.7 under 0.2 alpha, which read as a small central
 * blob rather than a wave. A longer reach carries the front across the whole
 * field and lifts the rim's amplitude, without touching the centre.
 */
const FAILURE_REACH = 1.6;
const FIELD_PROPAGATION_MS = 460;
const FIELD_DECAY_MS = 300;
const FIELD_ONSET_MS = 50;

/**
 * One dot's answer to a centred pulse, as a pure function of its distance from
 * the field centre and how long ago the wave started.
 *
 * This is the same expression State 2's reception wave uses; State 1 simply
 * paints the result red. Exported so propagation and decay can be verified
 * numerically rather than only by eye.
 */
export function failureDotResponse(distance: number, age: number) {
  const localAge = age - (distance / FAILURE_REACH) * FIELD_PROPAGATION_MS;
  if (localAge < 0 || localAge > FIELD_DECAY_MS) return 0;

  // Same onset and decay as Beam's reception wave — only the reach differs.
  const rise = Math.min(1, localAge / FIELD_ONSET_MS);
  const fall = Math.pow(1 - localAge / FIELD_DECAY_MS, 1.7);
  // Outer dots answer more faintly than those beside the centre.
  const reach = 1 - 0.5 * (distance / FAILURE_REACH);
  return rise * fall * reach * 0.8;
}

export type FailureFrame = {
  pills: { opacity: number; offset: number; coverage: number }[];
  laserHead: number;
  laserOpacity: number;
  /** ms since the current attempt struck, or null when nothing has. */
  impactAge: number | null;
};

/** Impact envelope: hard zero before contact, fast rise, slower decay. */
const impulse = (t: number) => {
  if (t <= 0 || t >= 1) return 0;
  const rise = smooth(clamp(t / 0.22));
  const fall = Math.pow(1 - clamp((t - 0.22) / 0.78), 1.6);
  return rise * fall;
};

/**
 * One frame of the State 1 failure loop, as a pure function of elapsed time.
 *
 * The render loop does nothing but `sampleFailureAt(cycle)` and write the
 * result, so the choreography is independently checkable with real millisecond
 * inputs rather than only observable by watching it.
 *
 * Exported for that reason.
 */
export function sampleFailureAt(
  time: number,
  timing: FailureTiming = failureTiming(),
): FailureFrame {
  const { impactAt, exitAt, roundMs, loopMs } = timing;
  const cycle = ((time % loopMs) + loopMs) % loopMs;
  const pills: FailureFrame['pills'] = [];
  let laserHead = 0;
  let laserOpacity = 0;
  let impactAge: number | null = null;

  for (let index = 0; index < 3; index += 1) {
    const local = (((cycle - index * roundMs) % loopMs) + loopMs) % loopMs;

    let opacity = 0;
    let offset = 0;
    let coverage = 0;

    if (local >= loopMs - ENTER_MS) {
      // Sliding in from above while the previous pill is still leaving.
      const entering = smooth((local - (loopMs - ENTER_MS)) / ENTER_MS);
      opacity = entering;
      offset = (1 - entering) * -PILL_SLIDE;
    } else if (local <= exitAt + EXIT_MS) {
      const exiting = smooth(segment(local, exitAt, exitAt + EXIT_MS));
      opacity = 1 - exiting;
      offset = exiting * PILL_SLIDE;
      coverage = segment(local, impactAt, impactAt + SWEEP_MS);

      // Only the pill currently under attack owns the laser and the impact.
      if (local < impactAt) {
        laserHead = segment(local, REST_MS, impactAt);
        laserOpacity =
          segment(local, REST_MS, REST_MS + 40) *
          (1 - segment(local, impactAt - 30, impactAt));
      } else if (local <= impactAt + PULSE_MS) {
        impactAge = local - impactAt;
      }
    }

    pills.push({ opacity, offset, coverage });
  }

  return { pills, laserHead, laserOpacity, impactAge };
}

type MachineCardProps = {
  title: string;
  destination?: boolean;
};

function MachineCard({ title, destination = false }: MachineCardProps) {
  return (
    <article className={styles.machineCard}>
      <header className={styles.machineHeader}>
        {title === 'Your machine' ? <Monitor /> : <Folder />}
        <span>{title}</span>
      </header>

      <div className={styles.machineBody}>
        <p className={styles.path}>~/project</p>
        <div className={styles.fileList}>
          {files.map((item) => (
            <div className={styles.fileRow} key={item.name}>
              {item.type === 'folder' ? <Folder /> : <File />}
              <span>{item.name}</span>
            </div>
          ))}
          <div className={styles.fileRow}>
            <File />
            <span>.env</span>
            {destination ? (
              <span className={`${styles.secretsRequired} ${styles.problemOnly}`}>
                Secrets required
                <CircleAlert />
              </span>
            ) : (
              <LockKeyhole className={styles.lock} />
            )}
          </div>
        </div>

        {destination ? (
          <>
            <div
              className={`${styles.readyState} ${styles.problemReadyState} ${styles.problemOnly}`}
            >
              <LoaderCircle />
              <span>Everything ready</span>
            </div>
            <div className={`${styles.readyState} ${styles.solutionOnly}`}>
              <CircleCheck />
              <span>Everything ready</span>
            </div>
          </>
        ) : (
          <div className={styles.readyState}>
            <CircleCheck />
            <span>Everything ready</span>
          </div>
        )}
      </div>
    </article>
  );
}

const frictionSteps = [
  { icon: GitFork, label: 'Clone repository' },
  { icon: GitCommitHorizontal, label: 'Commit unfinished work' },
  { icon: RotateCcw, label: 'Restore secrets' },
] as const;

/**
 * Each pill is rendered TWICE — once neutral, once failed — and the failed face
 * is progressively unclipped from its left edge.
 *
 * That is deliberate. Border, background, text, shadow and the alert glyph all
 * have to change together, and animating five properties separately is how they
 * end up looking like five unrelated animations. One clip through one rendering
 * means the failure crosses every property on the same vertical line at the same
 * instant, sweeping out from wherever the attempt struck.
 */
function ProblemSteps() {
  return (
    <div className={styles.problemScene} aria-hidden="true">
      {frictionSteps.map(({ icon: Icon, label }, index) => (
        <div
          key={label}
          className={`${styles.problemPill} ${styles[`problemPill${index + 1}`]}`}
        >
          <div className={styles.pillFace}>
            <Icon />
            <span>{label}</span>
            <CircleAlert />
          </div>
          <div className={`${styles.pillFace} ${styles.pillFaceFailed}`}>
            <Icon />
            <span>{label}</span>
            <CircleAlert />
          </div>
        </div>
      ))}
    </div>
  );
}

type SolutionVisualProps = {
  progress?: number;
  reducedMotion?: boolean;
  className?: string;
};

export const SolutionVisual = forwardRef<
  HTMLDivElement,
  SolutionVisualProps
>(function SolutionVisual(
  { progress = 0, reducedMotion = false, className = '' },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const dotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const laserRef = useRef<HTMLSpanElement | null>(null);
  /*
   * Shared between the autoplay loop and the canvas: how long ago the current
   * attempt struck, or null when nothing has. The dot field reads this to place
   * its red wave, so the two cannot describe different moments.
   */
  const failureImpactRef = useRef<number | null>(null);
  /** Scroll-owned visibility of every State 1 transient. */
  const failurePresenceRef = useRef(1);

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  useLayoutEffect(() => {
    failurePresenceRef.current = reducedMotion ? 0 : failurePresenceFor(progress);
    if (localRef.current) {
      setSolutionVisualProgress(localRef.current, progress, reducedMotion);
    }
  }, [progress, reducedMotion]);

  useEffect(() => {
    const visual = localRef.current;
    if (!visual || reducedMotion) return;

    let frame = 0;
    let cycle = 0;
    let last = performance.now();
    let inView = false;
    /*
     * Derived from the live composition, so the attempt keeps its approved
     * velocity whether the scene is at its narrow or widened geometry.
     */
    let timing = failureTiming();
    const remeasure = () => {
      const geometry = readSceneGeometry(visual);
      if (!geometry) return;
      timing = failureTiming(
        BASE_LASER_MS * (geometry.attemptCqw / BASE_ATTEMPT_CQW),
      );
    };
    remeasure();

    const set = (name: string, value: string | number) =>
      visual.style.setProperty(name, String(value));

    const apply = (time: number) => {
      const frameState = sampleFailureAt(time, timing);

      frameState.pills.forEach((pill, index) => {
        set(`--f${index + 1}-opacity`, pill.opacity.toFixed(4));
        set(`--f${index + 1}-y`, `${pill.offset.toFixed(4)}cqw`);
        set(`--f${index + 1}-coverage`, pill.coverage.toFixed(4));
      });

      set('--attempt-head', frameState.laserHead.toFixed(4));
      set('--attempt-opacity', frameState.laserOpacity.toFixed(4));

      failureImpactRef.current = frameState.impactAge;
      set(
        '--failure-field',
        frameState.impactAge === null
          ? 0
          : impulse(frameState.impactAge / PULSE_MS).toFixed(4),
      );
    };

    const tick = (now: number) => {
      const active = inView && visual.dataset.story === 'failing';
      if (active) {
        cycle = (cycle + (now - last)) % timing.loopMs;
        apply(cycle);
      }
      // `last` always advances, so a pause never banks elapsed time and the
      // story resumes from the frame it froze on rather than jumping forward.
      last = now;
      frame = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.08 },
    );
    observer.observe(visual);

    // The composition widens at a container breakpoint, so the attempt distance
    // can change without a remount.
    const resize = new ResizeObserver(remeasure);
    resize.observe(visual);

    apply(0);
    frame = window.requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      resize.disconnect();
      window.cancelAnimationFrame(frame);
      failureImpactRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    const visual = localRef.current;
    const canvas = dotCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!visual || !canvas || !context) return;

    const fieldSize = 420;
    const center = fieldSize / 2;
    let seed = 0x51a7c3;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const dots: Array<{
      x: number;
      y: number;
      size: number;
      /** Fixed resting brightness. Static by design — the field never twinkles. */
      glow: number;
      distance: number;
      falloff: number;
    }> = [];

    for (let y = 4; y < fieldSize; y += 6) {
      for (let x = 4; x < fieldSize; x += 6) {
        if (random() < 0.42) continue;

        const distance = Math.hypot(x - center, y - center) / center;
        const falloff = Math.max(0, 1 - Math.pow(distance, 1.85));
        if (falloff <= 0) continue;

        dots.push({
          x,
          y,
          size: random() > 0.92 ? 3 : random() > 0.62 ? 2 : 1,
          // Varied but constant, so the resting field keeps its texture without
          // any of the dots animating on their own.
          glow: 0.11 + random() * 0.3,
          distance,
          falloff,
        });
      }
    }

    let frame = 0;
    let visible = false;
    let strength = visual.dataset.phase === 'problem' ? 0 : 1;
    let targetStrength = strength;
    let lastFrame = performance.now();

    /* Both waves share one geometry — see FIELD_* above. */
    const fieldReach = FIELD_REACH;
    const propagationMs = FIELD_PROPAGATION_MS;
    const dotDecayMs = FIELD_DECAY_MS;
    const dotOnsetMs = FIELD_ONSET_MS;
    /**
     * Where along the rail Beam starts to sense the laser — halfway between the
     * point the streak clears the source card and the Beam mark itself. Reacting
     * only on contact read as delayed; anticipating from here makes the field
     * feel connected.
     *
     * MEASURED, not assumed: that card-clearing rail was 0.1606 in the original
     * composition and 0.1126 in the widened one, so a constant would have gone
     * stale the moment the panels moved.
     */
    let triggerRail = 0.33;
    const remeasureTrigger = () => {
      const geometry = readSceneGeometry(visual);
      if (geometry) triggerRail = (geometry.cardRail + BEAM_MIDPOINT) / 2;
    };
    remeasureTrigger();

    /*
     * State 1's failure wave uses the same motion language as Beam's success
     * response — localized origin, outward propagation, decay — but red, shorter,
     * and originating at the collision rather than at the mark. The two are
     * mutually exclusive by state: this one only runs while the story is
     * 'failing', the success one only once the connector is 'settled'.
     * Its per-dot response lives in `failureDotResponse` above.
     */

    const laserTravel =
      Number.parseFloat(
        getComputedStyle(visual).getPropertyValue('--laser-travel'),
      ) || 0.74;

    /**
     * The field's reaction to the looping laser, read from the laser's OWN
     * animation clock so the two cannot drift.
     *
     * `since`  — ms since the streak entered the early trigger zone.
     * `impact` — 0..1 envelope: a subtle pre-response as the laser closes in,
     *            reaching full strength as it arrives at the Beam mark.
     *
     * Returns null whenever the final-state loop is not running, in which case
     * the field simply rests. There is no ambient fallback animation.
     */
    const laserReaction = () => {
      if (visual.dataset.connector !== 'settled') return null;
      const laserEl = laserRef.current;
      if (!laserEl) return null;

      const [animation] = laserEl.getAnimations();
      const time = animation?.currentTime;
      const duration = animation?.effect?.getTiming().duration;
      if (typeof time !== 'number' || typeof duration !== 'number') return null;

      const railToMs = duration * laserTravel;
      const triggerAt = railToMs * triggerRail;
      // How long after the trigger the streak actually reaches the Beam mark.
      const impactAt = railToMs * (BEAM_MIDPOINT - triggerRail);

      const cyclePosition = ((time % duration) + duration) % duration;
      const since = ((cyclePosition - triggerAt) % duration + duration) % duration;
      if (since > propagationMs + dotDecayMs) return null;

      return {
        since,
        // Stage 1 anticipation -> stage 2 impact. Never a step change.
        impact:
          since >= impactAt ? 1 : 0.3 + 0.7 * smooth(since / impactAt),
      };
    };

    /**
     * ONE field, rendered once per frame.
     *
     * At rest each dot draws its own constant `glow` — nothing oscillates, so
     * there is no ambient layer to be mistaken for a second field. The only
     * motion is the laser-triggered impulse, which is applied to these same
     * dots rather than to any additional surface.
     *
     * Propagation is genuinely spatial: a dot's response begins only when the
     * energy front reaches ITS distance, so centre dots react and start settling
     * while outer dots have not yet been touched.
     */
    const render = (animate = true) => {
      context.clearRect(0, 0, fieldSize, fieldSize);

      const reaction = animate ? laserReaction() : null;
      /*
       * Gated on scroll-owned presence rather than on `data-story`. A hard cut at
       * the story boundary would have popped the wave off mid-flight, and a stale
       * impact age could otherwise redraw red dots once State 2 revealed the
       * field again.
       */
      const failurePresence = animate ? failurePresenceRef.current : 0;
      const failureAge =
        failurePresence > 0.001 ? failureImpactRef.current : null;

      if (strength <= 0.006 && failureAge === null) return;

      for (const dot of dots) {
        let response = 0;

        if (reaction) {
          const arrivalMs = (dot.distance / fieldReach) * propagationMs;
          const localAge = reaction.since - arrivalMs;

          if (localAge >= 0 && localAge <= dotDecayMs) {
            // Quick onset, softer decay — an impulse rather than a flash.
            const rise = Math.min(1, localAge / dotOnsetMs);
            const fall = Math.pow(1 - localAge / dotDecayMs, 1.7);
            // Outer dots answer more faintly than those beside the mark.
            const reach = 1 - 0.5 * (dot.distance / fieldReach);
            response = rise * fall * reach * reaction.impact;
          }
        }

        const alpha = (dot.glow + response * 0.8) * dot.falloff * strength;

        if (alpha >= 0.012) {
          context.fillStyle = `rgba(10, 10, 10, ${Math.min(0.72, alpha).toFixed(3)})`;
          context.fillRect(dot.x, dot.y, dot.size, dot.size);
        }

        if (failureAge === null) continue;

        /*
         * Softened vignette (sqrt) for the failure wave only. The centre is
         * untouched — falloff 1 stays 1 — but the rim rises from ~0.18 to ~0.42,
         * so more of the field participates. This makes the wave LARGER, not
         * louder: peak alpha at the centre is unchanged.
         */
        const red =
          failureDotResponse(dot.distance, failureAge) *
          Math.sqrt(dot.falloff) *
          failurePresence;
        if (red < 0.012) continue;

        context.fillStyle = `rgba(${FAILURE_RED}, ${Math.min(0.72, red).toFixed(3)})`;
        context.fillRect(dot.x, dot.y, dot.size, dot.size);
      }
    };

    const draw = (now: number) => {
      frame = 0;
      if (!visible || reducedMotion) return;

      const frameScale = Math.min(3, (now - lastFrame) / 16.667);
      lastFrame = now;
      strength += (targetStrength - strength) * (1 - Math.pow(0.84, frameScale));
      render();
      frame = window.requestAnimationFrame(draw);
    };

    const schedule = () => {
      if (frame || !visible || reducedMotion) return;
      lastFrame = performance.now();
      frame = window.requestAnimationFrame(draw);
    };

    const syncPhase = () => {
      targetStrength = visual.dataset.phase === 'problem' ? 0 : 1;
      if (reducedMotion) {
        strength = targetStrength;
        render(false);
      } else {
        schedule();
      }
    };

    const phaseObserver = new MutationObserver(syncPhase);
    phaseObserver.observe(visual, {
      attributes: true,
      attributeFilter: ['data-phase'],
    });

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        visual.dataset.inView = visible ? 'true' : 'false';
        if (visible) schedule();
        else if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { threshold: 0.08 },
    );
    visibilityObserver.observe(visual);
    const geometryObserver = new ResizeObserver(remeasureTrigger);
    geometryObserver.observe(visual);
    syncPhase();

    return () => {
      phaseObserver.disconnect();
      visibilityObserver.disconnect();
      geometryObserver.disconnect();
      delete visual.dataset.inView;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={setRefs}
      className={`${styles.visual} ${className}`}
      data-visual-state="Key Visual Problem"
      aria-label="The problem of rebuilding a development environment transitions into Beam mounting the complete project"
    >
      <div className={styles.connector} aria-hidden="true">
        {/*
          State 1's failed attempt: a short streak that travels left -> right and
          terminates on the pill's leading edge. Its stop point is expressed in
          the same cqw values as the layout, so the collision cannot drift at any
          container size, and it never crosses into the pill.
        */}
        <span className={styles.attemptLaser} />
        {/*
          Ambient final-state laser. Time-based on purpose: it runs only after
          the semantic journey has completed, so it never determines product
          progression. Its animation is applied solely by the
          [data-connector='settled'] rule, so leaving State 2 removes it cleanly.
        */}
        <span ref={laserRef} className={styles.connectorLaser} />
      </div>

      <div className={styles.leftCard}>
        <MachineCard title="Your machine" />
      </div>

      <div className={styles.center}>
        {/*
          The field is a BACKGROUND layer, so it is a sibling of the two scenes
          rather than a child of the solution scene — which sits above the pills.
          Same coordinates (both scenes are inset:0 on this box), and it carries
          the solution scale itself so State 2 is visually unchanged.
        */}
        <div className={styles.dotField} aria-hidden="true">
          <canvas
            ref={dotCanvasRef}
            className={styles.dotCanvas}
            width="420"
            height="420"
          />
          <span className={styles.waveRing} />
          <span className={styles.waveRing} />
          <span className={styles.waveRing} />
        </div>

        <ProblemSteps />
        <div className={styles.solutionScene}>
          <div className={styles.logoDisc}>
            <BeamMark className={styles.logo} />
          </div>
          <code className={styles.command}>$ beam mount ~/project</code>
        </div>
      </div>

      <div className={styles.rightCard}>
        <MachineCard title="New environment" destination />
      </div>
    </div>
  );
});
