/**
 * The hero reveal, in the hero's real container.
 *
 * Controlled by `time` in ms — see heroRevealTimeline. Rendering is a pure
 * function of that, so the same component serves playback, pause and scrub.
 *
 * SIZING. The container width still comes from production: the wrapper carries
 * the Hero section's own width classes, and this component keeps importing
 * HeroVisual.module.css so the surrounding box, the fade and the canvas layer
 * are single-sourced with the shipping hero.
 *
 * What it no longer inherits is the production stylesheet's *framing*. The
 * shipping rules pick the visible slice of the 1440x540 canvas three different
 * ways (full canvas, a centred tablet crop, and a fixed 1:1 `translateX(-112px)`
 * below 640), and the last of those was composed for the static hero's
 * left-hand file list — it frames canvas x 112..487, while this sequence's
 * payload lives at 201..1238. So the framing is computed here instead, by
 * `heroComposition`, which reproduces the production rectangle exactly at >=744
 * and replaces only the sub-640 crop. See heroRevealComposition.ts.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import visual from '../HeroVisual.module.css';
import { HeroCanvas } from './HeroCanvas';
import {
  HERO_REVEAL_DEFAULTS,
  sampleHeroReveal,
  type HeroRevealTuning,
} from './heroRevealTimeline';
import {
  HERO_MOBILE_WORKSPACE_WINDOW,
  HERO_RESPONSIVE_DEFAULTS,
  heroBreakpoint,
  heroComposition,
  heroCompositionTranslateX,
  heroCompositionTranslateY,
  heroFilesScale,
  heroMobileWorkspaceFraming,
  heroPointerScale,
  heroUploadOffset,
  heroVisualScale,
  resolveHeroRevealTuning,
  type HeroResponsiveTuning,
} from './heroRevealComposition';

export function HeroRevealSequence({
  time,
  tuning = HERO_REVEAL_DEFAULTS,
  responsive = HERO_RESPONSIVE_DEFAULTS,
  viewportWidth: viewportWidthOverride,
}: {
  time: number;
  /** Motion Lab only. Absent everywhere else, so the shipped sequence runs. */
  tuning?: HeroRevealTuning;
  /** Motion Lab only. Per-breakpoint positions and the mobile composition. */
  responsive?: HeroResponsiveTuning;
  /**
   * Motion Lab only — the LOGICAL viewport width to resolve the band from.
   *
   * The lab's viewport presets resize the preview container but leave
   * `window.innerWidth` reporting the real browser window, so without this the
   * reveal renders its DESKTOP band inside a "Tablet 834" stage and every
   * tablet/mobile dial looks dead. On the homepage this is omitted and the real
   * window is used, which is the only correct source there.
   */
  viewportWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  /* An explicit logical width wins; otherwise the real window decides. */
  const viewportWidth = viewportWidthOverride ?? windowWidth;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      /*
       * offsetWidth, not getBoundingClientRect().width: the rect is the width
       * AFTER any ancestor transform, and Motion Lab scales its stage to fit
       * the column. Measuring the rect there would fold that scale into this
       * one and render the canvas twice-scaled. offsetWidth is the layout
       * width, which is what the framing maths wants, and on the homepage
       * (no scaled ancestor) the two are identical.
       */
      setContainerWidth(node.offsetWidth);
      setWindowWidth(window.innerWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    /*
     * The breakpoint is a function of window.innerWidth, not of the container:
     * between 744 and 1199 the container is pinned at 680px and never changes,
     * so a ResizeObserver alone would not see the band change.
     */
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
    /*
     * Re-measure when the LOGICAL viewport changes, not just the real one. A
     * Motion Lab preset resizes the container without any window resize, and
     * the ResizeObserver was not firing for that change — which left the canvas
     * drawn at the previous preset's scale while the framing was already
     * correct. Depending on the override makes the measurement follow it.
     */
  }, [viewportWidthOverride]);

  const composition = heroComposition(viewportWidth, responsive);
  const breakpoint = heroBreakpoint(viewportWidth);
  /* Whole-composition shift, screen px, outermost in the transform below. */
  const translateX = heroCompositionTranslateX(viewportWidth, responsive);
  const translateY = heroCompositionTranslateY(viewportWidth, responsive);
  /* Hand-only and files-only sizes for this band; 1 draws the authored art. */
  const pointerScale = heroPointerScale(viewportWidth, responsive);
  const filesScale = heroFilesScale(viewportWidth, responsive);
  /* Upload-panel-only offset for this band, canvas px; 0/0 is the authored place. */
  const uploadOffset = heroUploadOffset(viewportWidth, responsive);
  const measured = containerWidth > 0;
  /* Fit the framed rectangle to the container, then enlarge per band. */
  const scale = measured
    ? (containerWidth / composition.width) * heroVisualScale(viewportWidth, responsive)
    : 1;

  const resolved = resolveHeroRevealTuning(tuning, responsive, breakpoint, composition);

  /*
   * MOBILE ONLY: ONE SHELL, three contents.
   *
   * The panel shell — frame, inner panel, washes, and the workspace inside it
   * — is drawn at the canonical My Beam geometry for EVERY state: canvas at
   * 1:1, window at canvas x 112 at the container's width, 344px box clipped
   * vertically, fade from 133px (HERO_MOBILE_WORKSPACE_WINDOW). It never
   * scales, moves or resizes, so the drag / drop, upload and resolved states
   * share exactly one outer panel and the handoff is content-only: the upload
   * panel fades and blurs out on its own curve, then the workspace fades in on
   * its own, both inside the same shell, exactly as desktop and tablet do.
   *
   * The band's tuned composition — framing, Visual Position, Visual Scale,
   * Frame Window / Zoom — no longer frames the canvas; it places the SCENE
   * CONTENT (files, hand, dashed target, upload panel) inside the shell. The
   * mapping below reproduces, in canvas space, the exact on-screen placement
   * the old whole-canvas framing gave that content, so every existing mobile
   * dial value keeps producing the same picture it did:
   *
   *   old screen x = tx + s * (p - x0)         (whole canvas framed and scaled)
   *   new screen x = (c + s * p) - windowX     (shell at 1:1, content mapped)
   *   => c = tx + windowX - s * x0             (and likewise for y)
   *
   * Desktop and tablet never enter this branch and render as before.
   */
  const mobile = breakpoint === 'mobile';
  const frameRect = mobile ? heroMobileWorkspaceFraming(containerWidth) : composition;
  const drawScale = mobile ? 1 : scale;
  const drawTranslateX = mobile ? 0 : translateX;
  const drawTranslateY = mobile ? 0 : translateY;
  const boxHeight = mobile ? HERO_MOBILE_WORKSPACE_WINDOW.height : composition.height * scale;
  const bottomWash = mobile
    ? { top: HERO_MOBILE_WORKSPACE_WINDOW.fadeTop, height: HERO_MOBILE_WORKSPACE_WINDOW.fadeHeight }
    : undefined;
  const contentTransform =
    mobile && measured
      ? {
          x: translateX + HERO_MOBILE_WORKSPACE_WINDOW.canvasX - scale * composition.x,
          y: translateY - scale * composition.y,
          scale,
        }
      : undefined;
  const frame = sampleHeroReveal(time, resolved);

  return (
    <div
      ref={ref}
      className={visual.visual}
      role="group"
      aria-label="Interactive Beam file manager demo"
      style={
        measured
          ? {
              /*
               * Height follows the framed rectangle so nothing is ever cut off
               * the bottom. At >=744 this reproduces the stylesheet's own
               * aspect-ratio result exactly (1454 -> 545.25, 680 -> 315.31).
               */
              height: boxHeight,
              aspectRatio: 'auto',
              /*
               * The 1:1 mobile window is shorter than the canvas it looks
               * through, so the box clips vertically (the old wrapper's
               * overflow-hidden did the same). Horizontal overflow stays
               * visible, cut at the viewport by <main>, as the tuned mobile
               * composition already relies on.
               */
              overflowY: mobile ? 'clip' : undefined,
            }
          : undefined
      }
    >
      <div
        className={visual.canvas}
        style={{
          left: 0,
          transformOrigin: 'top left',
          /*
           * Right-to-left: frame the canvas (translate in canvas px), scale it
           * to the container, then move the finished result on screen. The
           * leading translate is therefore in SCREEN px and moves everything
           * — panel, dropzone, copy, upload panel, washes, workspace — as one.
           * With no vertical shift it stays the single-axis form, so a band
           * that has not tuned Y renders the identical transform it always did.
           */
          transform: `${
            drawTranslateY === 0
              ? `translateX(${drawTranslateX}px)`
              : `translate(${drawTranslateX}px, ${drawTranslateY}px)`
          } scale(${drawScale}) translate(${-frameRect.x}px, ${-frameRect.y}px)`,
        }}
      >
        <HeroCanvas
          frame={frame}
          tuning={resolved}
          bottomWash={bottomWash}
          /* The reveal's band is the one responsive source of truth, so the
           * workspace's layout follows the LOGICAL viewport — a Motion Lab
           * mobile preset inside a desktop window gets the mobile workspace. */
          workspaceLayout={mobile ? 'mobile' : 'desktop'}
          contentTransform={contentTransform}
          uploadOffset={uploadOffset}
          pointerScale={pointerScale}
          filesScale={filesScale}
        />
      </div>
    </div>
  );
}
