/**
 * Isolated harness — DEV ONLY.
 *
 * Renders a real production visual on a plain stage at a predictable size,
 * with room around it so the pointer can enter and leave naturally (production
 * hover behaviour is preserved as-is; nothing is faked or re-implemented here).
 *
 * Replay is a harness-level remount via `key`. No production animation logic is
 * touched to make this work.
 */
import type { ReactNode } from 'react';
import styles from '../MotionLab.module.css';
import type { StageTheme } from '../registry';

type IsolatedHarnessProps = {
  /** Bumped by the lab to force a remount of the production subtree. */
  replayKey: number;
  width: number | null;
  stage?: StageTheme;
  aspect?: string;
  children: ReactNode;
};

export function IsolatedHarness({
  replayKey,
  width,
  stage = 'light',
  aspect,
  children,
}: IsolatedHarnessProps) {
  return (
    <div className={styles.hoverGutter}>
      <div
        className={`${styles.stage} ${stage === 'dark' ? styles.stageDark : ''}`}
        style={{ width: width ? `${width}px` : '100%' }}
      >
        <div className={styles.stageInner} style={aspect ? { aspectRatio: aspect } : undefined}>
          {/* key remounts the real component so one-shot sequences replay */}
          <div key={replayKey} className={styles.mountPoint}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
