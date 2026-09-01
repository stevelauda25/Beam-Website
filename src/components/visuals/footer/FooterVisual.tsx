import { useEffect, useRef } from 'react';
import { BeamSymbol } from './BeamSymbol';
import styles from './FooterVisual.module.css';

const ARTWORK_WIDTH = 1460;
const ARTWORK_HEIGHT = 292;
const CENTER_X = 720;
const CENTER_Y = 154;

const symbolRows = [
  { y: 47, xs: [272, 384, 496, 608, 720, 832, 944, 1056, 1168] },
  { y: 155, xs: [160, 272, 384, 496, 608, 720, 832, 944, 1056, 1168, 1280, 1392] },
  { y: 264, xs: [272, 384, 496, 608, 720, 832, 944, 1056, 1168] },
] as const;

function baseOpacity(x: number, y: number) {
  const nx = (x - CENTER_X) / 790;
  const ny = (y - CENTER_Y) / 175;
  return 0.012 + Math.exp(-(nx * nx + ny * ny) * 1.45) * 0.032;
}

export function FooterVisual() {
  const rootRef = useRef<HTMLElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const centerTile = centerRef.current;
    const glow = glowRef.current;
    if (!root || !centerTile || !glow) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const symbols = Array.from(
      root.querySelectorAll<HTMLElement>('[data-symbol]'),
    );
    let animationFrame = 0;
    let visible = false;
    let lastFrame = performance.now();
    const started = lastFrame;
    const pointer = {
      x: CENTER_X,
      y: CENTER_Y,
      targetX: CENTER_X,
      targetY: CENTER_Y,
      strength: 0,
      targetStrength: 0,
    };

    const draw = (now: number) => {
      animationFrame = 0;
      if (!visible || reducedMotion.matches) return;

      const frameScale = Math.min(3, (now - lastFrame) / 16.667);
      lastFrame = now;
      const ease = 1 - Math.pow(0.84, frameScale);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      pointer.strength += (pointer.targetStrength - pointer.strength) * ease;

      const elapsed = now - started;
      const breathRadius = ((elapsed % 9000) / 9000) * 860;
      const centerPulse = 0.5 + Math.sin(elapsed / 1450) * 0.5;

      symbols.forEach((symbol) => {
        const x = Number(symbol.dataset.x);
        const y = Number(symbol.dataset.y);
        const distanceFromCenter = Math.hypot(x - CENTER_X, y - CENTER_Y);
        const breath = Math.exp(
          -Math.pow((distanceFromCenter - breathRadius) / 72, 2),
        );
        const opacity = Number(symbol.dataset.baseOpacity) + breath * 0.035;
        symbol.style.opacity = opacity.toFixed(4);
      });

      const centerDistance = Math.hypot(
        pointer.x - CENTER_X,
        pointer.y - CENTER_Y,
      );
      const centerHover =
        Math.exp(-Math.pow(centerDistance / 230, 2)) * pointer.strength;
      const centerShiftX = ((pointer.x - CENTER_X) / 230) * centerHover * 3.5;
      const centerShiftY = ((pointer.y - CENTER_Y) / 230) * centerHover * 3.5;
      const centerScale = 1 + centerPulse * 0.006 + centerHover * 0.018;
      centerTile.style.transform = `translate(-50%, -50%) translate(${centerShiftX.toFixed(2)}px, ${centerShiftY.toFixed(2)}px) scale(${centerScale.toFixed(4)})`;
      glow.style.opacity = String(
        0.48 + centerPulse * 0.12 + centerHover * 0.12,
      );

      animationFrame = window.requestAnimationFrame(draw);
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect();
      pointer.targetX =
        ((event.clientX - bounds.left) / bounds.width) * ARTWORK_WIDTH;
      pointer.targetY =
        ((event.clientY - bounds.top) / bounds.height) * ARTWORK_HEIGHT;
      pointer.targetStrength = event.pointerType === 'mouse' ? 1 : 0.55;
    };

    const pointerLeave = () => {
      pointer.targetX = CENTER_X;
      pointer.targetY = CENTER_Y;
      pointer.targetStrength = 0;
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !animationFrame && !reducedMotion.matches) {
          lastFrame = performance.now();
          animationFrame = window.requestAnimationFrame(draw);
        } else if (!visible && animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      },
      { rootMargin: '120px' },
    );

    intersectionObserver.observe(root);
    root.addEventListener('pointermove', updatePointer);
    root.addEventListener('pointerleave', pointerLeave);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      intersectionObserver.disconnect();
      root.removeEventListener('pointermove', updatePointer);
      root.removeEventListener('pointerleave', pointerLeave);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className={styles.footerVisual}
      aria-label="Interactive Beam footer key visual"
    >
      <div ref={glowRef} className={styles.centerGlow} aria-hidden="true" />

      <div className={styles.symbolField} aria-hidden="true">
        {symbolRows.flatMap((row) =>
          row.xs.map((x) => {
            if (row.y === 155 && x === 720) return null;
            const opacity = baseOpacity(x, row.y);

            return (
              <span
                className={styles.ghostSymbol}
                data-symbol
                data-x={x}
                data-y={row.y}
                data-base-opacity={opacity}
                key={`${x}-${row.y}`}
                style={{
                  left: `${(x / ARTWORK_WIDTH) * 100}%`,
                  top: `${(row.y / ARTWORK_HEIGHT) * 100}%`,
                  opacity,
                }}
              >
                <BeamSymbol variant="outline" />
              </span>
            );
          }),
        )}
      </div>

      <div ref={centerRef} className={styles.centerTile} aria-hidden="true">
        <span className={styles.tileEdge} />
        <BeamSymbol
          className={styles.activeSymbol}
          hoverShineClassName={styles.hoverShineBand}
          shineClassName={styles.shineBand}
          variant="metal"
        />
      </div>
    </section>
  );
}
