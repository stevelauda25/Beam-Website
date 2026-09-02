/**
 * Scroll harness — DEV ONLY.
 *
 * Renders the REAL production section and lets it drive off real window scroll.
 * Beam's scroll sections use GSAP ScrollTrigger against the default scroller
 * (the window), so the only honest way to isolate them is to put the real
 * section alone on a scrolling page with spacers before and after — which is
 * exactly what this does. Nothing about the pin, scrub or snap is simulated.
 *
 * Deliberately NOT done: wrapping the section in an inner scroll container.
 * That would require passing a `scroller` option into production ScrollTrigger
 * config, i.e. changing production code to suit the lab. Out of scope.
 *
 * Known limitation: because these sections read `window.innerWidth` (and
 * matchMedia) rather than their container, the lab's width presets do NOT
 * change their breakpoint behaviour. The lab surfaces that warning in the UI.
 */
import { useEffect, type ReactNode } from 'react';
import styles from '../MotionLab.module.css';

type ScrollHarnessProps = {
  replayKey: number;
  children: ReactNode;
};

export function ScrollHarness({ replayKey, children }: ScrollHarnessProps) {
  // Scroll to the top whenever the harness remounts so the sequence is watched
  // from its real starting position rather than mid-pin.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [replayKey]);

  return (
    <div key={replayKey} className={styles.scrollHarness}>
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
