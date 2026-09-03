/**
 * Scroll harness — DEV ONLY. The OUTER, scaled presentation of a scroll entry.
 *
 * Separates LOGICAL SCROLL LAYOUT from VISUAL PRESENTATION SCALE:
 *
 *  - Logical layer: a same-origin iframe sized to the preset's logical viewport
 *    (e.g. 1440×900). It loads this same lab route with `?frame=1`, which
 *    renders only ScrollFrame + the real production section. Inside it the
 *    section sees a real 1440px window: `window.innerWidth`, matchMedia, `svh`,
 *    the 1178px content column, the `@container (min-width: 900px)` desktop
 *    geometry, and GSAP ScrollTrigger's `position: fixed` pin against its own
 *    default scroller. All measurements are self-consistent because they all
 *    live in the same unscaled document.
 *
 *  - Presentation layer: FittedStage scales the iframe ELEMENT uniformly
 *    (scale = min(1, availableWidth / logicalWidth)) and reserves the scaled
 *    footprint, so the whole logical viewport is visible in the centre column
 *    with the sidebar left and the DialKit panel right. A transform on the
 *    iframe element is invisible to the document inside it — fixed positioning
 *    in the inner document is relative to the inner viewport, not to any
 *    ancestor of the iframe. The production section is never transformed.
 *
 * Why not transform-scale the section in place: a transformed ancestor becomes
 * the containing block for `position: fixed`, so the pin would stick to the
 * wrapper and scroll away; and with `pinType: "transform"` (which would also be
 * a production change) the pin's translateY is applied in unscaled px inside a
 * scaled context, so the section drifts at (1 − scale) per scrolled px. `zoom`
 * mixes zoomed getBoundingClientRect values with unzoomed CSS px in
 * ScrollTrigger's maths. None of these can be made correct from src/dev.
 *
 * Replay remounts the iframe via `key`, which reloads the inner document and
 * restarts the sequence from its real starting position.
 *
 * Known limitation: DialKit panels live in this outer document and cannot reach
 * components inside the frame. Tuning is wired on isolated entries.
 */
import { useState } from 'react';
import styles from '../MotionLab.module.css';
import { FittedStage } from './FittedStage';

export type LogicalViewport = { width: number; height: number };

type ScrollHarnessProps = {
  replayKey: number;
  entryId: string;
  viewport: LogicalViewport;
};

type Fit = { scale: number; available: number; logical: number };

export function frameSrc(entryId: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('entry', entryId);
  url.searchParams.set('frame', '1');
  return url.toString();
}

export function ScrollHarness({ replayKey, entryId, viewport }: ScrollHarnessProps) {
  const [fit, setFit] = useState<Fit | null>(null);

  return (
    <div className={styles.hoverGutter}>
      <FittedStage
        logicalWidth={viewport.width}
        logicalHeight={viewport.height}
        onFit={setFit}
      >
        <div
          className={styles.viewportFrame}
          style={{ width: viewport.width, height: viewport.height }}
        >
          <iframe
            key={replayKey}
            className={styles.viewportIframe}
            src={frameSrc(entryId)}
            title={`${entryId} — logical viewport`}
          />
        </div>
      </FittedStage>
      <p className={styles.fitReadout}>
        viewport{' '}
        <span className={styles.mono}>
          {viewport.width}×{viewport.height}px
        </span>{' '}
        logical
        {fit && fit.scale < 1 ? (
          <>
            {' '}
            · shown at <span className={styles.mono}>{fit.scale.toFixed(3)}×</span> to fit{' '}
            <span className={styles.mono}>{Math.round(fit.available)}px</span>
          </>
        ) : (
          <> · shown at <span className={styles.mono}>1.000×</span></>
        )}{' '}
        — <span className={styles.mono}>innerWidth</span>, matchMedia,{' '}
        <span className={styles.mono}>svh</span> and the ScrollTrigger pin all resolve inside
        this viewport. Scroll with the pointer over the stage.
      </p>
    </div>
  );
}
