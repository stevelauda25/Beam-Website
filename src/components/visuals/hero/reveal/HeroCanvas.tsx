/**
 * The hero canvas — the single renderer for every hero reveal frame.
 *
 * It takes a fully resolved `HeroRevealFrame` and paints it. Both consumers go
 * through here, which is what stops the static review states and the animated
 * sequence from drifting apart:
 *
 *   HeroRevealScene     Figma frame  -> HeroRevealFrame -> HeroCanvas
 *   HeroRevealSequence  time (ms)    -> HeroRevealFrame -> HeroCanvas
 *
 * STRUCTURAL CONTRACT: the panel frame and inner panel are painted from
 * HERO_PANEL, always. Nothing in a frame can move or resize them — a frame only
 * contributes paint and contents INSIDE the panel. The workspace is mounted for
 * the whole sequence and revealed by opacity, so the handoff involves no
 * remount, no reflow and no geometry change.
 */
import { HeroWorkspaceDemo, type HeroWorkspaceLayout } from '../product-demo/HeroWorkspaceDemo';
import { HeroUploadPanel } from './HeroUploadPanel';
import {
  HERO_BOTTOM_WASH,
  HERO_CANVAS,
  HERO_PANEL,
  HERO_SURFACE,
  HERO_REVEAL_SCENES,
} from './heroRevealScenes';
import {
  HERO_REVEAL_DEFAULTS,
  type HeroRevealFrame,
  type HeroRevealTuning,
} from './heroRevealTimeline';
import styles from './HeroRevealScene.module.css';

/**
 * The panel frame's gradient fill: Figma black 0%..transparent 101.21% at 4%
 * fill opacity, baked into the stops. Identical across all four frames.
 */
const PANEL_GRADIENT =
  'linear-gradient(129.3446deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0) 101.21%)';

/** Authored drop-overlay + drag-stack geometry lives on the scene data. */
const DRAG_SCENE = HERO_REVEAL_SCENES[0];
const OVERLAY = DRAG_SCENE.overlay!;
const STACK = DRAG_SCENE.dragStack!;
const UPLOAD_TOAST = HERO_REVEAL_SCENES[2].uploadToast!;

/**
 * Figma's dashed rounded rectangle, reproduced as an SVG stroke.
 *
 * Figma's stroke align is INSIDE, so the 1px stroke sits fully within the
 * frame: the rect is inset by half the stroke width and its radius reduced by
 * the same amount, otherwise the stroke straddles the edge and the corner arc
 * is a half-pixel wide.
 */
/** Scene 2's armed stroke colour (Figma 1008:9770); scene 1's is the resting one. */
const DASH_ARMED = HERO_REVEAL_SCENES[1].overlay!.dash.color;

function DashedRule({
  width,
  height,
  inset,
  armed,
}: {
  width: number;
  height: number;
  inset: number;
  /** 0..1 crossfade from the resting stroke to the armed one. */
  armed: number;
}) {
  const { width: sw, pattern, radius, color } = OVERLAY.dash;
  const half = sw / 2;
  const geometry = {
    x: half,
    y: half,
    width: width - sw,
    height: height - sw,
    rx: radius - half,
    strokeWidth: sw,
    strokeDasharray: pattern.join(' '),
  };
  return (
    <svg
      className={styles.overlayRule}
      style={{ left: inset, top: inset }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      {/*
        * Two stacked strokes crossfaded by opacity, rather than rewriting the
        * `stroke` attribute every frame. Colour is a paint-tier property; the
        * rules require swapping down a tier rather than animating paint.
        */}
      <rect {...geometry} stroke={color} opacity={1 - armed} />
      <rect {...geometry} stroke={DASH_ARMED} opacity={armed} />
    </svg>
  );
}

const cursorRect = {
  left: STACK.cursor.image.left,
  top: STACK.cursor.image.top,
  width: STACK.cursor.image.width,
  height: STACK.cursor.image.height,
} as const;

/**
 * The pointer hotspot in the drag stack's OWN coordinates — the centre of the
 * authored cursor frame, i.e. the point the hand grips the files with. Both
 * the hand and the file stack scale about this point, so a size change grows
 * the art around the grip instead of sliding it off the release position.
 */
const GRIP_ORIGIN = `${STACK.cursor.frame.left + STACK.cursor.frame.size / 2}px ${
  STACK.cursor.frame.top + STACK.cursor.frame.size / 2
}px`;

export function HeroCanvas({
  frame,
  uploadBarProgress,
  tuning = HERO_REVEAL_DEFAULTS,
  bottomWash,
  workspaceLayout,
  contentTransform,
  uploadOffset,
  pointerScale = 1,
  filesScale = 1,
}: {
  frame: HeroRevealFrame;
  /** Static review only — lets the authored 92%/85.04% frame be reproduced. */
  uploadBarProgress?: number;
  /** Static (non-time-varying) tuning values the frame cannot carry. */
  tuning?: HeroRevealTuning;
  /**
   * Re-anchors the bottom fade. Omitted everywhere the authored 264/276
   * geometry applies; the mobile band's resolved-workspace window moves the
   * fade up to 133/211, the way the pre-reveal mobile hero drew it.
   */
  bottomWash?: { top: number; height: number };
  /**
   * Which layout the mounted workspace renders. The reveal passes its own
   * responsive band, so a logical mobile viewport (Motion Lab preset) gets the
   * mobile workspace even inside a desktop-sized window. Omitted, the demo
   * follows the physical window through matchMedia, as it always did.
   */
  workspaceLayout?: HeroWorkspaceLayout;
  /**
   * SCENE CONTENT placement, in canvas space, independent of the shell.
   *
   * The drag stack, the dashed target with its copy, and the upload panel are
   * the content of the drag / drop / upload scenes. On mobile the panel shell
   * is drawn at the canonical 1:1 My Beam geometry for every state, and this
   * transform places the scene content inside it — `translate(x, y) scale(s)`
   * about the canvas origin — so the tuned composition lands on screen exactly
   * where it did when the whole canvas was scaled. Omitted, content sits at
   * its authored canvas position (desktop, tablet, Scene Review).
   */
  contentTransform?: { x: number; y: number; scale: number };
  /**
   * Upload-panel-only offset, canvas px, on top of its authored centring and
   * its entrance slide. Applied to the one element that is the Uploading and
   * the Uploaded panel alike, so the position holds through the whole phase.
   * Omitted or 0/0 renders the authored transform string unchanged.
   */
  uploadOffset?: { x: number; y: number };
  /**
   * Hand-only size, about its hotspot. 1 (the default everywhere except a
   * band that tuned it) draws the authored cursor with no extra transform.
   */
  pointerScale?: number;
  /**
   * File-stack-only size, about the grip point at rest. The travel, lag and
   * release drift are applied outside this scale, so the path is unchanged.
   */
  filesScale?: number;
}) {
  const panel = HERO_PANEL;
  const dashWidth = panel.innerWidth - OVERLAY.inset * 2;
  const dashHeight = OVERLAY.height - OVERLAY.inset * 2;
  const interactive = frame.workspaceOpacity >= 1;

  /*
   * The content transform is authored in CANVAS space. The drag stack lives in
   * canvas space, so it takes it as is. The dashed target and the upload panel
   * live inside the inner panel, whose origin is at canvas (137.49, 5.49), so
   * for them the same mapping is re-expressed in panel-local coordinates:
   *   canvas' = c + s * canvas,  local = canvas - o
   *   => local' = (c + (s - 1) * o) + s * local
   */
  const canvasContentStyle = contentTransform
    ? {
        transformOrigin: '0 0',
        transform: `translate(${contentTransform.x}px, ${contentTransform.y}px) scale(${contentTransform.scale})`,
      }
    : undefined;
  const panelContentStyle = contentTransform
    ? {
        transformOrigin: '0 0',
        transform: `translate(${
          contentTransform.x + (contentTransform.scale - 1) * panel.left
        }px, ${contentTransform.y + (contentTransform.scale - 1) * panel.padding}px) scale(${
          contentTransform.scale
        })`,
      }
    : undefined;

  return (
    <div
      className={styles.scene}
      /* Measurement hook for the lab's continuity readout. */
      data-hero-canvas=""
      style={{
        width: HERO_CANVAS.width,
        height: HERO_CANVAS.height,
        background: HERO_SURFACE.canvasFill,
      }}
    >
      <div className={styles.group} style={{ background: HERO_SURFACE.keyVisualFill }}>
        <div
          className={styles.panelFrame}
          data-hero-panel="frame"
          style={{
            left: panel.left,
            width: panel.width,
            height: panel.height,
            borderRadius: panel.radius,
            backgroundImage: PANEL_GRADIENT,
            /*
             * The press is applied HERE so the frame, its ring, the inner panel
             * and everything inside compress as one physical surface — the
             * brief's requirement that the whole panel responds, not just part
             * of the dropzone. transform-origin stays centred and the value
             * returns to exactly 1, so nothing is displaced afterwards.
             */
            transform: `scale(${frame.panelPress})`,
          }}
        >
          {/*
            * Figma stacks a solid black 20% fill above the frame gradient when
            * the target is armed. Rendered as its own layer so arming animates
            * opacity (composite) instead of rebuilding a background-image
            * string every frame (paint).
            */}
          <div
            className={styles.panelArm}
            style={{ opacity: frame.panelArm, borderRadius: panel.radius }}
          />

          {/*
            * Confirmation ring. Same layer technique as the armed fill — the
            * opaque inner panel covers the middle, so only the ring shows.
            * Opacity only: no clip-path, no directional reveal. It fades in
            * with the press and back out as the upload panel arrives.
            */}
          {frame.borderConfirm > 0 && (
            <div
              className={styles.panelConfirm}
              style={{ opacity: frame.borderConfirm, borderRadius: panel.radius }}
            />
          )}
          <div
            className={styles.panelInner}
            data-hero-panel="inner"
            style={{
              left: panel.padding,
              top: panel.padding,
              width: panel.innerWidth,
              height: panel.innerHeight,
              borderRadius: panel.innerRadius,
              background: '#ffffff',
            }}
          >
            {/*
              * Figma stacks #f3f3f3 over #ffffff to dim the panel during
              * transfer. An opacity layer reproduces that stacking exactly and
              * keeps the animation composite-only.
              */}
            <div className={styles.panelDim} style={{ opacity: frame.dim }} />
            {/*
              * Mounted for the whole sequence and revealed by opacity: no
              * remount at the handoff, and the production drag-and-drop is
              * already live the moment it becomes visible. Pointer events are
              * withheld until it is fully revealed so the reveal is not
              * interactable mid-sequence.
              */}
            <div
              className={styles.liveDemo}
              style={{
                opacity: frame.workspaceOpacity,
                pointerEvents: interactive ? 'auto' : 'none',
              }}
              aria-hidden={interactive ? undefined : true}
            >
              <HeroWorkspaceDemo layout={workspaceLayout} />
            </div>

            {/*
              * THE DROP OVERLAY'S BACKDROP IS PART OF THE SHELL. It is the
              * panel's own drop-state surface — Figma's 5% black over the inner
              * panel with a backdrop blur, sized to fill the panel exactly like
              * the shipping .dropZone — so it is drawn at the shell's geometry,
              * never through the scene-content transform. Placed inside the
              * content layer it became a second, smaller, offset panel-shaped
              * rectangle on mobile. Only the dashed target and its copy are
              * scene content; they follow below.
              */}
            {frame.overlay && (
              <div
                className={styles.overlay}
                style={{
                  left: 0,
                  top: 0,
                  width: panel.innerWidth,
                  height: OVERLAY.height,
                  opacity: frame.overlay.opacity,
                }}
              />
            )}

            {/*
              * Scene content inside the panel — the upload panel and the dashed
              * target with its copy. One layer, so a band that re-places its
              * scene content (mobile) moves them together while the shell
              * around them and the workspace beneath them stay where they are.
              * Never interactive, so it cannot shadow the workspace once
              * resolved.
              */}
            <div className={styles.panelContent} style={panelContentStyle}>
            {frame.upload && (
              <HeroUploadPanel
                toast={UPLOAD_TOAST}
                progress={frame.upload.progress}
                barProgress={uploadBarProgress}
                // Scene Review is the authored reference: no field ahead of the edge.
                inactiveFieldAlpha={uploadBarProgress !== undefined ? 0 : undefined}
                fieldOpacity={tuning.textureOpacity}
                bandStrength={tuning.textureBandStrength}
                completeBlur={tuning.completeBlur}
                complete={frame.upload.complete}
                style={{
                  opacity: frame.upload.opacity,
                  /* Only while dismissing — a 0px filter would still cost a layer. */
                  filter: frame.upload.blur > 0 ? `blur(${frame.upload.blur}px)` : undefined,
                  /*
                   * Authored centring, at every breakpoint.
                   *
                   * The release point and the upload panel's position are two
                   * different things: WHERE the files are dropped is per
                   * breakpoint, but the acceptance UI belongs to the panel's
                   * composition and stays where it was authored. Tying the
                   * toast to the release target shifted the whole tablet and
                   * mobile composition left, which is not what the drop is
                   * meant to communicate.
                   */
                  transform:
                    uploadOffset && (uploadOffset.x !== 0 || uploadOffset.y !== 0)
                      ? `translate(calc(-50% + ${uploadOffset.x}px), ${
                          frame.upload.y + uploadOffset.y
                        }px)`
                      : `translate(-50%, ${frame.upload.y}px)`,
                }}
              />
            )}

            {frame.overlay && (
              <div
                className={styles.overlayTarget}
                style={{
                  left: 0,
                  top: 0,
                  width: panel.innerWidth,
                  height: OVERLAY.height,
                  opacity: frame.overlay.opacity,
                }}
              >
                <DashedRule
                  width={dashWidth}
                  height={dashHeight}
                  inset={OVERLAY.inset}
                  armed={frame.overlay.armed}
                />
                <div
                  className={styles.overlayCopy}
                  style={{
                    left: OVERLAY.inset,
                    width: dashWidth,
                    top: OVERLAY.inset + OVERLAY.copyTop,
                    // Leads the dashed rule out; composes with the layer alpha.
                    opacity: frame.overlay.copyOpacity,
                  }}
                >
                  <span className={styles.overlayCopyInner}>
                    Drop item to upload file to
                    <span className={styles.overlayDestination}>
                      {/*
                        * Figma's own 12x12 icon (1008:7271 / 1008:9774). NOT the
                        * production /assets/hero/demo/folder.svg, which is a
                        * different glyph: a folder WITH a plus, stroked #0A0A0A
                        * at 1.043 on a 12x10.9565 viewBox.
                        */}
                      <img
                        className={styles.overlayFolderIcon}
                        src="/assets/hero/reveal/folder-outline.svg"
                        alt=""
                      />
                      Folder 001
                    </span>
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Canvas-level scene content: the carried files and the hand. */}
        <div className={styles.canvasContent} style={canvasContentStyle}>
        {frame.dragStack && (
          <div
            className={styles.dragStack}
            style={{
              left: STACK.left,
              top: STACK.top,
              width: STACK.width,
              height: STACK.height,
              /*
               * The container is now static. The stack travel is applied to the
               * cards and the hand SEPARATELY so they can be positioned
               * independently; with identical defaults they read as attached
               * exactly as when one shared transform carried both.
               */
            }}
          >
            {/*
              * The three cards travel as ONE group. The group carries the
              * stack's travel, lag and release drift (all three cards always
              * shared the same values), and the files-only scale sits INSIDE
              * that translation about the grip point — so changing the size
              * never changes the path or the release position. At scale 1 the
              * group's translate composes with each card's own scale exactly
              * as the previous per-card transform did.
              */}
            <div
              className={styles.dragCards}
              style={{
                transformOrigin: GRIP_ORIGIN,
                transform: `translate(${frame.dragStack!.stackX + frame.dragStack!.cardLagX + frame.dragStack!.cardDropX}px, ${frame.dragStack!.stackY + frame.dragStack!.cardDropY}px)${
                  filesScale === 1 ? '' : ` scale(${filesScale})`
                }`,
              }}
            >
            {STACK.cards.map((card, index) => (
              <div
                key={card.src}
                className={styles.dragCard}
                style={{
                  left: card.wrapper.left ?? (STACK.width - card.wrapper.width) / 2,
                  top: card.wrapper.top,
                  width: card.wrapper.width,
                  height: card.wrapper.height,
                  zIndex: index,
                  opacity: frame.dragStack!.cardOpacity,
                  /* Cards only — the hand keeps its authored crispness. */
                  filter:
                    frame.dragStack!.cardBlur > 0
                      ? `blur(${frame.dragStack!.cardBlur}px)`
                      : undefined,
                  // Release shrink, about the card's own centre — the travel
                  // is on the group above.
                  transform: `scale(${frame.dragStack!.cardScale})`,
                }}
              >
                <div
                  className={styles.dragCardBox}
                  style={{
                    width: card.box.width,
                    height: card.box.height,
                    transform: `rotate(${card.rotate + frame.dragStack!.cardRotate}deg)`,
                  }}
                >
                  <img
                    className={styles.dragCardArt}
                    src={card.src}
                    alt=""
                    style={{
                      // Figma bleeds top and right, so left is unchanged and
                      // top moves up by the full vertical bleed.
                      left: card.art.left,
                      top: card.art.top - (card.bleed.height - card.art.height),
                      width: card.bleed.width,
                      height: card.bleed.height,
                    }}
                  />
                </div>
              </div>
            ))}
            </div>

            <div
              className={styles.cursor}
              style={{
                left: STACK.cursor.frame.left,
                top: STACK.cursor.frame.top,
                width: STACK.cursor.frame.size,
                height: STACK.cursor.frame.size,
                zIndex: STACK.cards.length,
                opacity: frame.dragStack.pointerOpacity,
                /*
                 * Pointer-only size, about the frame's centre — the hotspot —
                 * appended AFTER the travel so the path is untouched. Omitted
                 * at 1 so an untuned band keeps its exact previous transform.
                 */
                transform: `translate(${frame.dragStack.handX + frame.dragStack.handOffsetX + frame.dragStack.pointerExitX}px, ${frame.dragStack.handY + frame.dragStack.handOffsetY + frame.dragStack.pointerExitY}px)${
                  pointerScale === 1 ? '' : ` scale(${pointerScale})`
                }`,
              }}
            >
              {/*
                * Both hand states are authored Figma assets, crossfaded rather
                * than hard-swapped so the change reads as the hand opening
                * rather than a pop (Emil: prevent a jarring change).
                *   closed  Cursor / Type=Hand grab (463:9329)
                *   open    Cursor/Grab (561:9785) — the hero's own cursor
                */}
              <img
                className={styles.cursorArt}
                src={STACK.cursor.closedSrc}
                alt=""
                style={{ ...cursorRect, opacity: 1 - frame.dragStack.handOpen }}
              />
              <img
                className={styles.cursorArt}
                src={STACK.cursor.src}
                alt=""
                style={{ ...cursorRect, opacity: frame.dragStack.handOpen }}
              />
            </div>
          </div>
        )}
        </div>

        {/*
          * The right-hand wash (a transparent -> #fafafa gradient over the
          * panel's right edge during the drag / drop scene) is deliberately NOT
          * rendered. It faded the panel edge into the page on every band and
          * disappeared again for the upload and workspace states, so the edge
          * read as unclear and inconsistent. `frame.rightWashOpacity` is still
          * sampled for anyone who needs the authored value; nothing paints it.
          */}
        <div
          className={styles.bottomWash}
          style={{
            top: bottomWash?.top ?? HERO_BOTTOM_WASH.top,
            width: HERO_BOTTOM_WASH.width,
            height: bottomWash?.height ?? HERO_BOTTOM_WASH.height,
          }}
        />
      </div>
    </div>
  );
}
