/**
 * Scroll frame — DEV ONLY. The INNER document of a scroll entry.
 *
 * Rendered when the lab is loaded with `?frame=1`, i.e. inside the iframe that
 * ScrollHarness scales into the authoring column. This document IS the logical
 * desktop viewport: `window.innerWidth`, matchMedia, `svh`, ScrollTrigger's
 * default scroller and its `position: fixed` pin all resolve against it, so the
 * real production section runs here exactly as on the homepage. Nothing about
 * the pin, scrub or transition is simulated, and no ancestor of the section
 * carries a transform.
 *
 * Deliberately NOT done: wrapping the section in an inner scroll container.
 * That would require passing a `scroller` option into production ScrollTrigger
 * config, i.e. changing production code to suit the lab. Out of scope.
 */
import { useEffect, type ReactNode } from 'react';
import styles from '../MotionLab.module.css';

export function ScrollFrame({ children }: { children: ReactNode }) {
  // Start from the real starting position rather than a restored mid-pin scroll.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className={styles.scrollHarness}>
      <div className={styles.scrollSpacer}>
        <span>scroll down — section entry</span>
      </div>

      {/* The real production section, driven by real window scroll. */}
      {children}

      <div className={styles.scrollSpacer}>
        <span>section exit — pin released</span>
      </div>
    </div>
  );
}
