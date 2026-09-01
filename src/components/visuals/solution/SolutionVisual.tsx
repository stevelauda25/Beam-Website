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

export function setSolutionVisualProgress(
  visual: HTMLElement,
  progress: number,
  reducedMotion = false,
) {
  const rawProgress = clamp(progress);

  if (reducedMotion) {
    const reveal = smooth(segment(rawProgress, 0.25, 0.75));
    visual.style.setProperty('--problem-scene-opacity', String(1 - reveal));
    visual.style.setProperty('--problem-scene-scale', '1');
    visual.style.setProperty('--problem-scene-blur', '0cqw');
    visual.style.setProperty('--destination-problem-opacity', String(1 - reveal));
    visual.style.setProperty('--destination-solution-opacity', String(reveal));
    visual.style.setProperty('--solution-opacity', String(reveal));
    visual.style.setProperty('--solution-scale', '1');
    visual.style.setProperty('--logo-scale', '1');
    visual.style.setProperty('--command-opacity', String(reveal));
    visual.style.setProperty('--command-y', '0cqw');
    visual.style.setProperty('--dot-field-opacity', String(reveal));
    visual.dataset.phase = reveal < 0.5 ? 'problem' : 'solution';
    visual.dataset.visualState =
      reveal < 0.5 ? 'Key Visual Problem' : 'Key Visual Solution';
    return;
  }

  const collapse = smooth(segment(rawProgress, 0.3, 0.52));
  const beamReveal = smooth(segment(rawProgress, 0.44, 0.63));
  const commandReveal = smooth(segment(rawProgress, 0.63, 0.74));
  const destinationResolve = smooth(segment(rawProgress, 0.79, 0.92));
  const dotReveal = smooth(segment(rawProgress, 0.48, 0.74));

  visual.style.setProperty('--problem-scene-opacity', String(1 - collapse));
  visual.style.setProperty('--problem-scene-scale', String(1 - collapse * 0.74));
  visual.style.setProperty('--problem-scene-blur', `${collapse * 0.136}cqw`);
  visual.style.setProperty(
    '--destination-problem-opacity',
    String(1 - destinationResolve),
  );
  visual.style.setProperty(
    '--destination-solution-opacity',
    String(destinationResolve),
  );
  visual.style.setProperty('--solution-opacity', String(beamReveal));
  visual.style.setProperty('--solution-scale', String(0.84 + beamReveal * 0.16));
  visual.style.setProperty('--logo-scale', String(0.26 + beamReveal * 0.74));
  visual.style.setProperty('--command-opacity', String(commandReveal));
  visual.style.setProperty('--command-y', `${(1 - commandReveal) * 0.679}cqw`);
  visual.style.setProperty('--dot-field-opacity', String(dotReveal));
  visual.dataset.phase =
    rawProgress < 0.44
      ? 'problem'
      : rawProgress < 0.92
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
      phase: number;
      speed: number;
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
          phase: random() * Math.PI * 2,
          speed: 0.0011 + random() * 0.0026,
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
    const started = lastFrame;

    const render = (now: number, animate = true) => {
      context.clearRect(0, 0, fieldSize, fieldSize);
      if (strength <= 0.006) return;

      const elapsed = now - started;
      const waveCenter = ((elapsed % 2400) / 2400) * 1.18;

      for (const dot of dots) {
        const signal =
          Math.sin(now * dot.speed + dot.phase) * 0.64 +
          Math.sin(now * dot.speed * 0.43 + dot.phase * 1.71) * 0.36;
        const sparkle = animate ? Math.max(0, (signal - 0.02) / 0.98) : 0.28;
        const waveDistance = (dot.distance - waveCenter) / 0.075;
        const wave = animate ? Math.exp(-(waveDistance * waveDistance)) : 0;
        const alpha =
          (0.11 + sparkle * sparkle * 0.5 + wave * 0.68) *
          dot.falloff *
          strength;

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
      render(now);
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
        render(performance.now(), false);
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
      <div className={styles.connector} aria-hidden="true" />

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
