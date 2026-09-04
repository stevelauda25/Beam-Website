"use client";

import { forwardRef } from "react";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ON-DEMAND PANEL — one panel, authored once, for all three states.
 *
 * The three Figma frames were three separate flattened exports. Measuring them
 * showed they are not three designs at all: they are ONE file list drawn at
 * three scales. The row grid sits at an identical offset from the panel's
 * top-left corner in every frame —
 *
 *              content scale   row 0 offset (content units)
 *   state 1        1.0000            91.30
 *   state 2        0.8120            91.33
 *   state 3        1.1999            91.22
 *
 * — and the panel radius and the inset of the grey card track that same scale
 * (9.95902 / 3.32 content units in all three). So this file rebuilds the panel
 * ONCE in "content units" — the state 1 coordinate space, measured from the
 * panel's top-left corner — and the section drives three numbers: the panel box,
 * the content scale, and which pieces are showing.
 *
 * The old exports are gone from the render path. Their coordinates survive only
 * as the reference table above and the constants below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Content-unit geometry, all measured off the exports, all relative to the
 *  panel's top-left corner at content scale 1. */
export const PANEL = {
  /** Inset of the grey card, and the two radii. */
  innerInset: 7.47,
  /*
   * Radii matched to the Beam visual-card reference (.machineCard in
   * SolutionVisual, which already shares this shell's exact four-drop plus
   * two-inset shadow stack). Measured live: its corner is 3.1171% of its own
   * width and its header 1.5564%, so on this 487.992-wide panel that is
   * 15.21 and 7.60. The export's own 9.95902 / 3.32 read noticeably squarer
   * than the rest of the system.
   */
  innerRadius: 7.6,
  radius: 15.21,
  hairline: 0.83,
  /** The white list surface inside the grey card. */
  list: { left: 8.3, top: 63.299, right: 8.3, bottom: 8.299, radius: 7.6 },
  /** The file rows. */
  row0: 91.3,
  pitch: 35.32,
  iconX: 29.55,
  labelX: 59.6,
  rowHeight: 18,
} as const;

/** The drawing space of the content SVG: the panel plus everything that hangs
 *  off it (the connector to the left, the satellites below). */
/*
 * TWO DRAWING SPACES, TWO ANCHORS.
 *
 * The panel's interior is measured from the panel's TOP-LEFT corner, because
 * that is what the header and the rows hang off. Everything that sits outside
 * the panel is measured from the panel's BOTTOM edge, because that is what it
 * has to stay clear of.
 *
 * They used to share the top anchor, and the satellites were pinned at fixed
 * content coordinates. But the panel's bottom edge is height / scale, which
 * travels 405.4 -> 356.4 -> 407.0 content units across the scrub — so the gap
 * under the panel swung by fifty units and the disk card spent the whole of its
 * fade-in twenty-one units INSIDE the card. Anchoring the band to the bottom
 * edge makes that gap a constant, at every scroll position, by construction.
 */
const PANEL_VIEW = { x: -80, y: 0, w: 700, h: 460 } as const;
export const CONTENT_VIEWBOX = `${PANEL_VIEW.x} ${PANEL_VIEW.y} ${PANEL_VIEW.w} ${PANEL_VIEW.h}`;
export const CONTENT_OFFSET_X = PANEL_VIEW.x;
export const CONTENT_W = PANEL_VIEW.w;
export const CONTENT_H = PANEL_VIEW.h;

/** The band below the panel. y = 0 is the panel's bottom edge. */
const BAND_VIEW = { x: -80, y: -140, w: 700, h: 400 } as const;
export const BAND_VIEWBOX = `${BAND_VIEW.x} ${BAND_VIEW.y} ${BAND_VIEW.w} ${BAND_VIEW.h}`;
export const BAND_OFFSET_X = BAND_VIEW.x;
export const BAND_OFFSET_Y = BAND_VIEW.y;
export const BAND_W = BAND_VIEW.w;
export const BAND_H = BAND_VIEW.h;

/*
 * Satellite geometry, in content units measured DOWN FROM THE PANEL'S BOTTOM
 * EDGE. Both gaps come straight off the exports:
 *   disk card   (330.25 - 310.68) / 0.812   = 24.10
 *   ready ring  (481    - 453.721) / 1.18857 = 22.95
 */
const DISK = { x: 0.31, y: 24.1, w: 529.6, h: 174.2, r: 10.8, pad: 27.6 } as const;
const CAPTION_Y = 216.16;

/** Where the state 1 panel sits on the export canvas. */
const PANEL_ORIGIN = { x: 170, y: 143 } as const;

const INK = "#0A0A0A";
const MUTED = "#8F8F8F";
const BLUE = "#0D76F2";
const GREEN = "#129457";

type Row = { label: string; kind: "folder" | "file" };

/*
 * Type sizes, calibrated against the width the exports actually render each
 * string at rather than guessed. State 1's bottom line is set in Inter (the
 * export's own .od-counter rule); every other line is the mono face.
 */
const TYPE = {
  row: 19.3,
  header: 18.3,
  footer1: 20,
  footer3: 20.2,
  ready: 19.7,
  size: 16,
} as const;

/*
 * DIAGNOSTIC ORDER — TEMPORARY. Revert after the device check.
 *
 * On a real phone (Safari and Chrome both) the tree paints with two blank
 * row-sized slots, at positions 2 and 6, where README.md and "..." should be.
 * Every other explanation has been eliminated: the DOM nodes exist with
 * opacity 1 and valid boxes, the subtrees are byte-identical, React keys are
 * unique, there are no duplicate SVG ids, and neutralising the shell's
 * will-change hint changed nothing.
 *
 * So this swaps ONLY the order of this array to separate the two remaining
 * possibilities. Nothing else in the file, the JSX, the styles or the geometry
 * changes -- each row still renders through the identical code path, just at a
 * different index.
 *
 *   blanks stay at positions 2 and 6  -> the failure follows POSITION
 *   blanks follow README.md and "..." -> the failure follows CONTENT
 *
 * app.ts stays at index 4 on purpose: SELECTED_ROW is 4, so State 2's
 * selection, size readout and connector anchor are unaffected.
 *
 * Original order: apps/ packages/ README.md auth.ts app.ts utils.ts ...
 */
const ROWS: Row[] = [
  { label: "apps/", kind: "folder" },
  { label: "packages/", kind: "folder" },
  { label: "auth.ts", kind: "file" },
  { label: "README.md", kind: "file" },
  { label: "app.ts", kind: "file" },
  { label: "...", kind: "file" },
  { label: "utils.ts", kind: "file" },
];

/**
 * The success check, in BAND units — measured from the panel's bottom edge.
 * From the state 3 export at its content scale of 1.18857: ring
 * (204.5-170)/1.18857 = 29.03 across, (481-453.721)/1.18857 = 22.95 below the
 * panel, copy at (237.68-170)/1.18857 = 56.94, ring width 21/1.18857 = 17.67.
 */
const READY = { x: 29.03, y: 22.95, r: 8.83, copyX: 56.94 } as const;

/** app.ts — the row state 2 selects and measures. */
const SELECTED_ROW = 4;

/*
 * DIAGNOSTIC NUDGE — TEMPORARY. Revert after the device check. NOT a fix.
 *
 * On a real phone, positions 2 and 6 paint as blank row-sized slots whatever
 * content sits there -- proven by the row-order swap in the previous commit,
 * where the blanks stayed at 2 and 6 while README.md and "..." moved away and
 * rendered correctly. Static analysis then found NO difference between those
 * two positions and the five that work: no index-specific logic anywhere in the
 * codebase, byte-identical subtrees, identical overlays, identical paint order.
 *
 * So this moves ONLY those two rows 6 units down, leaving their indices, DOM
 * order, classes, content, icons, stagger and opacity untouched:
 *
 *   they appear     -> the failure follows the COORDINATE / raster position
 *   they stay blank -> the failure follows the INDEX / DOM order
 *
 * The list will look visibly uneven at those two rows; that is expected. 6 is
 * safe: the pitch is 35.32 against a 22.5-unit row, so nothing can overlap.
 */
const rowNudge = (index: number) => (index === 2 || index === 6 ? 6 : 0);

const rowTop = (index: number) =>
  PANEL.row0 + index * PANEL.pitch + rowNudge(index);
/** Rows are set on a 20-unit mono face; this is its optical centre line. */
const rowBaseline = (index: number) => rowTop(index) + 14.6;

/*
 * ICONS ARE LIFTED FROM THE EXPORT, NOT REDRAWN.
 *
 * The first pass hand-authored these and got them wrong twice over: the file
 * glyph came out reading as a folder, and absolute commands left in relative
 * runs (a stray "V6.2", an "A ... 8.6 2") shot a line from the bottom row up to
 * the top of the drawing — the vertical stripe running through every row.
 *
 * These are the approved paths, verbatim, at their original canvas coordinates.
 * Nothing is re-typed, so nothing can be mistyped. Each glyph is placed with a
 * transform instead: CANVAS_TO_CONTENT moves the export's origin onto the
 * panel's top-left corner, and a row offset slides it to the row that wants it.
 */
const CANVAS_TO_CONTENT = `translate(${-PANEL_ORIGIN.x} ${-PANEL_ORIGIN.y})`;
const STROKE = {
  strokeWidth: 1.66667,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** The folder glyph, as exported on row 0. */
function FolderPaths({ color }: { color: string }) {
  return (
    <>
      <path
        d="M202.883 236.883H207.656L207.16 235.823C206.748 234.944 205.866 234.383 204.896 234.383H202.05C200.67 234.383 199.55 235.503 199.55 236.883V240.216C199.55 238.374 201.041 236.883 202.883 236.883Z"
        fill={color}
      />
      <path
        d="M199.55 240.216V236.883C199.55 235.503 200.67 234.383 202.05 234.383H204.896C205.866 234.383 206.748 234.944 207.16 235.823L207.656 236.883"
        stroke={color}
        fill="none"
        {...STROKE}
      />
      <path
        d="M202.883 236.883H213.716C215.558 236.883 217.05 238.374 217.05 240.216V246.049C217.05 247.891 215.558 249.383 213.716 249.383H202.883C201.041 249.383 199.55 247.891 199.55 246.049V240.216C199.55 238.374 201.041 236.883 202.883 236.883Z"
        stroke={color}
        fill="none"
        {...STROKE}
      />
    </>
  );
}

/** The document glyph, as exported on row 2 — the folded-corner page. */
function FilePaths({ color }: { color: string }) {
  return (
    <>
      <path
        d="M209.55 310.022H215.383C215.383 309.487 215.171 308.977 214.795 308.6L210.97 304.775C210.593 304.399 210.083 304.187 209.551 304.187V310.02L209.55 310.022Z"
        fill={color}
      />
      <path
        d="M209.55 304.188V310.022H215.383"
        stroke={color}
        fill="none"
        {...STROKE}
      />
      <path
        d="M210.972 304.777L214.795 308.6C215.172 308.977 215.383 309.487 215.383 310.02V318.355C215.383 320.197 213.892 321.688 212.05 321.688H204.55C202.708 321.688 201.217 320.197 201.217 318.355V307.522C201.217 305.68 202.708 304.188 204.55 304.188H209.552C210.085 304.188 210.595 304.4 210.972 304.777Z"
        stroke={color}
        fill="none"
        {...STROKE}
      />
    </>
  );
}

/** The cloud on the header row. */
function CloudPaths({ color }: { color: string }) {
  return (
    <>
      <path
        d="M213.26 176.456C213.053 173.884 210.924 171.854 208.3 171.854C205.539 171.854 203.3 174.093 203.3 176.854C203.3 177.243 203.354 177.617 203.437 177.98C201.663 178.054 200.244 179.507 200.244 181.299C200.244 183.14 201.736 184.632 203.577 184.632H212.189C214.49 184.632 216.355 182.767 216.355 180.466C216.355 178.537 215.039 176.93 213.26 176.456Z"
        stroke={color}
        fill="none"
        {...STROKE}
      />
      <path
        d="M209.083 177.688C209.846 176.835 210.954 176.299 212.189 176.299C212.559 176.299 212.919 176.364 213.26 176.455"
        stroke={color}
        fill="none"
        {...STROKE}
      />
    </>
  );
}

/** The two-page glyph on the bottom row — state 1 and state 3 share it. */
function CountPaths({ color }: { color: string }) {
  return (
    <>
      <path
        d="M205.244 507.079H201.911C201.298 507.079 200.8 506.581 200.8 505.968V498.19C200.8 497.577 201.298 497.079 201.911 497.079H206.355L208.578 499.301V500.412"
        stroke={color}
        fill="none"
        {...STROKE}
      />
      <path
        d="M205.8 497.079V499.301H208.022"
        stroke={color}
        fill="none"
        {...STROKE}
      />
      <path
        d="M215.8 505.414V512.08C215.8 512.694 215.302 513.191 214.689 513.191H209.134C208.52 513.191 208.022 512.694 208.022 512.08V504.303C208.022 503.689 208.52 503.191 209.134 503.191H213.578L215.8 505.414Z"
        stroke={color}
        fill="none"
        {...STROKE}
      />
      <path
        d="M213.577 503.191V505.414H215.799"
        stroke={color}
        fill="none"
        {...STROKE}
      />
    </>
  );
}

/** The row each glyph was exported on, so the others are a pitch offset away. */
/** The bottom line's baseline: the export sets its text at canvas y 512. */
const FOOTER_BASELINE = 512 - 143;

const FOLDER_BASE_ROW = 0;
const FILE_BASE_ROW = 2;

export type OnDemandPanelProps = {
  /** Ref onto the counting number, so the section can drive it. */
  countRef?: React.Ref<SVGTextElement>;
};

/**
 * Every element that belongs to only one state carries a `p-*` class. The
 * section tweens their opacity on the scroll timeline; nothing here holds state
 * or runs a clock of its own.
 */
export const OnDemandPanel = forwardRef<SVGSVGElement, OnDemandPanelProps>(
  function OnDemandPanel({ countRef }, ref) {
    return (
      <svg
        ref={ref}
        className="od-content"
        viewBox={CONTENT_VIEWBOX}
        fill="none"
        aria-hidden="true"
      >
        {/* ── The connector, state 2: app.ts out to the disk card ─────────── */}

        {/*
          ── The header: PERSISTENT SHELL LAYER, not a state foreground ──────
          The cloud mark and the path name are ONE header, and it names the one
          object every state is a view of, so both belong to the shell rather
          than to State 1. There is no .p-header group any more: nothing
          animates this group's opacity, no state wrapper contains it, and the
          first-view cascade no longer reaches it. It moves only because the
          shell it is drawn in moves.
        */}
        <g className="p-title" color={MUTED}>
          <g className="p-header-icon">
            <g transform={CANVAS_TO_CONTENT}>
              <CloudPaths color={MUTED} />
            </g>
          </g>
          <text
            className="od-mono"
            x={PANEL.labelX}
            y={44}
            fontSize={TYPE.header}
            fill={MUTED}
          >
            ~/code/monorepo
          </text>
        </g>

        {/* ── The file rows ───────────────────────────────────────────────── */}
        {/* State 2's selection highlight, behind the row it selects. */}
        <g className="p-state2">
        <g className="p-select">
          <rect
            x={19.09}
            y={rowTop(SELECTED_ROW) - 8}
            width={456.9}
            height={34.5}
            rx={5.85}
            fill="#F4F9FF"
          />
          <rect
            x={19.09 + 0.37}
            y={rowTop(SELECTED_ROW) - 8 + 0.37}
            width={456.9 - 0.74}
            height={34.5 - 0.74}
            rx={5.48}
            fill="none"
            stroke={BLUE}
            strokeWidth={0.73}
          />
        </g>
        </g>

        {ROWS.map((row, index) => (
          <g key={row.label} className={`p-row p-row-${index}`} color={MUTED}>
            <g
              transform={`translate(0 ${
                (index -
                  (row.kind === "folder" ? FOLDER_BASE_ROW : FILE_BASE_ROW)) *
                  PANEL.pitch +
                /* Same nudge rowTop applies: the icon derives its own offset,
                   so without this the glyph would stay put while its label
                   moved. Diagnostic only. */
                rowNudge(index)
              }) ${CANVAS_TO_CONTENT}`}
            >
              {row.kind === "folder" ? (
                <FolderPaths color={MUTED} />
              ) : (
                <FilePaths color={MUTED} />
              )}
            </g>
            <text
              className="od-mono"
              x={PANEL.labelX}
              y={rowBaseline(index)}
              fontSize={TYPE.row}
              fill={INK}
            >
              {row.label}
            </text>
          </g>
        ))}

        {/* app.ts's size, state 2 only. */}
        <g className="p-state2">
          <text
            className="od-mono p-size"
            x={214}
            y={rowBaseline(SELECTED_ROW)}
            fontSize={TYPE.size}
            fill={BLUE}
          >
            42kb
          </text>
        </g>

        {/*
          The top of the list fades out in states 2 and 3, where the panel is a
          window part-way down a much longer tree rather than the top of it.
        */}
        <rect
          className="p-topfade"
          x={PANEL.list.left}
          y={PANEL.list.top}
          width={487.992 - PANEL.list.left * 2}
          height={90}
          fill="url(#odTopFade)"
        />

        {/* ── The bottom line. State 1 and state 3 share this row. ─────────── */}
        <g className="p-footer1" color={MUTED}>
          <g className="p-footer1-icon">
            <g transform={CANVAS_TO_CONTENT}>
              <CountPaths color={MUTED} />
            </g>
          </g>
          <text
            className="od-sans"
            x={PANEL.labelX}
            y={FOOTER_BASELINE}
            fontSize={TYPE.footer1}
            fill={MUTED}
          >
            12,480 files available
          </text>
        </g>

        <g className="p-footer3" color={BLUE}>
          <g transform={CANVAS_TO_CONTENT}>
            <CountPaths color={BLUE} />
          </g>
          <text
            ref={countRef}
            className="od-mono p-count-text"
            x={PANEL.labelX}
            y={FOOTER_BASELINE}
            fontSize={TYPE.footer3}
            fill={BLUE}
          >
            0 files+ available
          </text>
        </g>

        {/* ── Satellite: state 2's disk-usage card, below the panel ────────── */}

        {/* ── Satellite: state 3's success check, below the panel ──────────── */}

        <defs>
          <linearGradient id="odTopFade" x1="0" y1={PANEL.list.top} x2="0" y2={PANEL.list.top + 90} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  },
);

/**
 * State 3's success check, hung off the panel's bottom edge so its gap under the
 * card is fixed no matter where the scrub is.
 */
export function OnDemandSatellites() {
  return (
    <svg
      className="od-content"
      viewBox={BAND_VIEWBOX}
      fill="none"
      aria-hidden="true"
    >
      {/*
        The connector runs from the app.ts row, which lives in the panel's own
        coordinate space, down to the card. Its start is therefore expressed at
        the row's position as measured at state 2 — where it is the only state
        this is drawn at full opacity.
      */}
      <g className="p-ready" color={GREEN}>
      <g className="p-ready-mark">
        <circle
          cx={READY.x + READY.r}
          cy={READY.y + READY.r}
          r={READY.r}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.667}
        />
        <path
          d={`M${READY.x + 4.7} ${READY.y + 9}l3 3 5.7-6.7`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.667}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          className="od-mono"
          x={READY.copyX}
          y={READY.y + 15.2}
          fontSize={TYPE.ready}
          fill={GREEN}
        >
          Ready in 1.2s
        </text>
      </g>
      </g>
    </svg>
  );
}

/*
 * ── THE LINK LAYER ──────────────────────────────────────────────────────────
 * State 2's connector and disk card, in STAGE (canvas) coordinates, anchored to
 * nothing that moves.
 *
 * They used to live in the band under the panel — anchored to the panel's
 * BOTTOM edge — while app.ts is anchored to its TOP. Any change of height or
 * scale therefore slid the connector's start off the row and carried the card
 * up and down with the panel. Neither is a satellite of the panel's edge:
 *
 *   the connector's START is app.ts, wherever the panel puts it this frame
 *   the connector's END and the card are ONE fixed State 2 destination
 *
 * So the card is drawn once at its State 2 position and never moves, and the
 * connector's path is resolved ONCE from the State 2 anchor and held (see
 * setLinkGeometry in OnDemand.tsx) — never rewritten while the stroke trims.
 * Its dash pattern comes from the REAL measured getTotalLength(), so there is no
 * pathLength normalisation to reason about.
 */
/** The panel's content scale and bottom edge at State 2, off the exports. */
const S2_SCALE = 0.812;
const S2_PANEL_BOTTOM = 21.2515 + 289.431;

/** The panel's translate at State 2, off the exports. */
const S2_PANEL_Y = 21.2515;

/*
 * The connector's route, recovered verbatim from the approved export's own path
 * data (authored there as a filled outline, so these are its centre-line
 * coordinates): a 3.333 dot at (156.25, 222.75), left to 133.75, an 8.75 radius
 * corner down onto x=125, down to 391.5, a matching corner, right to 150.625,
 * and an arrowhead whose tip lands at 156.25. Stroke 1.25.
 */
export const LINK = {
  /** app.ts anchor, in content units — solves to the export's (156.25, 222.75). */
  rowX: (156.25 - 170) / S2_SCALE,
  rowY: (222.75 - S2_PANEL_Y) / S2_SCALE,
  /** That anchor under State 2's translate and scale — the ONLY visible start. */
  startX: 156.25,
  startY: 222.75,
  /** The vertical run, the corner radius and the landing point, in canvas units. */
  cornerX: 125,
  cornerR: 8.75,
  endX: 150.625,
  endY: 400.25,
  strokeWidth: 1.25,
  dotR: 3.333,
  /** The arrowhead at the destination, as exported. */
  arrow: { tipX: 156.25, backX: 150, halfH: 3.608 },
} as const;

export function OnDemandLink() {
  return (
    <svg
      className="od-content"
      viewBox="0 0 809 692"
      fill="none"
      aria-hidden="true"
    >
      {/* Owned by the click controller only: hidden while a direct 1<->3 skip passes through state 2. */}
      <g className="p-state2">
        <g className="p-connector">
          {/*
            Static geometry. The section resolves d, cx and cy once at mount and
            on refresh, never per frame; it also measures getTotalLength() there
            and owns the dash pattern. During the draw only the dash offset moves.
          */}
          <path
            className="p-conn-line"
            d={`M${LINK.startX} ${LINK.startY} H${LINK.cornerX + LINK.cornerR} A${LINK.cornerR} ${LINK.cornerR} 0 0 0 ${LINK.cornerX} ${LINK.startY + LINK.cornerR} V${LINK.endY - LINK.cornerR} A${LINK.cornerR} ${LINK.cornerR} 0 0 0 ${LINK.cornerX + LINK.cornerR} ${LINK.endY} H${LINK.endX}`}
            fill="none"
            stroke={BLUE}
            strokeWidth={LINK.strokeWidth}
          />
          <circle className="p-conn-a" cx={LINK.startX} cy={LINK.startY} r={LINK.dotR} fill={BLUE} />
          {/* The destination is an arrowhead in the original, not a dot. */}
          <path
            className="p-conn-b"
            d={`M${LINK.arrow.tipX} ${LINK.endY} L${LINK.arrow.backX} ${LINK.endY - LINK.arrow.halfH} L${LINK.arrow.backX} ${LINK.endY + LINK.arrow.halfH} Z`}
            fill={BLUE}
          />
        </g>

        {/* The card, at its one State 2 position: band units mapped onto the canvas. */}
        <g transform={`translate(170 ${S2_PANEL_BOTTOM}) scale(${S2_SCALE})`}>
          <g className="p-disk">
            <g className="p-disk-body">
            <rect x={DISK.x} y={DISK.y} width={DISK.w} height={DISK.h} rx={DISK.r} fill={BLUE} />
            {/* black/10 hairline on the blue frame — export 170.616 / sw 0.731292 */}
            <rect
              x={0.759}
              y={24.55}
              width={528.66}
              height={173.28}
              rx={10.36}
              fill="none"
              stroke="#000000"
              strokeOpacity={0.1}
              strokeWidth={0.9}
            />
            <rect
              x={DISK.x + 9}
              y={DISK.y + 9}
              width={DISK.w - 18}
              height={DISK.h - 18}
              rx={3.6}
              fill="#ffffff"
            />
            {/* #7CB8FE ring around the white field — export 177.253 / sw 0.731292 */}
            <rect
              x={8.93}
              y={32.72}
              width={512.31}
              height={156.94}
              rx={4.05}
              fill="none"
              stroke="#7CB8FE"
              strokeWidth={0.9}
            />
            <text className="od-sans" x={29.36} y={DISK.y + 59.44} fontSize={23.91} fill={INK}>
              On your disk
            </text>
            {/* Written by the section from the shared loading progress. */}
            <text
              className="od-mono p-disk-percent"
              x={214.21}
              y={DISK.y + 56.9}
              fontSize={20.93}
              fill={BLUE}
            >
              0.0%
            </text>
            {/*
              The export's own construction: a rounded track and a SQUARE fill,
              both inside one rounded clip (its clip9). The clip gives the fill a
              rounded left cap for free while its advancing right edge stays
              flat — which a radius on the fill itself could not do.
            */}
            <clipPath id="od-bar-clip">
              <rect
                x={27.86}
                y={DISK.y + 79.89}
                width={474.46}
                height={14.41}
                rx={7.2}
              />
            </clipPath>
            <g clipPath="url(#od-bar-clip)">
              <rect
                x={27.86}
                y={DISK.y + 79.89}
                width={474.46}
                height={14.41}
                rx={7.2}
                fill="#EBEBEB"
              />
              <rect
                className="p-progress"
                x={27.86}
                y={DISK.y + 79.89}
                width={26.86}
                height={14.41}
                fill={BLUE}
              />
            </g>
            {/* black/10 hairline on the track — export 192.984 / sw 0.731292 */}
            <rect
              x={28.31}
              y={DISK.y + 80.34}
              width={473.56}
              height={13.51}
              rx={6.75}
              fill="none"
              stroke="#000000"
              strokeOpacity={0.1}
              strokeWidth={0.9}
            />
            {/*
              Two absolutely positioned tspans, matching the export's own x
              coordinates. Positioning the capacity independently also stops it
              being pushed around as the loading figure changes width.
            */}
            <text className="od-sans" y={DISK.y + 141.85} fontSize={23.77} fill={INK}>
              <tspan className="p-disk-mb" x={28.92}>
                0 MB
              </tspan>
              <tspan x={120.92} fontSize={24.48} fill={MUTED}>
                of 8.1 GB
              </tspan>
            </text>
            </g>
            <text
              className="od-sans p-caption"
              x={30.59}
              y={CAPTION_Y + 23.44}
              fontSize={24.24}
              fill={INK}
            >
              Only this file is stored
              <tspan fill={MUTED}> locally</tspan>
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
}

/*
 * ── THE FRAMING WASH ────────────────────────────────────────────────────────
 *
 * The approved visuals never exposed the whole canvas. Each one paints #FAFAFA
 * gradient rects OVER the composition — not a clip, not a mask — so the artwork
 * dissolves into the page ground at its right edge, and in states 2 and 3 along
 * the top as well. Every gradient in all three exports shares one profile:
 * transparent at the near edge, fully #FAFAFA from offset 0.660644 onward.
 *
 * Recovered geometry, verbatim (state 3's top band is the export's rotated rect
 * resolved into canvas coordinates; state 1 has no top band, so its band is
 * parked directly above the canvas and slides down as the panel rises):
 *
 *   state 1  right x218 w505      (opaque from x 551.63)   top — none
 *   state 2  right x209.5 w418    (opaque from x 485.66)   top y0 h201   (opaque above y 68.19)
 *   state 3  right x492.5 w291    (opaque from x 684.25)   top y-30 h314 (opaque above y 76.56)
 */
export const FRAME = [
  { right: { x: 218, y: -51, w: 505, h: 795 }, top: { x: 152.5, y: -201, w: 795, h: 201 } },
  { right: { x: 209.5, y: -118, w: 418, h: 795 }, top: { x: 152.5, y: 0, w: 795, h: 201 } },
  { right: { x: 492.5, y: -131, w: 291, h: 954 }, top: { x: 146, y: -30, w: 954, h: 314 } },
] as const;

/** The exports' shared stop profile, in objectBoundingBox so it rides the rect. */
const FADE_STOP = 0.660644;

export function OnDemandFrame() {
  return (
    <svg
      className="od-content"
      viewBox={`0 0 ${809} ${692}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="od-frame-right" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#FAFAFA" stopOpacity="0" />
          <stop offset={FADE_STOP} stopColor="#FAFAFA" />
          <stop offset="1" stopColor="#FAFAFA" />
        </linearGradient>
        <linearGradient id="od-frame-top" x1="0" y1="1" x2="0" y2="0">
          <stop stopColor="#FAFAFA" stopOpacity="0" />
          <stop offset={FADE_STOP} stopColor="#FAFAFA" />
          <stop offset="1" stopColor="#FAFAFA" />
        </linearGradient>
      </defs>
      <rect
        className="p-frame-right"
        x={FRAME[0].right.x}
        y={FRAME[0].right.y}
        width={FRAME[0].right.w}
        height={FRAME[0].right.h}
        fill="url(#od-frame-right)"
      />
      <rect
        className="p-frame-top"
        x={FRAME[0].top.x}
        y={FRAME[0].top.y}
        width={FRAME[0].top.w}
        height={FRAME[0].top.h}
        fill="url(#od-frame-top)"
      />
    </svg>
  );
}
