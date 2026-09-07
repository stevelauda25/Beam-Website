/**
 * The upload panel — built from Figma frame 1008:8581, NOT from the shipping
 * HeroWorkspaceDemo upload panel.
 *
 * An earlier pass mounted the production panel here on the grounds that its
 * geometry matched to the decimal. Geometry was the only thing that matched:
 *
 *   base fill        Figma #292929             production #3d3d3d
 *   gradient         black 0 -> 0.3            production black 0 -> 0.2
 *   inner shadows    4                         production 2
 *   progress line    2.932 tall, BLACK shadow  production 1.466, teal glow
 *   progress fill    #4c5f61 @ 20% behind it   production has none
 *   leading texture  1150 masked dots          production has none
 *   icons            17.59 native              production 12 native, upscaled
 *
 * PROGRESS: Figma authors one frozen frame — label 92%, but line 481.518 of a
 * 566.257 track (85.04%) and fill 482.251 of 567.723 (84.94%). A live upload
 * cannot honour both, and the brief is explicit that label and bar stay
 * synchronised, so everything here is driven from a single `progress`:
 *
 *   label        round(progress * 100)
 *   line         progress * track width      -> 481.518 at progress .8504
 *   fill region  progress * panel width      -> 482.251 at progress .8494
 *   texture      pinned to the fill's right edge, so it rides the leading edge
 *
 * i.e. the authored geometry is reproduced exactly, at progress ~.85 rather
 * than at the label's 92%. See the report.
 */
import { HERO_UPLOAD, type HeroUploadToast } from './heroRevealScenes';
import { HeroUploadField } from './HeroUploadField';
import styles from './HeroRevealScene.module.css';

const ICONS = '/assets/hero/reveal/upload';

/** Figma 1008:9760 — the progress track inside the panel. */
const TRACK_WIDTH = 566.2572;

type Props = {
  toast: HeroUploadToast;
  /** 0..1. Drives the label, and the bar too unless `barProgress` is given. */
  progress: number;
  /**
   * 0..1 for the bar/fill/texture only, when it must differ from the label.
   *
   * The single use is Scene Review, which exists to be compared against Figma:
   * the authored frame pairs a 92% label with an 85.04% bar, so reproducing it
   * needs the two decoupled. The animated sequence never passes this, so label
   * and bar stay synchronised there.
   */
  barProgress?: number;
  /**
   * Alpha of the field ahead of the frontier. Figma authors no squares beyond
   * the band, so Scene Review passes 0 to reproduce the frame exactly.
   */
  inactiveFieldAlpha?: number;
  fieldOpacity?: number;
  bandStrength?: number;
  /** Max blur applied during the completion-label crossfade. */
  completeBlur?: number;
  /**
   * 0..1 crossfade to the completion label. Figma authors no completion frame,
   * so the copy follows production's own wording; the TREATMENT is a crossfade
   * in the same box and typography, never a swap.
   */
  complete?: number;
  style?: React.CSSProperties;
};

export function HeroUploadPanel({
  toast,
  progress,
  barProgress,
  complete = 0,
  inactiveFieldAlpha,
  fieldOpacity,
  bandStrength,
  completeBlur = 2,
  style,
}: Props) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const p = Math.max(0, Math.min(1, barProgress ?? progress));

  return (
    <div
      className={styles.uploadPanel}
      /* Centred in the panel — which is what Figma's authored x=188.935 in a
         946-wide panel already resolves to — with the authored top kept. */
      style={{ top: toast.top, width: toast.width, height: toast.height, ...style }}
    >
      {/* 1008:8582 — the transferred region, sitting behind the content. */}
      {/*
        * Rendered at full width and SCALED, not animated on `width`: width is a
        * layout+paint property and this runs every frame for 1800ms. scaleX from
        * the left edge is composite-only and, on a flat fill, pixel-identical.
        */}
      <div
        className={styles.uploadFill}
        style={{ width: toast.width, transform: `scaleX(${p})` }}
      />

      {/*
        * 1008:8583 — the square field, now GENERATED VECTOR GEOMETRY rather
        * than an exported raster. It spans the whole panel and does not move:
        * the frontier sweeps across it. See HeroUploadField.
        */}
      <div className={styles.uploadTextureLayer}>
        <HeroUploadField
          progress={p}
          width={toast.width}
          height={HERO_UPLOAD.texture.height}
          inactiveAlpha={inactiveFieldAlpha}
          fieldOpacity={fieldOpacity}
          bandStrength={bandStrength}
        />
      </div>

      {/* 1008:9737 — header row. */}
      <div className={styles.uploadHeader}>
        <div className={styles.uploadTitle}>
          <img src={`${ICONS}/icon-upload.svg`} alt="" />
          {/*
            * Both labels occupy the same grid cell and crossfade, so the
            * resolution reads as the same line of text settling rather than one
            * string being replaced by another.
            */}
          {/*
            * Emil's crossfade blend. The two strings differ by a few glyphs and
            * overlap almost exactly, so a pure opacity crossfade renders as
            * doubled text at the midpoint. A blur that peaks with the overlap
            * and returns to 0 at both ends fuses them into one perceived
            * transformation. Capped at 2px; opacity stays the primary channel
            * and there is no directional slide.
            */}
          <span className={styles.uploadLabel}>
            <span
              style={{ opacity: 1 - complete, filter: `blur(${(completeBlur * complete).toFixed(2)}px)` }}
            >
              {`Uploading ${toast.files} files`}
            </span>
            <span
              style={{ opacity: complete, filter: `blur(${(completeBlur * (1 - complete)).toFixed(2)}px)` }}
            >
              {`Uploaded ${toast.files} files`}
            </span>
          </span>
        </div>
        <div className={styles.uploadPercentWrap}>
          <span className={styles.uploadPercent}>{`${percent}%`}</span>
        </div>
        <div className={styles.uploadActions}>
          <span className={styles.uploadAction}>
            <img src={`${ICONS}/icon-pause.svg`} alt="" />
          </span>
          <span className={styles.uploadAction}>
            <img src={`${ICONS}/icon-chevron.svg`} alt="" />
          </span>
        </div>
        <img className={styles.uploadDivider} src={`${ICONS}/divider.svg`} alt="" />
        <span className={styles.uploadAction}>
          <img src={`${ICONS}/icon-close.svg`} alt="" />
        </span>
      </div>

      {/* 1008:9760 / Vector 6877 — the progress line. */}
      <div className={styles.uploadTrack}>
        {/*
          * Rendered only once it has real width. At exactly 0 the element is
          * zero-wide but its two drop shadows still smudge a few pixels at the
          * track origin, which is not an authored state.
          */}
        {p * TRACK_WIDTH > 0.5 && (
          // Same reasoning as the fill: full width, scaled from the left edge.
          <div
            className={styles.uploadLine}
            style={{ width: TRACK_WIDTH, transform: `scaleX(${p})` }}
          />
        )}
      </div>
    </div>
  );
}
