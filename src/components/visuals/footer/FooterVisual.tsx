import { useEffect, useRef } from 'react';
import activePattern from '../../../assets/key-visuals/footer/footer-active-pattern.png';
import gateLeftClosed from '../../../assets/key-visuals/footer/footer-gate-left.svg';
import gateRightClosed from '../../../assets/key-visuals/footer/footer-gate-right.svg';
import gateLeftOpen from '../../../assets/key-visuals/footer/footer-gate-left-open.svg';
import gateRightOpen from '../../../assets/key-visuals/footer/footer-gate-right-open.svg';
import { BeamSymbol } from './BeamSymbol';
import styles from './FooterVisual.module.css';

export function FooterVisual() {
  const rootRef = useRef<HTMLElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<HTMLButtonElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const centerTile = centerRef.current;
    const patternCanvas = patternCanvasRef.current;
    const interactionZone = interactionRef.current;
    const footerPulse = pulseRef.current;
    if (!root || !centerTile || !patternCanvas || !interactionZone || !footerPulse) {
      return;
    }

    const patternContext = patternCanvas.getContext('2d');
    if (!patternContext) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let visible = false;
    let touchCloseTimer: number | null = null;
    let sparkleReleaseTimer: number | null = null;
    let pulseScaleAnimation: Animation | null = null;
    let pulseOpacityAnimation: Animation | null = null;
    let pulseExitAnimation: Animation | null = null;
    let lastFrame = performance.now();
    const started = lastFrame;
    const interaction = {
      strength: 0,
      targetStrength: 0,
    };
    let seed = 0x42ea91;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const patternDots: Array<{
      x: number;
      y: number;
      size: number;
      phase: number;
      speed: number;
      falloff: number;
    }> = [];

    for (let y = 4; y < 339; y += 6) {
      for (let x = 4; x < 848; x += 6) {
        if (random() < 0.68) continue;

        const horizontalDistance = Math.abs(x - 426) / 360;
        const verticalDistance = Math.abs(y - 171.5) / 170;
        const falloff = Math.max(
          0,
          1 - Math.pow(horizontalDistance, 1.7) - Math.pow(verticalDistance, 2.1),
        );
        if (falloff <= 0) continue;

        patternDots.push({
          x,
          y,
          size: random() > 0.86 ? 2 : 1,
          phase: random() * Math.PI * 2,
          speed: 0.0012 + random() * 0.0028,
          falloff,
        });
      }
    }

    const draw = (now: number) => {
      animationFrame = 0;
      if (!visible || reducedMotion.matches) return;

      const frameScale = Math.min(3, (now - lastFrame) / 16.667);
      lastFrame = now;
      const ease = 1 - Math.pow(0.84, frameScale);
      interaction.strength +=
        (interaction.targetStrength - interaction.strength) * ease;

      const elapsed = now - started;
      const centerPulse = 0.5 + Math.sin(elapsed / 1450) * 0.5;

      const centerScale = 1 + centerPulse * 0.006 + interaction.strength * 0.012;
      centerTile.style.transform = `translate(-50%, -50%) scale(${centerScale.toFixed(4)})`;

      patternContext.clearRect(0, 0, 852, 343);
      if (interaction.strength > 0.01) {
        for (const dot of patternDots) {
          const signal =
            Math.sin(now * dot.speed + dot.phase) * 0.62 +
            Math.sin(now * dot.speed * 0.41 + dot.phase * 1.73) * 0.38;
          const sparkle = Math.max(0, (signal - 0.18) / 0.82);
          const alpha =
            (0.025 + sparkle * sparkle * 0.42) *
            dot.falloff *
            interaction.strength;

          if (alpha < 0.012) continue;
          patternContext.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          patternContext.fillRect(dot.x, dot.y, dot.size, dot.size);
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    const clearPulseAnimations = () => {
      pulseScaleAnimation?.cancel();
      pulseOpacityAnimation?.cancel();
      pulseExitAnimation?.cancel();
      pulseScaleAnimation = null;
      pulseOpacityAnimation = null;
      pulseExitAnimation = null;
    };

    const resetPulse = () => {
      footerPulse.style.removeProperty('opacity');
      footerPulse.style.removeProperty('transform');
    };

    const startPulse = () => {
      const computed = window.getComputedStyle(footerPulse);
      const currentOpacity = Number.parseFloat(computed.opacity) || 0;
      const currentTransform = computed.transform === 'none' ? 'scale(0.08)' : computed.transform;
      const isInterrupted = currentOpacity > 0.01;

      clearPulseAnimations();
      footerPulse.style.opacity = String(currentOpacity);
      footerPulse.style.transform = currentTransform;

      const delay = isInterrupted ? 0 : 380;
      const duration = isInterrupted ? 1180 : 1500;

      pulseScaleAnimation = footerPulse.animate(
        [
          { transform: currentTransform },
          { transform: 'scale(1.28)' },
        ],
        {
          duration,
          delay,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
          fill: 'forwards',
        },
      );

      pulseOpacityAnimation = footerPulse.animate(
        [
          { opacity: currentOpacity, offset: 0 },
          { opacity: 0.5, offset: 0.24 },
          { opacity: 0.2, offset: 0.58 },
          { opacity: 0.04, offset: 0.82 },
          { opacity: 0, offset: 1 },
        ],
        { duration, delay, easing: 'linear', fill: 'forwards' },
      );

      const activeScaleAnimation = pulseScaleAnimation;
      activeScaleAnimation.onfinish = () => {
        if (pulseScaleAnimation !== activeScaleAnimation) return;
        clearPulseAnimations();
        resetPulse();
      };
    };

    const finishPulse = () => {
      const computed = window.getComputedStyle(footerPulse);
      const currentOpacity = Number.parseFloat(computed.opacity) || 0;
      const currentTransform = computed.transform === 'none' ? 'scale(0.08)' : computed.transform;
      const matrix = new DOMMatrixReadOnly(currentTransform);
      const currentScale = Math.hypot(matrix.a, matrix.b);
      const exitScale = Math.min(1.36, currentScale + 0.16);

      clearPulseAnimations();
      footerPulse.style.opacity = String(currentOpacity);
      footerPulse.style.transform = currentTransform;

      if (currentOpacity <= 0.01) {
        resetPulse();
        return;
      }

      pulseExitAnimation = footerPulse.animate(
        [
          { opacity: currentOpacity, transform: currentTransform },
          { opacity: 0, transform: `scale(${exitScale})` },
        ],
        {
          duration: 360,
          easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
          fill: 'forwards',
        },
      );

      const activeExitAnimation = pulseExitAnimation;
      activeExitAnimation.onfinish = () => {
        if (pulseExitAnimation !== activeExitAnimation) return;
        clearPulseAnimations();
        resetPulse();
      };
    };

    const resetInteraction = () => {
      if (root.dataset.hover !== 'true') return;
      delete root.dataset.hover;
      finishPulse();
      if (sparkleReleaseTimer !== null) window.clearTimeout(sparkleReleaseTimer);
      sparkleReleaseTimer = window.setTimeout(() => {
        sparkleReleaseTimer = null;
        interaction.targetStrength = 0;
      }, 820);
    };

    const activateInteraction = () => {
      if (sparkleReleaseTimer !== null) {
        window.clearTimeout(sparkleReleaseTimer);
        sparkleReleaseTimer = null;
      }
      interaction.targetStrength = 1;
      delete root.dataset.hover;
      void root.offsetWidth;
      root.dataset.hover = 'true';
      startPulse();
    };

    const startInteraction = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      activateInteraction();
    };

    const endInteraction = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      resetInteraction();
    };

    const playTouchInteraction = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || reducedMotion.matches) return;
      if (touchCloseTimer !== null) window.clearTimeout(touchCloseTimer);
      activateInteraction();
      touchCloseTimer = window.setTimeout(() => {
        touchCloseTimer = null;
        resetInteraction();
      }, 2600);
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
    root.addEventListener('pointerleave', endInteraction);
    interactionZone.addEventListener('pointerenter', startInteraction);
    interactionZone.addEventListener('pointerleave', endInteraction);
    interactionZone.addEventListener('pointerup', playTouchInteraction);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (touchCloseTimer !== null) window.clearTimeout(touchCloseTimer);
      if (sparkleReleaseTimer !== null) window.clearTimeout(sparkleReleaseTimer);
      clearPulseAnimations();
      resetPulse();
      intersectionObserver.disconnect();
      root.removeEventListener('pointerleave', endInteraction);
      interactionZone.removeEventListener('pointerenter', startInteraction);
      interactionZone.removeEventListener('pointerleave', endInteraction);
      interactionZone.removeEventListener('pointerup', playTouchInteraction);
      delete root.dataset.hover;
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className={styles.footerVisual}
      aria-label="Interactive Beam footer key visual"
    >
      <div className={styles.activeField} aria-hidden="true">
        <img
          className={styles.activePattern}
          src={activePattern}
          alt=""
          draggable="false"
          width={852}
          height={343}
        />
        <canvas
          ref={patternCanvasRef}
          className={styles.randomPattern}
          width={852}
          height={343}
        />
      </div>

      <div className={styles.gates} aria-hidden="true">
        <span className={`${styles.gate} ${styles.gateLeft}`}>
          <img className={styles.gateClosed} src={gateLeftClosed} alt="" />
          <img className={styles.gateOpen} src={gateLeftOpen} alt="" />
        </span>
        <span className={`${styles.gate} ${styles.gateRight}`}>
          <img className={styles.gateClosed} src={gateRightClosed} alt="" />
          <img className={styles.gateOpen} src={gateRightOpen} alt="" />
        </span>
      </div>

      <span ref={pulseRef} className={styles.footerPulse} aria-hidden="true" />

      <span className={styles.centerLine} aria-hidden="true" />
      <div className={styles.centerGlow} aria-hidden="true" />
      <div className={styles.activeTileShadow} aria-hidden="true" />

      <div ref={centerRef} className={styles.centerTile} aria-hidden="true">
        <span className={styles.tileHighlight} />
        <span className={styles.tileEdge} />
        <BeamSymbol
          className={styles.activeSymbol}
          variant="metal"
        />
      </div>

      <button
        ref={interactionRef}
        type="button"
        className={styles.interactionZone}
        aria-label="Play Beam icon animation"
      />
    </section>
  );
}
