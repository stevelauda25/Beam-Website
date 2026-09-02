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
    set('--pulse-opacity', 0);
    set('--connector-settle', arrived);
    set('--solution-scale', 1);
    set('--dot-field-opacity', reveal);
    set('--destination-problem-opacity', 1 - reveal);
    set('--destination-solution-opacity', reveal);

    visual.dataset.transform = rawProgress < 0.06 ? 'rest' : 'active';
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
  const pulseOpacity =
    smooth(segment(rawProgress, 0.18, 0.26)) *
    (1 - smooth(segment(rawProgress, 0.76, 0.84)));
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

  set('--problem-scene-opacity', 1 - friction);
  set('--problem-scene-scale', 1 - friction * 0.74);
  set('--problem-scene-blur', `${friction * 0.136}cqw`);

  set('--command-emphasis', commandEmphasis);
  set('--command-y', `${(1 - commandEmphasis) * 0.679}cqw`);

  set('--pulse-progress', pulseProgress);
  set('--pulse-opacity', pulseOpacity);
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

function ProblemSteps() {
  return (
    <div className={styles.problemScene} aria-hidden="true">
      <div className={`${styles.problemPill} ${styles.problemPillOne}`}>
        <GitFork />
        <span>Clone repository</span>
        <CircleAlert />
      </div>
      <div className={`${styles.problemPill} ${styles.problemPillTwo}`}>
        <GitCommitHorizontal />
        <span>Commit unfinished work</span>
        <CircleAlert />
      </div>
      <div className={`${styles.problemPill} ${styles.problemPillThree}`}>
        <RotateCcw />
        <span>Restore secrets</span>
        <CircleAlert />
      </div>
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

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  useLayoutEffect(() => {
    if (localRef.current) {
      setSolutionVisualProgress(localRef.current, progress, reducedMotion);
    }
  }, [progress, reducedMotion]);

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

    /** Outer edge of the particle field, in normalised distance units. */
    const fieldReach = 1.18;
    /** How long the energy front takes to travel from Beam to the outer dots. */
    const propagationMs = 460;
    /** How long an individual dot takes to fall back to rest once the front hits it. */
    const dotDecayMs = 300;
    /** Onset of an individual dot's response — immediate, but not a hard step. */
    const dotOnsetMs = 50;
    /**
     * Where along the rail Beam starts to sense the laser — halfway between the
     * point the streak clears the source card (rail 0.1606, from the card and
     * rail geometry) and the Beam mark itself. Reacting only on contact read as
     * delayed; anticipating from here makes the field feel connected.
     */
    const triggerRail = 0.33;

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
      if (strength <= 0.006) return;

      const reaction = animate ? laserReaction() : null;

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

        if (alpha < 0.012) continue;
        context.fillStyle = `rgba(10, 10, 10, ${Math.min(0.72, alpha).toFixed(3)})`;
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
    syncPhase();

    return () => {
      phaseObserver.disconnect();
      visibilityObserver.disconnect();
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
        <ProblemSteps />
        <div className={styles.solutionScene}>
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
