/**
 * Reduced-motion status — DEV ONLY, inspection only.
 *
 * Reports what the browser currently says about `prefers-reduced-motion`.
 * It does NOT override the OS preference and does not touch any production
 * reduced-motion implementation.
 */
import { useEffect, useState } from 'react';
import styles from '../MotionLab.module.css';

const QUERY = '(prefers-reduced-motion: reduce)';

export function ReducedMotionStatus() {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener('change', onChange);
    setReduced(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className={styles.statusRow}>
      <span className={styles.statusLabel}>prefers-reduced-motion</span>
      <span className={reduced ? styles.statusOn : styles.statusOff}>
        {reduced ? 'reduce' : 'no-preference'}
      </span>
      <span className={styles.statusHint}>
        {reduced
          ? 'Reduced-motion variants are active. Production behaviour is unmodified.'
          : 'Set it at OS level (or emulate in DevTools → Rendering) to inspect the reduced variant.'}
      </span>
    </div>
  );
}
