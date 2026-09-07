/**
 * Hero reveal — scene definitions.
 *
 * STRUCTURE: there is ONE hero key-visual panel. The reveal states and the
 * shipping interactive workspace are different states OF THAT PANEL, not
 * different panels. Nothing here may change the container's bounds.
 *
 * Visual source of truth: Fahmi's frame-by-frame sequence in "Rhino Labs
 * (July 2026) - Mega Design File", page "04 Website - Home page", section
 * 1008:9872, four frames joined by arrows:
 *
 *   1008:7262  ->  1008:9765  ->  1008:8577  ->  964:1385198
 *
 * Those frames are NOT geometrically continuous — they draw the panel at
 * 1727.731 / 954 / 954 / 1176 wide. Reproducing that literally would make the
 * hero container resize three times before settling, so the frame dimensions
 * are deliberately NOT carried over. `HERO_PANEL` below is the single container
 * for all four states, taken from the hero that actually ships.
 *
 * The rule applied throughout: Figma decides what a state LOOKS LIKE; the
 * shipping hero decides WHERE THE CONTAINER IS. Authored values that are
 * independent of panel width (insets, heights, type, colour, dash, artwork) are
 * carried over untouched; values that were tied to a Figma frame's width are
 * re-derived from `HERO_PANEL`.
 */

export type HeroRevealSceneId = 'drag-in' | 'drop-target' | 'uploading' | 'workspace';

export type HeroPanelGeometry = {
  /** Left edge of the outer gradient frame on the 1440x540 hero canvas. */
  left: number;
  width: number;
  height: number;
  /** Gap between the outer frame and the inner panel. */
  padding: number;
  radius: number;
  innerRadius: number;
  innerWidth: number;
  innerHeight: number;
};

/**
 * THE hero panel. One geometry, shared by every state.
 *
 * Mirrors the shipping hero exactly: `HeroVisual.module.css` .appClip
 * (left 137.49 / top 5.48961 / 1164.56 x 669.682 / radius 5.75533) sitting in
 * the background SVG's frame rect (x 132 / 1176 x 680.661 / radius 11.5107).
 * Figma frame 964:1385198 (scene 4) is authored at these same numbers.
 */
export const HERO_PANEL: HeroPanelGeometry = {
  left: 132,
  width: 1176,
  height: 680.661,
  padding: 5.48961,
  radius: 11.5107,
  innerRadius: 5.75533,
  innerWidth: 1164.56,
  innerHeight: 669.682,
};

/** The hero canvas, identical in Figma and production. */
export const HERO_CANVAS = { width: 1440, height: 540 } as const;

/**
 * Geometry derived from the authored scene, for motion that has to LAND on
 * something rather than at a remembered screen coordinate.
 *
 * Both rectangles below are computed from the same constants the renderer
 * draws from, so they cannot drift from what is on screen: change the overlay
 * inset or a card's wrapper and these follow.
 */
export type HeroRect = { left: number; top: number; width: number; height: number };

export const heroRectCentre = (r: HeroRect) => ({
  x: r.left + r.width / 2,
  y: r.top + r.height / 2,
});


/**
 * Canvas paint, shared by every state so the container never flickers.
 *
 * Production paints `bg-canvas` #FAFAFA behind a #FAFAFA "Key Visual - Hero"
 * fill at 0.9 opacity. Figma's wrappers say #fbfbfb (scenes 1-3) and #ffffff
 * (scene 4); those disagree with each other and with production, so the
 * shipping value wins — it is the container, and it must not change per state.
 */
export const HERO_SURFACE = { canvasFill: '#fafafa', keyVisualFill: '#fafafa' } as const;

/**
 * The bottom ambient wash. Production `.fade` is top 264 / 1440 x 276.
 * Figma's reveal frames place the same rect at y=304; using that would make the
 * wash jump when the sequence reaches the interactive state, so production's
 * position is canonical for all four.
 */
export const HERO_BOTTOM_WASH = { top: 264, width: 1440, height: 276 } as const;

/** Right-edge wash (Figma Rectangle 60912), authored in the reveal states only. */
export const HERO_RIGHT_WASH = { width: 276 } as const;

export type HeroDropOverlay = {
  /**
   * Authored overlay height (Figma 591). Width always fills the panel, so it is
   * not stored: in Figma the overlay already spans the panel's full width in
   * the frame that centres it (939 of a 937 inner panel), and production's
   * `.dropZone` is `inset: 0`.
   */
  height: number;
  /** Padding between the overlay edge and the dashed rule. Authored 64. */
  inset: number;
  /** Copy's top offset inside the dashed area. Authored; height is unchanged. */
  copyTop: number;
  /**
   * Figma `dashPattern` / `strokes`, verbatim. NOT a CSS dashed border — that
   * renders a browser-chosen ~3px pattern and reads as dots beside 13/13.
   */
  dash: { color: string; width: number; pattern: [number, number]; radius: number };
};

export type HeroDragCard = {
  src: string;
  /** Placement inside the 376.201 x 256 stack frame. `null` left = centred. */
  wrapper: { left: number | null; top: number; width: number; height: number };
  rotate: number;
  box: { width: number; height: number };
  art: { left: number; top: number; width: number; height: number };
  /** The exported SVG's own size — larger than `art`, because the card's drop
   *  shadow is drawn inside the file (Figma inset -0.67% / -0.83%). */
  bleed: { width: number; height: number };
};

export type HeroUploadToast = {
  /** Authored top inside the panel. Left is centred, so it is not stored. */
  top: number;
  width: number;
  height: number;
  percent: number;
  barPercent: number;
  files: number;
};

/** Scene 3 upload panel sub-geometry, read off Figma 1008:8581. */
export const HERO_UPLOAD = {
  texture: { left: 282.901, top: 1.466, width: 199.35, height: 90.88 },
  line: { width: 481.518, height: 2.9316, top: 5.863 },
} as const;

export type HeroRevealScene = {
  id: HeroRevealSceneId;
  step: number;
  label: string;
  figmaNodeId: string;
  figmaUrl: string;
  intent: string;
  /**
   * Per-state paint INSIDE the shared container. These change the look of the
   * panel, never its bounds.
   */
  state: {
    /** Extra fill above the panel frame's gradient (Figma stacks fills). */
    panelOverlayFill?: string;
    /** Inner panel fill — Figma dims it during upload. */
    innerFill: string;
    /** Right-edge wash, authored in the reveal states only. */
    rightWash: boolean;
  };
  overlay?: HeroDropOverlay;
  dragStack?: {
    left: number;
    top: number;
    width: number;
    height: number;
    cards: HeroDragCard[];
    cursor: {
      frame: { left: number; top: number; size: number };
      image: { left: number; top: number; width: number; height: number };
      /** Open hand. */
      src: string;
      /** Closed / grabbing hand, shown while the files are carried. */
      closedSrc: string;
    };
  };
  uploadToast?: HeroUploadToast;
  /** Scene 4 only — mounts the real interactive demo. */
  mountsLiveDemo?: boolean;
  /** How this state was adapted from its Figma frame into HERO_PANEL. */
  adaptation: string[];
};

const FIGMA_FILE = 'https://www.figma.com/design/zjFuszFGsnUw4mKsRFpxsn/Rhino-Labs--July-2026----Mega-Design-File';
const figmaUrl = (nodeId: string) => `${FIGMA_FILE}?node-id=${nodeId.replace(':', '-')}`;

export const HERO_REVEAL_SCENES: HeroRevealScene[] = [
  {
    id: 'drag-in',
    step: 1,
    label: 'Files approach',
    figmaNodeId: '1008:7262',
    figmaUrl: figmaUrl('1008:7262'),
    intent:
      'A held stack of files is carried toward the drop target while the panel shows it is ready to receive them. This is the attention beat Ryan asked for, and the only state with no counterpart in the shipping hero.',
    state: { innerFill: '#ffffff', rightWash: true },
    overlay: {
      height: 591,
      inset: 64,
      copyTop: 212,
      // 1008:7267 — stroke #a3a3a3, weight 1, dashPattern [13,13], radius 16.
      dash: { color: '#a3a3a3', width: 1, pattern: [13, 13], radius: 16 },
    },
    dragStack: {
      // Canvas coordinates, unchanged: the 1440x540 canvas is identical in
      // Figma and production, so these need no adaptation.
      left: 72,
      top: 102,
      width: 376.201,
      height: 256,
      cards: [
        {
          src: '/assets/hero/reveal/file-card-a.svg',
          wrapper: { left: 107.36, top: -11.01, width: 224.245, height: 249.016 },
          rotate: 21.24,
          box: { width: 161.089, height: 204.557 },
          art: { left: 16.37, top: 20.46, width: 126.825, height: 158.532 },
          bleed: { width: 127.88, height: 159.588 },
        },
        {
          src: '/assets/hero/reveal/file-card-b.svg',
          wrapper: { left: 49.55, top: -18.69, width: 224.506, height: 257.596 },
          rotate: -15,
          box: { width: 173.419, height: 220.215 },
          art: { left: 17.62, top: 22.02, width: 136.533, height: 170.667 },
          bleed: { width: 137.669, height: 171.805 },
        },
        {
          src: '/assets/hero/reveal/file-card-c.svg',
          wrapper: { left: null, top: 0, width: 173.419, height: 220.215 },
          rotate: 0,
          box: { width: 173.419, height: 220.215 },
          art: { left: 17.62, top: 22.02, width: 136.533, height: 170.667 },
          bleed: { width: 137.669, height: 171.805 },
        },
      ],
      cursor: {
        frame: { left: 187.18, top: 126.62, size: 129.376 },
        image: { left: 17.37, top: 21.42, width: 94.1654, height: 95.3904 },
        /** Cursor/Grab (561:9785) — the hero's own authored OPEN hand. */
        src: '/assets/hero/reveal/cursor-grab.svg',
        /**
         * Cursor / Type=Hand grab (463:9329) — the authored CLOSED hand from
         * the same cursor family, instanced at 463:9376 in this file. Used
         * while the stack is being carried; NOT a generic substitute.
         */
        closedSrc: '/assets/hero/reveal/cursor-grabbing.svg',
      },
    },
    adaptation: [
      'Panel: Figma draws this frame at 1727.731 wide, pushed off the right edge. Replaced by HERO_PANEL. Every authored value inside it is unchanged.',
      'Drop overlay: Figma authors it 946 wide inside a 1710.924 panel, covering only the left ~55%. It now fills the panel width, matching the shipping .dropZone (inset: 0) and Figma\'s own centred frame.',
      'File stack and cursor: authored canvas coordinates kept exactly. Because the panel now starts at x=132 instead of x=608, the stack overlaps the panel\'s left edge rather than sitting clear of it. This reads as files carried OVER the drop target rather than approaching from outside — the composition changed, not the artwork.',
    ],
  },
  {
    id: 'drop-target',
    step: 2,
    label: 'Drop target armed',
    figmaNodeId: '1008:9765',
    figmaUrl: figmaUrl('1008:9765'),
    intent:
      'The drop target is armed across the whole panel and the frame darkens to acknowledge it. This is the state the shipping hero already renders while a real file is dragged over it.',
    state: {
      // 1008:9767 stacks a solid black 20% fill above the frame gradient. This
      // is a per-state treatment of the same frame, not a different frame.
      panelOverlayFill: 'rgba(0, 0, 0, 0.2)',
      innerFill: '#ffffff',
      rightWash: true,
    },
    overlay: {
      height: 591,
      inset: 64,
      copyTop: 213,
      // 1008:9770 — stroke #0a0a0a. Scene 1 uses #a3a3a3; the frames genuinely
      // do not share a stroke colour.
      dash: { color: '#0a0a0a', width: 1, pattern: [13, 13], radius: 16 },
    },
    adaptation: [
      'Panel: Figma draws this frame at 954 wide. Replaced by HERO_PANEL.',
      'Drop overlay: authored 939 wide in a 937 panel, i.e. already full-bleed. Now fills HERO_PANEL. The 64px inset, the 591 overlay height and the 463 dashed height are all authored values and are unchanged, so the dashed rule keeps its exact vertical placement and only stretches horizontally.',
      'Copy: Figma places it at x=296 in an 818-wide dashed area, i.e. centred. Now centred in the wider dashed area; the authored vertical offset is unchanged.',
    ],
  },
  {
    id: 'uploading',
    step: 3,
    label: 'Upload in progress',
    figmaNodeId: '1008:8577',
    figmaUrl: figmaUrl('1008:8577'),
    intent:
      'The drop is accepted, the workspace dims behind the transfer, and the upload panel counts it up.',
    state: {
      // 1008:8580 stacks #f3f3f3 over #ffffff. A per-state dim, not a container
      // change: the panel bounds are identical to every other state.
      innerFill: '#f3f3f3',
      rightWash: false,
    },
    uploadToast: {
      top: 89.935, width: 567.723, height: 93.812,
      percent: 92, barPercent: 85.04, files: 3,
    },
    adaptation: [
      'Panel: Figma draws this frame at 954 wide (with a 946 inner, where scene 2 says 937 from the same outer frame). Replaced by HERO_PANEL.',
      'Upload panel: authored at x=188.935 in a 946-wide panel, i.e. centred. Now centred in HERO_PANEL; its authored top (89.935), size (567.723 x 93.812) and every paint value are unchanged.',
    ],
  },
  {
    id: 'workspace',
    step: 4,
    label: 'Interactive workspace resolved',
    figmaNodeId: '964:1385198',
    figmaUrl: figmaUrl('964:1385198'),
    intent:
      'The reveal gives way to the interactive hero that ships today. The panel has not moved or resized to get here — only its contents changed.',
    state: { innerFill: '#ffffff', rightWash: false },
    mountsLiveDemo: true,
    adaptation: [
      'Panel: this frame is already authored at HERO_PANEL\'s numbers (132 / 1176 / 1164.56), which is where those numbers come from. Nothing to adapt.',
      'Canvas: Figma fills this wrapper #ffffff where the reveal frames use #fbfbfb. Normalised to production #FAFAFA so the page behind the container does not change between states.',
    ],
  },
];

export function findHeroRevealScene(id: HeroRevealSceneId) {
  const scene = HERO_REVEAL_SCENES.find((entry) => entry.id === id);
  if (!scene) throw new Error(`Unknown hero reveal scene: ${id}`);
  return scene;
}

/* ---------------------------------------------------------------------------
 * Drop-target and file-stack geometry.
 *
 * Derived, not measured. `sampleHeroReveal` moves the stack by an offset from
 * its authored rest position, so "release at the centre of the drop target"
 * has to be expressed as a delta — and that delta is only trustworthy if BOTH
 * ends of it come from the same constants the renderer uses.
 * ------------------------------------------------------------------------ */

const DROP_SCENE = findHeroRevealScene('drag-in');

/**
 * The dashed drop target, in canvas coordinates.
 *
 * The overlay fills the inner panel (which sits at HERO_PANEL.padding inside
 * the frame) and the dashed rule is inset from it on all four sides. Verified
 * against the rendered SVG: 201.48–1238.04 x 69.48–532.49.
 */
export const HERO_DROP_TARGET: HeroRect = (() => {
  const overlay = DROP_SCENE.overlay!;
  const innerLeft = HERO_PANEL.left + HERO_PANEL.padding;
  const innerTop = HERO_PANEL.padding;
  return {
    left: innerLeft + overlay.inset,
    top: innerTop + overlay.inset,
    width: HERO_PANEL.innerWidth - overlay.inset * 2,
    height: overlay.height - overlay.inset * 2,
  };
})();

/**
 * The file stack's rendered footprint at its rest position.
 *
 * Each card's `wrapper` is already the ROTATED card's bounding box — the
 * rotation is baked into those dimensions — so the union of the wrappers is
 * the stack's true visual extent. Verified against the rendered cards at the
 * settled frame: 121.55–403.60 x 83.31–340.91.
 */
export const HERO_STACK_FOOTPRINT: HeroRect = (() => {
  const stack = DROP_SCENE.dragStack!;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const card of stack.cards) {
    // `left: null` means "centred in the stack" — the renderer's own rule.
    const left = card.wrapper.left ?? (stack.width - card.wrapper.width) / 2;
    x0 = Math.min(x0, left);
    x1 = Math.max(x1, left + card.wrapper.width);
    y0 = Math.min(y0, card.wrapper.top);
    y1 = Math.max(y1, card.wrapper.top + card.wrapper.height);
  }
  return {
    left: stack.left + x0,
    top: stack.top + y0,
    width: x1 - x0,
    height: y1 - y0,
  };
})();

/**
 * The offset that puts the file stack in the MIDDLE of the drop target.
 *
 * This is the desktop release target: the delta from the stack's authored rest
 * position to the drop target's centre. Rounded to whole pixels so it matches
 * its dial step exactly and survives a save/load round trip unchanged; the
 * rounding costs less than a quarter of a pixel.
 */
export const HERO_DROP_CENTRE_OFFSET = (() => {
  const target = heroRectCentre(HERO_DROP_TARGET);
  const stack = heroRectCentre(HERO_STACK_FOOTPRINT);
  return { x: Math.round(target.x - stack.x), y: Math.round(target.y - stack.y) };
})();

/**
 * The pointer hotspot at the stack's rest position.
 *
 * The centre of the authored cursor frame — the point a real drag-and-drop
 * would hit-test with. Verified against the rendered hand: (323.87, 293.31).
 */
export const HERO_POINTER_HOTSPOT = (() => {
  const stack = DROP_SCENE.dragStack!;
  const frame = stack.cursor.frame;
  return {
    x: stack.left + frame.left + frame.size / 2,
    y: stack.top + frame.top + frame.size / 2,
  };
})();

/**
 * How far inside the drop target's left edge the stack sits when a breakpoint
 * releases on the left rather than in the middle. Small enough to read as
 * "just inside the zone", large enough that the dashed edge is never touched.
 */
export const HERO_LEFT_RELEASE_INSET = 24;

/**
 * The offset that parks the file stack just inside the drop target's LEFT edge,
 * vertically centred — the tablet and mobile release target.
 *
 * Derived from the same two rectangles as the centred target, so it follows the
 * artwork rather than restating desktop's numbers.
 */
export const HERO_DROP_LEFT_OFFSET = (() => {
  const x = HERO_DROP_TARGET.left + HERO_LEFT_RELEASE_INSET - HERO_STACK_FOOTPRINT.left;
  return { x: Math.round(x), y: HERO_DROP_CENTRE_OFFSET.y };
})();

