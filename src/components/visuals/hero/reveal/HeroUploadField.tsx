/**
 * The upload panel's square field, as generated vector geometry.
 *
 * REPLACES the exported PNG. The raster could only slide: it was one image
 * pinned to the leading edge, so the whole field translated and nothing about
 * it responded to progress. It also flattened away the structure — the field is
 * really 574 accent squares in the progress line's own #6b9094 among 576
 * near-transparent white ones, which a flattened raster cannot express.
 *
 * THE FIELD DOES NOT MOVE. It is an SVG pattern in `userSpaceOnUse`, so it is
 * anchored to the panel, not to the progress edge. What moves is the frontier
 * that sweeps across it, which is what turns "an image sliding right" into
 * "a data boundary crossing a field":
 *
 *   AHEAD of the frontier    dim, inactive — the field exists but is not yet
 *                            carrying anything
 *   AT the frontier          peak alpha, where the authored falloff is opaque
 *   BEHIND the frontier      fading back over the authored 199.35px band, so
 *                            squares settle into the transferred region
 *
 * The falloff reproduces Figma's mask (Rectangle 60903) exactly: a linear
 * gradient transparent -> opaque running the band's width and ending on the
 * frontier, at the mask layer's 0.4 opacity. Because the gradient is authored
 * in user space it stays 199.35px wide at every progress value, exactly as in
 * the frame — it does not stretch with the transferred region.
 *
 * Per-frame cost is two gradient coordinates and one rect width. The 1150
 * squares are defined once inside the pattern and never touched again.
 */
import { memo, useId } from 'react';
import { decodeTexture, TEXTURE, TEXTURE_TILE } from './heroUploadTexture';

type Props = {
  /** Canonical upload progress, 0..1 — the same value the line and fill use. */
  progress: number;
  width: number;
  height: number;
  /**
   * Alpha of the not-yet-reached field. Figma authors no squares ahead of the
   * frontier (its group is only the band), so this is the one addition beyond
   * the frame. Scene Review passes 0 to stay authored-exact.
   */
  inactiveAlpha?: number;
  /** Overall field alpha multiplier — scales both the active and dim layers. */
  fieldOpacity?: number;
  /** Multiplier on the active band's peak alpha only. */
  bandStrength?: number;
};

/*
 * The lattice takes no props, so `memo` means React renders these 1150 rects
 * ONCE and skips them on every subsequent progress update. Without this the
 * squares were rebuilt as React elements on every frame — measured at ~9.7ms
 * per update, most of a 16.7ms budget, for geometry that never changes.
 */
const TextureLattice = memo(function TextureLattice() {
  const squares = decodeTexture();
  return (
    <>
      {squares.map((s, i) => (
        <rect
          key={i}
          x={s.x}
          y={s.y}
          width={TEXTURE.size}
          height={TEXTURE.size}
          fill={s.fill}
          opacity={s.opacity}
        />
      ))}
    </>
  );
});

export function HeroUploadField({
  progress,
  width,
  height,
  inactiveAlpha = 0.05,
  fieldOpacity = 1,
  bandStrength = 1,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const p = Math.max(0, Math.min(1, progress));
  const frontier = p * width;
  const bandStart = frontier - TEXTURE.bandWidth;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        <pattern
          id={`tex-${uid}`}
          patternUnits="userSpaceOnUse"
          x={TEXTURE.originX}
          y={TEXTURE.originY}
          width={TEXTURE_TILE.width}
          height={TEXTURE_TILE.height}
        >
          <TextureLattice />
        </pattern>

        {/* Figma's Rectangle 60903: transparent behind, opaque on the frontier. */}
        <linearGradient
          id={`fall-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1={bandStart}
          y1="0"
          x2={frontier}
          y2="0"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>

        <mask id={`mask-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          {/* Clipped at the frontier so nothing reads as transferred ahead of it. */}
          <rect x="0" y="0" width={Math.max(0, frontier)} height={height} fill={`url(#fall-${uid})`} />
        </mask>
      </defs>

      {/* Inactive field, only ahead of the frontier — no double-exposure behind it. */}
      {inactiveAlpha > 0 && frontier < width && (
        <rect
          x={frontier}
          y="0"
          width={width - frontier}
          height={height}
          fill={`url(#tex-${uid})`}
          opacity={inactiveAlpha * fieldOpacity}
        />
      )}

      {/* Active frontier + settled region, at the authored peak alpha. */}
      <g mask={`url(#mask-${uid})`}>
        <rect x="0" y="0" width={width} height={height} fill={`url(#tex-${uid})`} opacity={TEXTURE.peakAlpha * bandStrength * fieldOpacity} />
      </g>
    </svg>
  );
}
