/**
 * Hero reveal — responsive composition.
 *
 * ONE timeline, one state machine. Nothing here touches `sampleHeroReveal`:
 * this module decides only WHICH RECTANGLE OF THE 1440x540 AUTHORING CANVAS is
 * framed by the container, and resolves the handful of position dials that have
 * to follow that frame. Everything else — every span, easing, opacity and
 * progress curve — stays global.
 *
 * WHY A COMPOSITION AND NOT A CROP
 * The shipping hero's sub-640 rule renders the canvas at 1:1 with a fixed
 * `translateX(-112px)`, which frames canvas x 112..487 at 375px wide. That
 * window was chosen for the STATIC hero's left-hand file list. The reveal's
 * content sits in the middle and right of the canvas — upload panel 436..1004,
 * instruction copy 605..834, dashed target 201..1238 — so the authored crop
 * points at the emptiest part of the sequence and hides its whole payload.
 * Below 640 the reveal therefore frames the panel instead, and fits it.
 *
 * CONTINUITY
 * The framing is one continuous function of viewport width, so the two hard
 * seams the audit found are gone:
 *
 *   <=430   frame = the panel exactly            x 132.00  w 1176.00
 *   430-640 ramp panel -> full canvas
 *   640     frame = the full canvas              x   0.00  w 1440.00
 *   640-744 ramp full canvas -> tablet window
 *   744+    frame = the inner panel (production) x 137.72  w 1164.56
 *   1200+   frame = the full canvas (production) x   0.00  w 1440.00
 *
 * At 639/640 the two models meet at the same rectangle, so the scale step is
 * 0.07%. At 743/744 the framing is already the tablet window, so the only
 * remaining step is the container's own 743px -> 680px width change, which is
 * production's (`Hero.tsx` `min-[744px]:w-[680px]`) and is not the reveal's to
 * change.
 *
 * DESKTOP AND TABLET ARE UNCHANGED BY CONSTRUCTION
 * `heroComposition` returns the full canvas at >=1200 and the inner-panel window
 * at 744..1199 — the exact rectangles the production stylesheet produces today,
 * so those two bands render identically to before.
 */
import {
  HERO_CANVAS,
  HERO_DROP_CENTRE_OFFSET,
  HERO_DROP_LEFT_OFFSET,
  HERO_PANEL,
} from './heroRevealScenes';
import type { HeroRevealTuning } from './heroRevealTimeline';

export type HeroBreakpoint = 'desktop' | 'tablet' | 'mobile';

export type HeroCompositionRect = {
  /** Left edge of the framed rectangle, in canvas px. */
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Production's own breakpoints, restated so the reveal cannot drift from them. */
export const HERO_MOBILE_MAX = 639;
export const HERO_FLUID_MIN = 640;
export const HERO_TABLET_MIN = 744;
export const HERO_DESKTOP_MIN = 1200;

/**
 * At or below this width the framing is the panel and nothing else — the
 * tightest legible composition. Above it the frame widens back out to the full
 * canvas so it can meet the fluid band at 640 without a step.
 */
export const HERO_MOBILE_TIGHT_MAX = 430;

/**
 * THE RESOLVED WORKSPACE ON MOBILE — the pre-reveal presentation, restored.
 *
 * Below 640 the shipping hero that preceded the reveal (HeroVisual.tsx +
 * HeroVisual.module.css, still in the tree, no longer rendered) did not scale
 * the workspace at all: the 1440-wide canvas was drawn at 1:1, slid left by
 * 112px, in a 344px-tall window, with the bottom fade moved up to start at
 * 133px. Together with HeroWorkspaceDemo's own `@media (max-width: 639px)`
 * rule (sidebar hidden, content full-width) that put "My Beam", the Name
 * header and the folder rows at full size at the top of the window.
 *
 * The reveal's mobile composition frames the whole panel and scales it to
 * ~0.36 instead — right for the approach / drop / upload scenes, whose
 * payload sits mid-canvas, but it left the RESOLVED workspace at a third of
 * its size. So the sequence keeps its composition for every scene and, across
 * the existing workspace-handoff window, moves the framing to this window.
 *
 * These are the previous wrapper's numbers, verified against a live render of
 * commit d72c625 at 390px: breadcrumb 19px from the top, header row at 49px,
 * folder rows at 74 / 98 / 122px, fade from 133px. Canvas px; at 1:1 they
 * are screen px too. Not a dial: the mobile placement dials shape the reveal
 * composition, and this window is the fixed destination it resolves into.
 */
export const HERO_MOBILE_WORKSPACE_WINDOW = {
  /** Left edge of the visible window on the canvas (the old translateX(-112px)). */
  canvasX: 112,
  /** Height of the visible window, screen px. */
  height: 344,
  /** The bottom fade, re-anchored for the short window (canvas / screen px). */
  fadeTop: 133,
  fadeHeight: 211,
} as const;

/** The 1:1 mobile window as a composition rect — width is the real container. */
export function heroMobileWorkspaceFraming(containerWidth: number): HeroCompositionRect {
  return {
    x: HERO_MOBILE_WORKSPACE_WINDOW.canvasX,
    y: 0,
    width: containerWidth,
    height: HERO_MOBILE_WORKSPACE_WINDOW.height,
  };
}

const FULL_CANVAS: HeroCompositionRect = {
  x: 0,
  y: 0,
  width: HERO_CANVAS.width,
  height: HERO_CANVAS.height,
};

/** The panel's own bounds — the tight mobile framing. */
const PANEL_FRAMING: HeroCompositionRect = {
  x: HERO_PANEL.left,
  y: 0,
  width: HERO_PANEL.width,
  height: HERO_CANVAS.height,
};

/**
 * The tablet window, derived the same way the production stylesheet derives it:
 * `aspect-ratio: 1164.56/540` on a 1440-wide canvas centres the crop, so the
 * inset is half the difference. Measured on the homepage as 137.7..1302.3.
 */
const TABLET_INSET = (HERO_CANVAS.width - HERO_PANEL.innerWidth) / 2;

const TABLET_FRAMING: HeroCompositionRect = {
  x: TABLET_INSET,
  y: 0,
  width: HERO_PANEL.innerWidth,
  height: HERO_CANVAS.height,
};

/** Per-breakpoint position dials. Defaults are the authored desktop values. */
export type HeroBreakpointTuning = {
  stackStartX: number;
  stackStartY: number;
  stackTargetX: number;
  stackTargetY: number;
  handStartX: number;
  handStartY: number;
  handTargetX: number;
  handTargetY: number;
  /** Hand position relative to the stack it is carrying. */
  handOffsetX: number;
  handOffsetY: number;
  /** Where the files drift to once the hand opens. */
  releaseOffsetX: number;
  releaseOffsetY: number;
  pointerExitX: number;
  pointerExitY: number;
};

/**
 * ON-SCREEN PLACEMENT of the whole key visual, per band.
 *
 * These are the "Visual Position X / Y", "Visual Scale", "Pointer Scale" and
 * "Files Scale" dials. Every band — desktop included — owns an independent set,
 * and every default is NEUTRAL (0 / 0 / 1 / 1 / 1), so a band renders exactly
 * as it did before these dials existed until someone moves one.
 */
export type HeroPlacementTuning = {
  /**
   * ROOT COMPOSITION TRANSLATION, in SCREEN px.
   *
   * Applied to the reveal's root canvas element AFTER scaling, so it is a
   * plain on-screen shift of the whole composition: outer frame, inner panel,
   * dashed dropzone, instruction copy, upload panel, washes and the resolved
   * workspace all move by exactly this many pixels. Positive moves everything
   * RIGHT (X) or DOWN (Y). It is not a crop and not a window — the framing
   * rectangle is unchanged; the rendered result is picked up and moved.
   */
  compositionTranslateX: number;
  compositionTranslateY: number;
  /**
   * Multiplier on the fitted scale for this band, so the key visual can be
   * drawn larger than "fit the container". Framing, translation and every
   * release target are unaffected — the finished composition is simply drawn
   * bigger, growing to the right and down from the container's top-left.
   * Anything past the container is no longer clipped by the column; it is cut
   * only at the viewport, as production's <main> does.
   */
  visualScale: number;
  /**
   * Size of the HAND only, scaled about its own hotspot (the centre of the
   * authored cursor frame). The travel path is untouched — only the drawing
   * grows or shrinks around the point that does the carrying.
   */
  pointerScale: number;
  /**
   * Size of the DRAGGABLE FILE STACK only, scaled about the pointer hotspot
   * at the stack's rest position — the point the hand grips. The stack's
   * travel, release drift and lag are applied OUTSIDE this scale, so the path
   * and the release point are the same at every size; only the cards grow.
   */
  filesScale: number;
  /**
   * UPLOAD PANEL position, in canvas px, added to its authored placement
   * (centred in the panel, entrance slide on Y). Moves the Uploading /
   * Uploaded panel only — not the shell, the hand, the files or the
   * workspace — and stays with it through the whole upload phase, so the
   * 100% / "Uploaded" state sits exactly where the progress did.
   */
  uploadOffsetX: number;
  uploadOffsetY: number;
};

/**
 * A horizontal shift of the VISIBLE WINDOW over the canvas.
 *
 * This moves the crop, never the artwork: the hero panel, the dashed dropzone,
 * the instruction copy and the upload panel all stay at their authored canvas
 * positions, and only the rectangle being looked through slides.
 *
 * POSITIVE moves the window RIGHT over the canvas, so the viewport shows a more
 * rightward portion of the panel and everything on screen shifts LEFT.
 * NEGATIVE slides the window left, so the panel's content shifts RIGHT on
 * screen and its left edge moves toward the middle of the viewport.
 *
 * Desktop has none: its framing is the full canvas. (Desktop placement is
 * tunable through HeroPlacementTuning instead, which moves the rendered
 * result rather than the crop.)
 */
export type HeroFramingTuning = {
  framingOffsetX: number;
};

/** Mobile alone can reframe: a zoom about the frame's centre, plus a nudge. */
export type HeroMobileComposition = {
  /** >1 zooms in (narrower frame, larger type, panel edges start to leave). */
  compositionScale: number;
  compositionOffsetX: number;
  compositionOffsetY: number;
};

export type HeroResponsiveTuning = {
  desktop: HeroBreakpointTuning & HeroPlacementTuning;
  tablet: HeroBreakpointTuning & HeroPlacementTuning & HeroFramingTuning;
  mobile: HeroBreakpointTuning &
    HeroPlacementTuning &
    HeroMobileComposition &
    HeroFramingTuning;
};

/**
 * DESKTOP RELEASE TARGET.
 *
 * The authored rest position leaves the stack straddling the drop target's
 * left edge — the files are let go at the very edge of the zone they are being
 * dropped into. Desktop therefore travels further inward and arrives centred
 * on the drop target. The value is `HERO_DROP_CENTRE_OFFSET`, derived from the
 * dashed rule's own geometry and the stack's own footprint, so it tracks the
 * artwork instead of being a remembered screen coordinate.
 *
 * Only the TARGET moves. The entry offset, the approach easing and every span
 * are untouched, so the sequence still reads: approach from the left, arrive,
 * hold, hand opens, files release, panel accepts.
 *
 * Tablet and mobile keep the authored target (0) deliberately: their frames
 * are narrower and the resolver already shifts them by the composition's left
 * edge, so re-centring there would be a second, unrequested change.
 */
export const HERO_DESKTOP_RELEASE_TARGET = HERO_DROP_CENTRE_OFFSET;

/**
 * The desktop target values that shipped BEFORE it was centred.
 *
 * Storage is written per key, so raising a default does not reach anyone who
 * already has a saved payload — their stored 0 keeps winning. The migration in
 * the tuning store uses this to tell "still on the old default" apart from
 * "deliberately tuned to something", and only replaces the former.
 */
/**
 * TABLET AND MOBILE RELEASE TARGET.
 *
 * Narrow frames read badly with the stack parked dead centre — the files cover
 * the middle of a panel that is already only a few hundred px wide. Both bands
 * therefore release just inside the drop target's LEFT edge, derived from the
 * drop target's own bounds (see HERO_DROP_LEFT_OFFSET), never from desktop's
 * numbers. Each band still owns its own dial, so changing one cannot move the
 * other.
 */
export const HERO_LEFT_RELEASE_TARGET = HERO_DROP_LEFT_OFFSET;

export const HERO_SUPERSEDED_DESKTOP_TARGET = {
  stackTargetX: 0,
  stackTargetY: 0,
  handTargetX: 0,
  handTargetY: 0,
} as const;

/**
 * Tablet/mobile target values that predate the left-side release: the authored
 * 0, and desktop's centred value for anyone whose bands picked that up.
 */
export const HERO_SUPERSEDED_SIDE_TARGETS: Readonly<Record<string, readonly number[]>> = {
  stackTargetX: [0, HERO_DROP_CENTRE_OFFSET.x],
  stackTargetY: [0, HERO_DROP_CENTRE_OFFSET.y],
  handTargetX: [0, HERO_DROP_CENTRE_OFFSET.x],
  handTargetY: [0, HERO_DROP_CENTRE_OFFSET.y],
};

/**
 * APPROVED RESPONSIVE TUNING — baked from the Motion Lab snapshot saved
 * 2026-09-08T12:55:03.457Z (hero-reveal.snapshot.json, sha256 4ed8b6a57017ceda…). One explicit
 * literal per band so each band is independent and production reads
 * nothing but this object. Re-bake by saving a new snapshot and
 * promoting it; do not hand-edit single values.
 */
export const HERO_RESPONSIVE_DEFAULTS: HeroResponsiveTuning = {
  desktop: {
    stackStartX: -480,
    stackStartY: 34,
    stackTargetX: 465,
    stackTargetY: 0,
    handStartX: -540,
    handStartY: 34,
    handTargetX: 445,
    handTargetY: -15,
    handOffsetX: 0,
    handOffsetY: 0,
    releaseOffsetX: 12,
    releaseOffsetY: -22,
    pointerExitX: 10,
    pointerExitY: 173,
    compositionTranslateX: 0,
    compositionTranslateY: 0,
    visualScale: 1,
    pointerScale: 0.56,
    filesScale: 0.76,
    uploadOffsetX: 0,
    uploadOffsetY: 0,
  },
  tablet: {
    stackStartX: -620,
    stackStartY: 34,
    stackTargetX: 103,
    stackTargetY: 0,
    handStartX: -690,
    handStartY: 34,
    handTargetX: 75,
    handTargetY: -13,
    handOffsetX: 0,
    handOffsetY: 0,
    releaseOffsetX: 46,
    releaseOffsetY: -22,
    pointerExitX: 20,
    pointerExitY: 427,
    compositionTranslateX: -12,
    compositionTranslateY: 50,
    visualScale: 1.5,
    pointerScale: 0.6,
    filesScale: 0.76,
    uploadOffsetX: -142,
    uploadOffsetY: 0,
    framingOffsetX: 0,
  },
  mobile: {
    stackStartX: -470,
    stackStartY: 34,
    stackTargetX: 136,
    stackTargetY: 0,
    handStartX: -560,
    handStartY: 34,
    handTargetX: 121,
    handTargetY: -13,
    handOffsetX: 0,
    handOffsetY: 0,
    releaseOffsetX: 46,
    releaseOffsetY: -22,
    pointerExitX: -300,
    pointerExitY: 26,
    compositionTranslateX: 78,
    compositionTranslateY: 42,
    visualScale: 1.42,
    pointerScale: 0.6,
    filesScale: 0.86,
    uploadOffsetX: -280,
    uploadOffsetY: 0,
    framingOffsetX: 0,
    compositionScale: 1.13,
    compositionOffsetX: 0,
    compositionOffsetY: 0,
  },
};

export const HERO_BREAKPOINT_KEYS = ['desktop', 'tablet', 'mobile'] as const;

/** Keys tuned per breakpoint, in panel order. */
export const HERO_BREAKPOINT_DIALS = [
  'stackStartX',
  'stackStartY',
  'stackTargetX',
  'stackTargetY',
  'handStartX',
  'handStartY',
  'handTargetX',
  'handTargetY',
  'handOffsetX',
  'handOffsetY',
  'releaseOffsetX',
  'releaseOffsetY',
  'pointerExitX',
  'pointerExitY',
] as const;

/**
 * Placement keys — EVERY band, in panel order. These are the dials that move
 * and size the whole key visual, the hand, and the files on screen.
 */
export const HERO_PLACEMENT_DIALS = [
  'compositionTranslateX',
  'compositionTranslateY',
  'visualScale',
  'pointerScale',
  'filesScale',
  'uploadOffsetX',
  'uploadOffsetY',
] as const;

/** Framing keys — tablet and mobile only; desktop's framing is the full canvas. */
export const HERO_FRAMING_DIALS = ['framingOffsetX'] as const;

/** Mobile-only composition keys. */
export const HERO_MOBILE_DIALS = [
  'compositionScale',
  'compositionOffsetX',
  'compositionOffsetY',
] as const;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpRect(a: HeroCompositionRect, b: HeroCompositionRect, t: number): HeroCompositionRect {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    width: lerp(a.width, b.width, t),
    height: lerp(a.height, b.height, t),
  };
}

/**
 * Which dial group a viewport belongs to.
 *
 * 640..743 is grouped with `tablet` deliberately: its framing is the ramp INTO
 * the tablet window, so tuning tablet and tuning that band are the same intent,
 * and grouping it with desktop instead would put a dial boundary at 744 where
 * the framing is already continuous.
 */
export function heroBreakpoint(viewportWidth: number): HeroBreakpoint {
  if (viewportWidth >= HERO_DESKTOP_MIN) return 'desktop';
  if (viewportWidth >= HERO_FLUID_MIN) return 'tablet';
  return 'mobile';
}

/** Apply mobile's zoom/nudge about the frame's own centre. */
function applyMobileComposition(
  base: HeroCompositionRect,
  mobile: HeroMobileComposition,
): HeroCompositionRect {
  const scale = mobile.compositionScale > 0 ? mobile.compositionScale : 1;
  const width = base.width / scale;
  const height = base.height / scale;
  return {
    x: base.x + (base.width - width) / 2 + mobile.compositionOffsetX,
    y: base.y + (base.height - height) / 2 + mobile.compositionOffsetY,
    width,
    height,
  };
}

/**
 * The rectangle of the authoring canvas this viewport frames.
 *
 * Desktop (>=1200) and tablet (744..1199) return exactly what the production
 * stylesheet produces, so those bands are untouched.
 */
export function heroComposition(
  viewportWidth: number,
  responsive: HeroResponsiveTuning = HERO_RESPONSIVE_DEFAULTS,
): HeroCompositionRect {
  if (viewportWidth >= HERO_DESKTOP_MIN) return FULL_CANVAS;

  const shift = (rect: HeroCompositionRect, offset: number): HeroCompositionRect =>
    offset === 0 ? rect : { ...rect, x: rect.x + offset };

  if (viewportWidth >= HERO_TABLET_MIN) {
    return shift(TABLET_FRAMING, responsive.tablet.framingOffsetX);
  }
  if (viewportWidth >= HERO_FLUID_MIN) {
    /*
     * The fluid band ramps into the tablet window, so it ramps into the tablet
     * framing offset too — otherwise the offset would appear as a step at 744.
     */
    const t = clamp01((viewportWidth - HERO_FLUID_MIN) / (HERO_TABLET_MIN - HERO_FLUID_MIN));
    return shift(lerpRect(FULL_CANVAS, TABLET_FRAMING, t), responsive.tablet.framingOffsetX * t);
  }
  const t = clamp01(
    (viewportWidth - HERO_MOBILE_TIGHT_MAX) / (HERO_FLUID_MIN - HERO_MOBILE_TIGHT_MAX),
  );
  const base = applyMobileComposition(lerpRect(PANEL_FRAMING, FULL_CANVAS, t), responsive.mobile);
  /* Fades out as mobile ramps into the fluid band, for the same reason. */
  return shift(base, responsive.mobile.framingOffsetX * (1 - t));
}

/**
 * ONE resolver for every placement dial.
 *
 * Desktop (>=1200) returns its own band's value. Tablet (744..1199) returns
 * the tablet value. The two seams are ramped so neither breakpoint boundary
 * becomes a step: across the 640..744 fluid band the tablet value fades in
 * from `neutral`, and below 640 the mobile value fades out toward `neutral`
 * as the mobile framing ramps into the full canvas. `neutral` is 0 for a
 * translation and 1 for a scale — the value that changes nothing.
 *
 * With every band at its default this reproduces the previous per-dial
 * functions exactly (desktop 0 / 1, tablet 60 / 1.2, mobile 30 / 1.08).
 */
export function heroPlacementValue(
  viewportWidth: number,
  responsive: HeroResponsiveTuning,
  key: keyof HeroPlacementTuning,
  neutral: number,
): number {
  if (viewportWidth >= HERO_DESKTOP_MIN) return responsive.desktop[key];
  if (viewportWidth >= HERO_TABLET_MIN) return responsive.tablet[key];
  if (viewportWidth >= HERO_FLUID_MIN) {
    const t = clamp01((viewportWidth - HERO_FLUID_MIN) / (HERO_TABLET_MIN - HERO_FLUID_MIN));
    return neutral + (responsive.tablet[key] - neutral) * t;
  }
  const t = clamp01(
    (viewportWidth - HERO_MOBILE_TIGHT_MAX) / (HERO_FLUID_MIN - HERO_MOBILE_TIGHT_MAX),
  );
  return neutral + (responsive.mobile[key] - neutral) * (1 - t);
}

/** The root composition translation for a viewport, in screen px (Visual Position X). */
export function heroCompositionTranslateX(
  viewportWidth: number,
  responsive: HeroResponsiveTuning = HERO_RESPONSIVE_DEFAULTS,
): number {
  return heroPlacementValue(viewportWidth, responsive, 'compositionTranslateX', 0);
}

/** Vertical root translation, in screen px (Visual Position Y). */
export function heroCompositionTranslateY(
  viewportWidth: number,
  responsive: HeroResponsiveTuning = HERO_RESPONSIVE_DEFAULTS,
): number {
  return heroPlacementValue(viewportWidth, responsive, 'compositionTranslateY', 0);
}

/** The visual scale multiplier for a viewport (Visual Scale). */
export function heroVisualScale(
  viewportWidth: number,
  responsive: HeroResponsiveTuning = HERO_RESPONSIVE_DEFAULTS,
): number {
  return heroPlacementValue(viewportWidth, responsive, 'visualScale', 1);
}

/** Hand-only scale multiplier (Pointer Scale). */
export function heroPointerScale(
  viewportWidth: number,
  responsive: HeroResponsiveTuning = HERO_RESPONSIVE_DEFAULTS,
): number {
  return heroPlacementValue(viewportWidth, responsive, 'pointerScale', 1);
}

/** File-stack-only scale multiplier (Files Scale). */
export function heroFilesScale(
  viewportWidth: number,
  responsive: HeroResponsiveTuning = HERO_RESPONSIVE_DEFAULTS,
): number {
  return heroPlacementValue(viewportWidth, responsive, 'filesScale', 1);
}

/** Upload-panel-only offset, canvas px (Upload Panel Position X / Y). */
export function heroUploadOffset(
  viewportWidth: number,
  responsive: HeroResponsiveTuning = HERO_RESPONSIVE_DEFAULTS,
): { x: number; y: number } {
  return {
    x: heroPlacementValue(viewportWidth, responsive, 'uploadOffsetX', 0),
    y: heroPlacementValue(viewportWidth, responsive, 'uploadOffsetY', 0),
  };
}

/**
 * Fold the breakpoint's positions into the shared tuning.
 *
 * ENTRY AND EXIT are resolved against the FRAME'S left edge: they describe
 * where the stack comes from and goes to relative to what is visible, so they
 * must follow the composition or the approach starts on-screen at one width and
 * miles away at another. `comp.x` is continuous, so this keeps working across
 * both seams instead of needing a value per width.
 *
 * TARGETS are resolved against the CANVAS. The release point is a position ON
 * THE PANEL — the drop target is canvas-fixed at x 201.49, so a frame-relative
 * target would slide off it as the mobile framing ramps. Anchoring targets to
 * the canvas is also what makes the bands independent: a target means the same
 * place at every width, so each band's value can be chosen for that band alone.
 * Desktop is unaffected either way, because its `comp.x` is 0.
 *
 * Y needs no treatment at all: the stack rests at canvas y 102..358, comfortably
 * inside every frame, so those dials stay absolute.
 */
export function resolveHeroRevealTuning(
  base: HeroRevealTuning,
  responsive: HeroResponsiveTuning,
  breakpoint: HeroBreakpoint,
  composition: HeroCompositionRect,
): HeroRevealTuning {
  const b = responsive[breakpoint];
  return {
    ...base,
    stackStartX: composition.x + b.stackStartX,
    stackStartY: b.stackStartY,
    stackTargetX: b.stackTargetX,
    stackTargetY: b.stackTargetY,
    handStartX: composition.x + b.handStartX,
    handStartY: b.handStartY,
    handTargetX: b.handTargetX,
    handTargetY: b.handTargetY,
    handOffsetX: b.handOffsetX,
    handOffsetY: b.handOffsetY,
    releaseOffsetX: b.releaseOffsetX,
    releaseOffsetY: b.releaseOffsetY,
    pointerExitX: b.pointerExitX,
    pointerExitY: b.pointerExitY,
  };
}

/*
 * `heroRightWash` used to re-anchor the right-hand wash to a mobile frame. The
 * wash is no longer painted on any band (see HeroCanvas), so the helper is gone
 * with it rather than left wired to nothing.
 */
