import { forwardRef, useLayoutEffect, useRef } from 'react';
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
import { BeamMark } from './beam-mark';
import styles from './solution-visual-native.module.css';

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
    visual.dataset.phase = reveal < 0.5 ? 'problem' : 'solution';
    visual.dataset.visualState =
      reveal < 0.5 ? 'Key Visual Problem' : 'Key Visual Solution';
    return;
  }

  const collapse = smooth(segment(rawProgress, 0.3, 0.52));
  const beamReveal = smooth(segment(rawProgress, 0.44, 0.63));
  const commandReveal = smooth(segment(rawProgress, 0.63, 0.74));
  const destinationResolve = smooth(segment(rawProgress, 0.79, 0.92));

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

type SolutionVisualNativeProps = {
  progress?: number;
  reducedMotion?: boolean;
  className?: string;
};

export const SolutionVisualNative = forwardRef<
  HTMLDivElement,
  SolutionVisualNativeProps
>(function SolutionVisualNative(
  { progress = 0, reducedMotion = false, className = '' },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement | null>(null);

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
