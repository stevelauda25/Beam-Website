/**
 * Isolated harness — DEV ONLY.
 *
 * Renders a real production visual on a plain stage at a predictable size,
 * with room around it so the pointer can enter and leave naturally (production
 * hover behaviour is preserved as-is; nothing is faked or re-implemented here).
 *
 * Sizing mirrors production per entry and is never invented:
 *
 *  - 'fill'      the homepage wraps the visual in an aspect box and forces
 *                `[&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full`.
 *                The harness reproduces exactly that.
 *  - 'intrinsic' the homepage gives it no wrapper, so the component sizes
 *                itself. The harness must not force width/height or fill
 *                nested SVGs — doing so stretches icons inside cards and
 *                clips their text.
 *
 * Replay is a harness-level remount via `key`. No production animation logic is
 * touched to make this work.
 */
import type { ReactNode } from 'react';
import styles from '../MotionLab.module.css';
import type { SizingMode, StageTheme } from '../registry';

type IsolatedHarnessProps = {
  /** Bumped by the lab to force a remount of the production subtree. */
  replayKey: number;
  /** Preview canvas width from the viewport preset; null means fluid. */
  width: number | null;
  /** Width of this visual's parent on the production homepage. */
  intrinsicWidth?: number;
  sizing?: SizingMode;
  stage?: StageTheme;
  aspect?: string;
  children: ReactNode;
};

export function IsolatedHarness({
  replayKey,
  width,
  intrinsicWidth,
  sizing = 'intrinsic',
  stage = 'light',
  aspect,
  children,
}: IsolatedHarnessProps) {
  // Never exceed the production parent width — that is what makes the desktop
  // preview reproduce the real composition instead of a squeezed variant.
  const canvasWidth =
    width === null
      ? intrinsicWidth ?? null
      : intrinsicWidth
        ? Math.min(width, intrinsicWidth)
        : width;

  const isFill = sizing === 'fill';

  return (
    <div className={styles.hoverGutter}>
      <div
        className={`${styles.stage} ${stage === 'dark' ? styles.stageDark : ''}`}
        style={{ width: canvasWidth ? `${canvasWidth}px` : '100%' }}
      >
        <div
          className={styles.stageInner}
          style={isFill && aspect ? { aspectRatio: aspect } : undefined}
        >
          {/* key remounts the real component so one-shot sequences replay */}
          <div key={replayKey} className={styles.mountPoint} data-sizing={sizing}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
