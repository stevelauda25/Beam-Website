/**
 * Fitted stage — DEV ONLY.
 *
 * Separates the LOGICAL size of a preview from its VISIBLE size.
 *
 * The child renders at its full logical width (e.g. 1178px, the width of
 * SolutionVisual's parent on the homepage) so that container queries, `cqw`
 * units and grid geometry resolve exactly as they do in production. The stage is
 * then visually scaled with `transform: scale()` to fit the lab's preview column:
 *
 *   scale = min(1, availableWidth / logicalWidth)
 *
 * A transform does not participate in layout, so this wrapper reserves the
 * SCALED box explicitly (otherwise the page would keep the unscaled footprint
 * and the stage would overflow). Both the available width and the child's
 * natural size are tracked with a ResizeObserver so the fit follows the browser,
 * the DialKit panel and the child's own height.
 *
 * Nothing is clipped and nothing scrolls sideways. When the stage already fits,
 * the scale is exactly 1 and this wrapper is transparent.
 *
 * Do NOT use this around a GSAP ScrollTrigger-pinned section: a transformed
 * ancestor becomes the containing block for `position: fixed`, which breaks the
 * pin. The scroll harness has its own strategy — see ScrollHarness.tsx.
 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from '../MotionLab.module.css';

type NaturalSize = { width: number; height: number };

type FittedStageProps = {
  children: ReactNode;
  /**
   * The logical width the harness intends for the stage. Only used as a
   * re-measure trigger: switching viewport preset relays out the canvas, and the
   * fit must follow synchronously rather than wait for observer delivery.
   */
  logicalWidth: number;
  /** Optional second re-measure trigger (scroll viewports also set a height). */
  logicalHeight?: number;
  /** Called whenever the fit changes, so the harness can show a readout. */
  onFit?: (fit: { scale: number; available: number; logical: number }) => void;
};

export function FittedStage({
  children,
  logicalWidth,
  logicalHeight,
  onFit,
}: FittedStageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [natural, setNatural] = useState<NaturalSize | null>(null);

  // Layout (unscaled) sizes. offsetWidth/offsetHeight ignore transforms, which
  // is exactly what we want — the natural size must not feed back the scale.
  const measure = useCallback(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    setAvailable(frame.clientWidth);
    setNatural({ width: canvas.offsetWidth, height: canvas.offsetHeight });
  }, []);

  // Preset change → the canvas has a new logical width this very commit.
  useLayoutEffect(measure, [measure, logicalWidth, logicalHeight]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(canvas);
    // ResizeObserver only delivers on a rendering opportunity, so a tab that
    // starts hidden (0×0 viewport) reports 0 until it is shown; the resize
    // fallback keeps the readout honest the moment the window changes.
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // A 0 available width means "not laid out yet" (hidden tab), never "scale to
  // nothing": fall back to the unscaled stage until a real width arrives.
  const ready =
    available !== null && available > 0 && natural !== null && natural.width > 0;
  const scale = ready ? Math.min(1, available / natural.width) : 1;

  useLayoutEffect(() => {
    if (ready && onFit) onFit({ scale, available, logical: natural.width });
  }, [ready, scale, available, natural, onFit]);

  return (
    <div ref={frameRef} className={styles.fitFrame}>
      <div
        className={styles.fitReserve}
        style={
          ready
            ? { width: natural.width * scale, height: natural.height * scale }
            : undefined
        }
      >
        <div
          ref={canvasRef}
          className={styles.fitCanvas}
          style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
