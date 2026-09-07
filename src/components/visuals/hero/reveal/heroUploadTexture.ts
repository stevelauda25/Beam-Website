/**
 * The upload panel's square field — extracted from Figma, not approximated.
 *
 * Source: group 1008:8586 inside the masked group 1008:8584 (Figma frame
 * 1008:8581). Read programmatically from the file rather than eyeballed:
 *
 *   1150 rects, a PERFECT 50 x 23 lattice (isFullLattice verified)
 *   2.02 x 2.02 each, corner radius 0
 *   pitch 4.04 on both axes, origin (-0.58, 0)
 *   574 squares filled #6b9094 at opacity 1   <- the progress line's own colour
 *   576 squares filled #ffffff at opacity 0.00 - 0.10
 *
 * The teal/white split is the real structure of this texture and is invisible
 * in a flattened raster: the accent squares are the "data", the near-transparent
 * white ones are the lattice they sit in. That is why this is now generated
 * geometry rather than an exported PNG.
 *
 * ENCODING — one string per row, one character per column, left to right:
 *   'T'        -> teal #6b9094 at full opacity
 *   '0'..'a'   -> white, base36 digit = fill opacity in percent (0..10)
 */

export const TEXTURE = {
  cols: 50,
  rows: 23,
  /** Square edge length. */
  size: 2.02,
  /** Lattice pitch, both axes. */
  pitch: 4.04,
  /** Authored origin of the first square within the band. */
  originX: -0.58,
  originY: 0,
  /** Authored band size (1008:8583) — the falloff distance behind the frontier. */
  bandWidth: 199.35,
  bandHeight: 90.88,
  /** Figma's mask layer opacity (Rectangle 60903), i.e. the field's peak alpha. */
  peakAlpha: 0.4,
  accent: '#6b9094',
} as const;

/** 23 rows x 50 columns, read off the Figma lattice. */
export const TEXTURE_ROWS: readonly string[] = [
  '8T10TT5286TTTTT9156T62TTT7a1aTTTTT44T968573T1T37T0',
  'T9T9T46T7Ta62T86TTT9TTT24T6TTT8T3TTTT5TTTT94TT0996',
  'TT54TTT75T76T859T252T1T16405860TTT85TTT36TTTT09TTT',
  '57TTT5TTT3T3T41TTTTTT6598TT75TT9TTT3TT1TT1TTTT7TTT',
  'TTT7T581863759TT633TTT2TT581042a9TT4361T1T48633T3T',
  'T84TTT65T78TTT74T548T573T39T906TTT1TTTTT07T6T445T5',
  '9T6T512TTTTTTT15T2TTT0T33aTT6T5T8TTT431T9T74T528TT',
  'T38137T76a6TTT61TTTTT63333TT6T25TT9952T97T9661TT9T',
  'TTT25067TT4TT1TTTTTT8TT6TT517T422T7TaT4TT78T113T4T',
  'TTT443TT38TT182T947934TTT3TT9aT22T2a36T426359TTTTT',
  'TTT8TT5TT852T9T2T6T4T4TTT4TTTTT5TTTTT5T69T40TTTT3T',
  'TTT2T4T6T6TTT25TTT6T3T7T436TT3TT64TT6T5TT4a325T5T9',
  'TT10TTT1TT4T3TTTTTTTT53T183TTTT615T1T7TT1231TTT44T',
  '6TT62TTT1TT9T5TT6T1T7T0T32T9T5a9T4TTaTT0TT77TT3TTT',
  'T65566TTTT11T36TTT92TTTT2Ta44T2560T1T7TT40TTTT9TT2',
  'T4252T5TTTTT96T1T2T4T9T12T16671TT37680T5T43T0248TT',
  '5TT6T0T3T0TT3T7T97TT3873T2529878TTT68TTa53560TTTTT',
  'T51512T5TTT41TTTTT3T9TTTaT3T7TT19TT9TT4T4T83TT3T95',
  '9aT508T45T8TTT6T388TTT83TTaT2TTTTTT98T75214TT8T5TT',
  'T01TT9T232T1Taa7T56T3TT2TTTTT6986355a4T53T3T5TT231',
  'TT25Ta6TTTa1T54TT4TTTTT58T6T95T22T894T5aT52TT83T6T',
  'TTTT59T2494TT8TT6TTaT6TTT534TT6TTTTTTT5TTTTT2TTTTT',
  '29TT356TT81TT1T05T7TaT3T2TTT4645TTTTTT15TTTTT958T1',
];

export type TextureSquare = {
  x: number;
  y: number;
  fill: string;
  opacity: number;
};

/**
 * Decode the rows into placed squares, in LATTICE-LOCAL coordinates starting at
 * (0, 0). The authored origin offset is applied by the SVG pattern's own x/y so
 * that no square is clipped by the pattern tile boundary.
 */
export function decodeTexture(): TextureSquare[] {
  const out: TextureSquare[] = [];
  for (let r = 0; r < TEXTURE_ROWS.length; r += 1) {
    const row = TEXTURE_ROWS[r];
    for (let c = 0; c < row.length; c += 1) {
      const ch = row[c];
      const teal = ch === 'T';
      out.push({
        x: c * TEXTURE.pitch,
        y: r * TEXTURE.pitch,
        fill: teal ? TEXTURE.accent : '#ffffff',
        opacity: teal ? 1 : parseInt(ch, 36) / 100,
      });
    }
  }
  return out;
}

/** Tile size of the lattice, used as the SVG pattern's period. */
export const TEXTURE_TILE = {
  width: TEXTURE.cols * TEXTURE.pitch,
  height: TEXTURE.rows * TEXTURE.pitch,
} as const;
