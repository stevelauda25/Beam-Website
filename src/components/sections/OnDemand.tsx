import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import SectionLabel from '../ui/SectionLabel';
import ondemandInstant from '../../assets/icons/on-demand/ondemand-instant.svg';
import ondemandLoad from '../../assets/icons/on-demand/ondemand-load.svg';
import ondemandRepos from '../../assets/icons/on-demand/ondemand-repos.svg';
import {
  OnDemandPanel,
  OnDemandSatellites,
  OnDemandLink,
  OnDemandFrame,
  FRAME,
  LINK,
  PANEL,
  CONTENT_OFFSET_X,
  CONTENT_W,
  CONTENT_H,
  BAND_OFFSET_X,
  BAND_OFFSET_Y,
  BAND_W,
  BAND_H,
} from '../visuals/on-demand/OnDemandPanel';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE PANEL, REBUILT.
 *
 * Nothing from the three old exports is rendered any more — no OnDemandVisual,
 * OnDemandVisual2 or OnDemandVisual3, no stacked layers, no crossfade between
 * copies of the same card. There is one `.od-shell` element and one authored
 * panel inside it, and the whole section is three tweened numbers:
 *
 *   the panel box   width, height and translateY
 *   --od-s          the content scale
 *   opacity         which pieces of the panel are showing
 *
 * The old artwork survives only as the geometry it was measured for. Those
 * measurements are what made this possible: the three frames turned out to be
 * ONE file list at three scales, with the row grid at an identical 91.3
 * content-unit offset from the panel's top-left corner in all three, and the
 * panel radius and grey-card inset tracking the same scale.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The stage the panel is placed on — the artwork canvas the frames were cut from. */
const CANVAS_W = 809;
const CANVAS_H = 692;

/**
 * The three states, measured off the approved frames.
 * State 3's content scale is taken from its row pitch (41.98 / 35.32) rather
 * than its grey-card inset (8.963 / 7.47), which reads 1.1999; the export is not
 * quite self-consistent and the rows are what the eye tracks. The disagreement
 * costs 0.085 canvas units on the inset.
 *   x, y, w, h — the panel box, in canvas units
 *   s          — the content scale
 * The panel box and the content scale are independent: state 3 is a tighter
 * frame around larger content, which is what crops its list on the right.
 */
const STATES = [
  { y: 143, w: 487.992, h: 405.434, s: 1 },
  { y: 21.2515, w: 396.25, h: 289.431, s: 0.812 },
  { y: -30, w: 514.5, h: 483.721, s: 1.18857 },
] as const;
/** Every frame shares this left edge, so the panel never moves horizontally. */
const PANEL_X = 170;

type State = (typeof STATES)[number];

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE CONTROLLER PER PROPERTY
 *
 * Every transition property in this section — the shell box, the content
 * scale, and the opacity / trim / scale of every state-specific piece — is
 * owned by ONE master progress p in [0, 1], rendered by one GSAP timeline.
 * Scroll writes p through the ScrollTrigger scrub. A click tweens the scroll
 * position, which writes p the same way. Nothing else writes these properties.
 *
 * That single fact is what fixes the directional bugs: because the state 2
 * build is authored on p, scrolling 2 -> 1 is the exact inverse of 1 -> 2 — the
 * connector trims back toward app.ts, the card shrinks back toward the
 * connector, the bar drains — rather than a separate exit animation. And
 * because nothing is keyed to "a band became active", nothing replays when a
 * band is re-entered from the far side.
 *
 * Two things are NOT functions of p, because they must run forward in time on
 * arrival: the state 1 first-view cascade, and the state 3 count with its Ready
 * conclusion. Both are driven by WAAPI / rAF on INNER elements whose opacity
 * the timeline never touches (.p-row, .p-footer1 > *,
 * .p-count-text, .p-ready-mark). Outer groups belong to the timeline; inner
 * elements belong to the arrival demo. No property has two writers.
 *
 * The state 2 pieces also carry a third, outer wrapper (.p-state2) that the
 * click controller BORROWS for the length of one morph -- to fade them out on
 * an exit, and to keep them out of a direct 1 <-> 3 skip -- and then clears, so
 * ownership returns to the timeline and no inline value outlives the click.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * ── THE STATE 2 HOLD ────────────────────────────────────────────────────────
 *
 * Every beat below is still written in the coordinates the approved
 * choreography was authored in. HOLD_LEN inserts real scroll distance at the
 * moment State 2 resolves, and P() maps that authoring onto master progress —
 * so the hold is ADDED distance, not distance taken from transitions that were
 * already signed off. The pin is lengthened by the same factor, which keeps
 * every approved window at the scroll length it had.
 */
/*
 * Every beat is authored once, in its original coordinates. SPACING then either
 * INSERTS flat distance at a point (a hold) or STRETCHES a range (the same
 * choreography given more scroll to happen over). Everything downstream shifts;
 * nothing is ever compressed, and the pin grows by exactly the total added — so
 * each approved window keeps the scroll distance it was signed off at.
 */
const SPACING = [
  /** State 2 resolves and holds. */
  { kind: 'insert', at: 0.63, add: 0.115 },
  /** The 2 <-> 3 shell reframe: same endpoints, 45% more scroll to travel. */
  { kind: 'stretch', from: 0.78, to: 0.92, factor: 1.45 },
  /** State 3 resolves and holds before the pin releases. */
  { kind: 'insert', at: 0.945, add: 0.14 },
] as const;

/** Authored position -> spanned position, before normalising. */
function spanned(x: number) {
  let out = x;
  for (const s of SPACING) {
    if (s.kind === 'insert') {
      if (x > s.at) out += s.add;
    } else {
      const len = s.to - s.from;
      const extra = len * (s.factor - 1);
      if (x >= s.to) out += extra;
      else if (x > s.from) out += ((x - s.from) / len) * extra;
    }
  }
  return out;
}
/** How much longer the pin has to be for all of that to fit. */
const TOTAL = spanned(1);
/** Authored position -> master progress. */
const P = (x: number) => spanned(x) / TOTAL;

/*
 * THE RESOLVED BANDS — the single source of truth for "where is state N fully
 * composed". Every click target, hold threshold and lifecycle boundary is read
 * from here, so retiming the choreography can never leave a stale target behind.
 *
 *   State 1  from the top of the pin to its first beat (header/footer leaving)
 *   State 2  last build beat -> first exit beat
 *   State 3  last State 3 beat -> the end of the pin
 */
const RESOLVED = [
  { from: 0, to: P(0.24) },
  { from: P(0.63), to: P(0.645) },
  { from: P(0.945), to: 1 },
] as const;

const HOLD_START = RESOLVED[1].from;
const HOLD_END = RESOLVED[1].to;

/* ── The scroll map ───────────────────────────────────────────────────────── */
const MORPH = [
  { start: 0.24, end: 0.42 }, // shell 1 -> 2
  // 2 -> 3 starts only after the card has left and the connector has retracted
  // into app.ts, so the shell never reframes while State 2 is still on screen.
  { start: 0.78, end: 0.92 }, // shell 2 -> 3
] as const;

/**
 * Where a click lands, per state. State 2's target is the END of its build, so
 * a click arrives at the resolved composition, not part-way through the demo.
 */
/** Each click lands on the centre of its own resolved band. Derived, never typed. */
const TARGET = RESOLVED.map((r) => (r.from + r.to) / 2);

/**
 * Visible-progress thresholds for the two arrival demos. Both sit inside the
 * final third of their morph so the shell has visibly become the destination
 * before its interior starts talking.
 */
const ARRIVE_1 = P(0.24); // first-view cascade: v at or below this, once ever

/*
 * WHERE THE FILE TREE STARTS REVEALING.
 *
 * The cascade used to wait for the section's own ScrollTrigger to go active,
 * which happens at 'top top' -- the panel had to reach the TOP of the viewport,
 * by which point the reader is already looking at an empty tree. This is an
 * IntersectionObserver rather than a second ScrollTrigger on purpose: a second
 * trigger on a PINNED element measures against a half-built pin-spacer and made
 * the section and the page disagree about scroll position once already.
 *
 * Shrinking the root's bottom edge by this much means the observer fires when
 * the panel's top crosses that line -- so -15% starts the reveal as the panel
 * reaches the lower 85% of the viewport. Lower the number to start later.
 */
const REVEAL_ROOT_MARGIN = '0px 0px -15% 0px';
const ARRIVE_3 = P(0.93); // count begins when v reaches this
/** State 3's outer group is at opacity 0 below P(0.885), so a reset is unseen. */
const RESET_3 = P(0.87);

/** Nav-list highlight, a pure function of visible progress. */
const HIGHLIGHT_AT = [P(0.33), P(0.8)] as const;

/*
 * Click tween durations. The ScrollTrigger scrub (0.6) smooths the visible
 * result on top of these, adding roughly 250–350ms of settle, so the perceived
 * transition lands in the requested 600–850ms / 900–1200ms windows.
 */
/*
 * Manual scrolling keeps its smoothing; a click does not. See scrollToItem —
 * the scrub is switched off for the duration of a click so the click tween is
 * the ONLY easing in the chain, which makes these the real perceived durations
 * rather than a tween length plus a catch-up tail.
 */
const SCRUB = 0.6;

/**
 * Every ScrollTrigger instance carries scrubDuration at runtime — it is what
 * `scrub` builds and tears down — but it is missing from the shipped typings.
 * Narrowed here rather than cast away, so the call site stays checked.
 */
type ScrubbableTrigger = ScrollTrigger & { scrubDuration: (value: number) => void };
const setScrub = (st: ScrollTrigger | null, value: number) =>
  (st as ScrubbableTrigger | null)?.scrubDuration(value);
/*
 * Perceived duration IS the tween duration here: the scrub is switched off for
 * the length of a click (see scrollToItem), so nothing is added after it lands
 * and there is no settle tail to subtract. Lengthened from 0.9 / 1.15 so both
 * halves of power2.inOut are readable — at 1.10s the opening quarter of the
 * journey takes ~437ms and the closing quarter another ~437ms, well past the
 * ~200ms it takes to perceive an acceleration, while the middle half of the
 * distance passes in ~227ms and keeps it from feeling slow.
 */
/*
 * ONE duration and ONE ease for every click route, adjacent or direct. The
 * separate adjacent / skip / direct constants are gone deliberately: a route
 * that covers more ground simply moves faster, so no route reads as a different
 * kind of motion from another.
 */
const CLICK_DURATION = 0.75;
const CLICK_EASE = 'power2.inOut';
const EASE_FN = gsap.parseEase(CLICK_EASE);

/*
 * Foreground handoff inside a direct morph, as fractions of CLICK_DURATION —
 * WALL-CLOCK fractions, not eased ones, so these read as the milliseconds they
 * say. The outgoing state is gone before the incoming one starts, with a short
 * shell-only gap between, so the two never share the frame.
 */
const FG_OUT_END = 0.25;
const FG_IN_START = 0.35;

/*
 * State 2's authored build, in master progress: app.ts is read, its size
 * resolves, the connector DRAWS, and only then does the card arrive and the
 * caption settle. Arriving at State 2 replays this range inside the click's
 * arriving window rather than jumping to its end — which is what used to make
 * the card appear beside an already-finished connector, with no causality.
 */
const BUILD2_FROM = P(0.36);
const BUILD2_TO = P(0.63);

/*
 * The card's rest pose before it arrives. Short travel on purpose: the offset
 * places it FURTHER from the shell it is arriving beside, so a longer slide
 * would only widen a gap that is already correct at rest and make the entrance
 * read as a slide rather than a settle. The exit keeps its own approved
 * 20px / 2px pose and is not derived from these.
 */
const CARD_IN_X = 14;
const CARD_IN_BLUR = 3;

/*
 * THE CARD'S ARRIVAL IS GATED BY THE SHELL, NOT BY THE CONNECTOR.
 *
 * Measured in the stage's own coordinate space, the panel's bottom edge and the
 * card's top edge are: State 1 548.43 vs 330.25 (the card's box sits 218 units
 * INSIDE the panel), State 3 453.72 vs 330.25 (123 inside), State 2 310.68 vs
 * 330.25 (19.57 clear). The panel does not move aside for the card -- it sweeps
 * UP PAST it. A scroll never shows this, because the shell morph lands at 0.42
 * and the card arrives at 0.5665 against geometry that has been still for a
 * while. A click replays that same build while the shell is mid-flight, so a
 * card revealed on the authored beat is revealed while the panel is still
 * standing in its space. That is the collision, and no connector timing can fix
 * it: the fix is to hold the card until the panel has physically cleared it.
 *
 * The click therefore owns the card for the length of the morph, on its own
 * local window, chosen so the panel's bottom edge is already above the card's
 * top edge before the card is perceptible at all -- and so the two curves stay
 * inside the global 0.75s power2.inOut controller rather than beside it.
 */
const CARD_IN_FROM = 0.78;
const CARD_IN_TO = 0.955;
/*
 * The caption trails the card. On a scroll the authored beats already read in
 * that order (card 0.5665-0.6035, then caption 0.605-0.63); moving only the
 * card to a late window would invert it, and the caption would announce a
 * result that had not arrived yet.
 */
const CAPTION_IN_FROM = 0.855;
const CARD_SOFT = gsap.parseEase('sine.inOut');
const CARD_SETTLE = gsap.parseEase('power2.out');
const window01 = (t: number, from: number, to: number) =>
  Math.min(1, Math.max(0, (t - from) / (to - from)));

/*
 * The properties a DIRECT morph owns. Everything else the panel shows — the
 * rows, the list surface, the inset card — is a function of the shell variables
 * alone, so it follows for free and the panel can never go blank.
 */
const MORPH_VARS = ['--od-pw', '--od-ph', '--od-ty', '--od-s'] as const;
const MORPH_RECTS = ['.p-frame-right', '.p-frame-top'] as const;
const RECT_ATTRS = ['x', 'y', 'width', 'height'] as const;
const MORPH_GROUPS = [
  '.p-footer1',
  '.p-topfade',
  '.p-footer3',
  '.p-ready',
] as const;

/*
 * State 2's disk readout. The bar, the megabytes and the percentage are three
 * views of ONE loading progress — not three sequenced animations — so they can
 * never disagree, at any scrub position or direction.
 */
const DISK_MB = 312;
const DISK_PERCENT = 3.7;

/*
 * The loading is NOT scrubbed. It is a semantic micro-sequence that autoplays
 * once the connector has delivered the card, so a reader who stops scrolling
 * still sees it finish. Scroll only decides WHICH WAY it should be running.
 *
 * Reverse is quicker than forward and is triggered the instant the reader
 * leaves the hold downward, which is exactly why the hold exists: it buys the
 * unload enough room to finish before the scrubbed connector starts retracting.
 */
const LOAD_FORWARD_S = 0.9;
const LOAD_REVERSE_S = 0.45;
/** The card has landed — the connector has arrived and the result can load. */
const LOAD_START = P(0.6035);
/** The card is on its way in; below this the reader is back in State 1's story. */
const CARD_IN = P(0.5665);
/** The card has fully left toward State 3; only here is a reset invisible. */
const CARD_GONE = P(0.72);

/* ── The state 1 first-view cascade (OD2/OD3) ─────────────────────────────── */
const OD1 = {
  headerIn: 260,
  rowStart: 80,
  rowStagger: 38,
  rowDuration: 240,
  footerDelay: 440,
  footerIn: 260,
} as const;

/* ── The state 3 count and its conclusion (OD5) ───────────────────────────── */
const TARGET_COUNT = 1_250_000;
const COUNT_DELAY_MS = 260;
const COUNT_DURATION_MS = 1400;
const COUNT_END_MS = COUNT_DELAY_MS + COUNT_DURATION_MS;
const READY_IN_MS = 620;
/** Derived from the count's end, so the two cannot drift: lands 20ms after it locks. */
const READY_DELAY_MS = COUNT_END_MS - READY_IN_MS + 20;

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';


const items = [
  {
    title: 'Everything appears instantly',
    description: 'See the full directory without downloading every file first.',
    icon: ondemandInstant,
  },
  {
    title: 'Contents load on demand',
    description: 'Open a file and Beam fetches its contents when needed.',
    icon: ondemandLoad,
  },
  {
    title: 'Built for huge repos',
    description: 'Mount large monorepos without filling your local disk.',
    icon: ondemandRepos,
  },
];

/**
 * Write a state onto the shell. setProperty rather than gsap.set: a custom
 * property that has never been written reads back as the empty string, which
 * GSAP resolves to 0 and collapses the panel on the first frame.
 */
/** Park the framing wash on one state's recovered geometry. */
function applyFrame(scope: HTMLElement, index: number) {
  const f = FRAME[index];
  const set = (sel: string, r: { x: number; y: number; w: number; h: number }) =>
    scope.querySelectorAll<SVGRectElement>(sel).forEach((el) => {
      el.setAttribute('x', String(r.x));
      el.setAttribute('y', String(r.y));
      el.setAttribute('width', String(r.w));
      el.setAttribute('height', String(r.h));
    });
  set('.p-frame-right', f.right);
  set('.p-frame-top', f.top);
}

function applyState(shell: HTMLElement, state: State) {
  shell.style.setProperty('--od-pw', String(state.w));
  shell.style.setProperty('--od-ph', String(state.h));
  shell.style.setProperty('--od-ty', String(state.y));
  shell.style.setProperty('--od-s', String(state.s));
}

const shellCss = `
  /*
   * overflow-x: clip, NOT hidden. A box with one axis hidden and the other
   * visible computes the visible axis to auto, so the section and its layout div
   * were each becoming their own vertical scroller inside the pin — the nested
   * scroll that split the page into two competing sliders. clip does not.
   */
  .od-section, .od-layout { overflow-x: clip; }

  .od-stage {
    container-type: inline-size;
    position: relative;
    width: min(400px, 90vw, 42svh);
    aspect-ratio: ${CANVAS_W} / ${CANVAS_H};
    max-width: 100%;
  }
  @media (min-width: 744px) { .od-stage { width: 520px; } }
  @media (min-width: 1200px) { .od-stage { width: min(809px, 56vw, 116svh); } }

  /*
   * One CSS unit == one canvas unit. 1cqw is 1% of the stage width and the
   * canvas is 809 wide, so 1cqw / 8.09 is exactly one canvas unit in px, and
   * every number below is a measured number.
   */
  .od-stage > * { --od-u: calc(1cqw / 8.09); }

  /* ── THE PANEL. One element, mounted once, never replaced. ─────────────── */
  .od-shell {
    --od-pw: ${STATES[0].w};
    --od-ph: ${STATES[0].h};
    --od-ty: ${STATES[0].y};
    --od-s: ${STATES[0].s};

    position: absolute;
    left: calc(${PANEL_X} * var(--od-u));
    top: 0;
    width: calc(var(--od-pw) * var(--od-u));
    height: calc(var(--od-ph) * var(--od-u));
    transform: translate3d(0, calc(var(--od-ty) * var(--od-u)), 0);
    border-radius: calc(${PANEL.radius} * var(--od-s) * var(--od-u));
    overflow: visible;

    background: #ffffff;
    box-shadow:
      0 calc(8 * var(--od-u)) calc(16 * var(--od-u)) calc(-6 * var(--od-u)) rgba(0, 0, 0, 0.04),
      0 calc(6 * var(--od-u)) calc(12 * var(--od-u)) calc(-6 * var(--od-u)) rgba(0, 0, 0, 0.12),
      0 calc(4 * var(--od-u)) calc(12 * var(--od-u)) calc(-4 * var(--od-u)) rgba(0, 0, 0, 0.08),
      0 calc(1 * var(--od-u)) calc(2 * var(--od-u)) calc(-0.5 * var(--od-u)) rgba(0, 0, 0, 0.2),
      inset 0 0 0 calc(${PANEL.hairline} * var(--od-s) * var(--od-u)) rgba(0, 0, 0, 0.1),
      inset 0 calc(0.5 * var(--od-u)) calc(0.5 * var(--od-u)) rgba(255, 255, 255, 0.25);
    will-change: width, height, transform;
  }

  .od-inner {
    position: absolute;
    inset: calc(${PANEL.innerInset} * var(--od-s) * var(--od-u));
    background: #f5f5f5;
    border-radius: calc(${PANEL.innerRadius} * var(--od-s) * var(--od-u));
    box-shadow: inset 0 0 0 calc(${PANEL.hairline} * var(--od-s) * var(--od-u)) #c4c4c4;
    overflow: hidden;
  }

  .od-list {
    position: absolute;
    left: calc((${PANEL.list.left} - ${PANEL.innerInset}) * var(--od-s) * var(--od-u));
    right: calc((${PANEL.list.right} - ${PANEL.innerInset}) * var(--od-s) * var(--od-u));
    top: calc((${PANEL.list.top} - ${PANEL.innerInset}) * var(--od-s) * var(--od-u));
    bottom: calc((${PANEL.list.bottom} - ${PANEL.innerInset}) * var(--od-s) * var(--od-u));
    background: #ffffff;
    border-radius: calc(${PANEL.list.radius} * var(--od-s) * var(--od-u));
    box-shadow: inset 0 0 0 calc(${PANEL.hairline} * var(--od-s) * var(--od-u)) #c4c4c4;
  }

  .od-content-clip {
    position: absolute;
    left: calc((${CONTENT_OFFSET_X} - ${PANEL.innerInset}) * var(--od-s) * var(--od-u));
    top: calc(${-PANEL.innerInset} * var(--od-s) * var(--od-u));
    width: calc(${CONTENT_W} * var(--od-s) * var(--od-u));
    height: calc(${CONTENT_H} * var(--od-s) * var(--od-u));
    pointer-events: none;
  }

  /* The band below the panel, anchored to the panel's bottom edge. */
  .od-below {
    position: absolute;
    left: calc(${BAND_OFFSET_X} * var(--od-s) * var(--od-u));
    top: calc(100% + ${BAND_OFFSET_Y} * var(--od-s) * var(--od-u));
    width: calc(${BAND_W} * var(--od-s) * var(--od-u));
    height: calc(${BAND_H} * var(--od-s) * var(--od-u));
    pointer-events: none;
  }

  /* State 2's connector + card, in canvas units over the whole stage. */
  .od-link { position: absolute; inset: 0; pointer-events: none; }

  /*
   * The framing wash. Last child of the stage so it paints over the panel, the
   * connector, the satellites and the result alike — which is exactly how the
   * approved exports composited it.
   */
  .od-frame { position: absolute; inset: 0; pointer-events: none; }

  .od-content { display: block; width: 100%; height: 100%; overflow: visible; }

  .od-mono {
    font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }
  .od-sans {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }

  /*
   * ── OWNERSHIP ──────────────────────────────────────────────────────────────
   * Nothing below animates. The timeline writes the outer groups; the arrival
   * demos write the inner elements; the click controller borrows .p-state2 for
   * the length of one morph and clears it again.
   * This block only sets rest states and transform boxes.
   */
  .p-row, .p-footer1, .p-select, .p-size,
  .p-disk-body, .p-caption, .p-conn-a, .p-conn-b, .p-ready-mark {
    transform-box: fill-box;
    transform-origin: center;
  }
  /*
   * .p-progress is deliberately NOT in that list. GSAP bakes the bar's origin
   * ('left center', passed in every GSAP call) into the transform matrix it
   * writes; a CSS transform-box + transform-origin on the same element made the
   * browser apply that already-baked matrix about the bbox-left a second time,
   * which is what anchored the fill to the RIGHT edge.
   */

  /*
   * Inner elements the arrival demos own. .p-count-text is deliberately NOT
   * here: the blue icon and "1,250,000 files+ available" are one primary
   * result, so the text inherits .p-footer3's opacity and cannot lag behind the
   * icon. Only the secondary Ready mark keeps its own entrance.
   */
  .p-ready-mark { opacity: 0; }
  /* The tree is hidden only until its first-view cascade has run, once ever. */
  .od-unrevealed .p-row,
  .od-unrevealed .p-footer1 > * { opacity: 0; }

  @media (prefers-reduced-motion: reduce) {
    .p-ready-mark,
    .od-unrevealed .p-row, .od-unrevealed .p-footer1 > * {
      opacity: 1;
    }
  }

  /* Description reveal — a grid collapse, so there is no mount/unmount. */
  .od-desc { display: grid; grid-template-rows: 0fr; }
  .od-desc > div { overflow: hidden; min-height: 0; }
`;

export default function OnDemand() {
  const containerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<SVGTextElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const clickTweenRef = useRef<gsap.core.Tween | null>(null);

  /* Arrival-demo bookkeeping. Refs, not state: none of it should re-render. */
  const lineLengthRef = useRef(0);
  const loadRef = useRef({ p: 0 });
  const loadTweenRef = useRef<gsap.core.Tween | null>(null);
  const loadDirRef = useRef<'fwd' | 'rev' | null>(null);
  const lastVRef = useRef(0);
  /** True only while a click is crossing State 2 on its way somewhere else. */
  const skipRef = useRef(false);
  /** Removes the reader-intent listeners installed for the current click. */
  const intentWatchRef = useRef<(() => void) | null>(null);
  /** True while a click morph owns the visual, off the scroll timeline. */
  const directActiveRef = useRef(false);
  /** Silences the progress lifecycle while the morph seeks the timeline. */
  const suspendProgressRef = useRef(false);
  const revealedRef = useRef(false);
  const inViewRef = useRef(false);
  const demo3Ref = useRef<{ frame: number; anims: Animation[] } | null>(null);
  const demo3ArmedRef = useRef(false);
  const highlightRef = useRef(0);

  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const releaseIntentWatch = () => {
    intentWatchRef.current?.();
    intentWatchRef.current = null;
  };

  const q = <T extends Element>(selector: string) =>
    Array.from(stageRef.current?.querySelectorAll<T>(selector) ?? []);

  /*
   * CONNECTOR GEOMETRY IS RESOLVED ONCE AND HELD.
   *
   * It used to be rewritten from the panel's LIVE translate and scale on every
   * timeline render — the same renders that advance the trim. The vertical run
   * is measured from the app.ts anchor, and that anchor rises as the panel
   * travels toward State 2, so the segment visibly grew taller WHILE the stroke
   * was trimming: geometry and trim were animating at once.
   *
   * The only geometry that is ever visible is the State 2 one (the line is at
   * offset 100 — fully hidden — whenever the panel is anywhere else), and the
   * State 2 anchor is a constant: app.ts at its content offset, under STATES[1]'s
   * translate and scale. So the path is a constant. It is written here at mount,
   * again on a ScrollTrigger refresh (resize / relayout), and never per frame.
   * During the draw the ONLY changing property is strokeDashoffset — a Trim
   * Paths animation on a static path.
   */
  const setLinkGeometry = () => {
    const anchor = STATES[1];
    const x = PANEL_X + LINK.rowX * anchor.s;
    const y = anchor.y + LINK.rowY * anchor.s;
    const R = LINK.cornerR;
    const d =
      `M${x} ${y} H${LINK.cornerX + R} A${R} ${R} 0 0 0 ${LINK.cornerX} ${y + R}` +
      ` V${LINK.endY - R} A${R} ${R} 0 0 0 ${LINK.cornerX + R} ${LINK.endY} H${LINK.endX}`;
    q<SVGPathElement>('.p-conn-line').forEach((el) => el.setAttribute('d', d));
    q<SVGCircleElement>('.p-conn-a').forEach((el) => {
      el.setAttribute('cx', String(x));
      el.setAttribute('cy', String(y));
    });
    // The real geometric length of that static path. Dash PATTERN is set here;
    // the dash OFFSET is never written from this function — the timeline owns it.
    const path = q<SVGPathElement>('.p-conn-line')[0];
    if (path) {
      lineLengthRef.current = path.getTotalLength();
      gsap.set(q('.p-conn-line'), {
        strokeDasharray: `${lineLengthRef.current} ${lineLengthRef.current}`,
      });
    }
  };

  /* ── State 1 first-view cascade. Runs once, on inner elements only. ────── */
  const runFirstCascade = () => {
    const shell = shellRef.current;
    if (!shell || revealedRef.current) return;
    revealedRef.current = true;
    // fill: both holds opacity 0 through each delay, so the class can go now.
    shell.classList.remove('od-unrevealed');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rise = (el: Element, duration: number, delay: number) =>
      el.animate(
        [
          { opacity: 0, transform: 'translateY(6px)', filter: 'blur(1.5px)' },
          { opacity: 1, transform: 'none', filter: 'blur(0)' },
        ],
        { duration, delay, easing: EASE_OUT, fill: 'both' },
      );

    const anims: Animation[] = [];
    // The header (cloud mark + path name) is shell, not State 1: it is present
    // before the cascade runs and stays present after it, so it has no entrance.
    for (let i = 0; i < 7; i += 1) {
      q(`.p-row-${i}`).forEach((el) =>
        anims.push(rise(el, OD1.rowDuration, OD1.rowStart + i * OD1.rowStagger)),
      );
    }
    q('.p-footer1 > *').forEach((el) =>
      anims.push(rise(el, OD1.footerIn, OD1.footerDelay)),
    );
    // Once finished, bake the end state and drop the animations.
    Promise.all(anims.map((a) => a.finished))
      .then(() => anims.forEach((a) => { a.commitStyles(); a.cancel(); }))
      .catch(() => {});
  };

  /*
   * ── THE STATE 2 LOADING CONTROLLER ───────────────────────────────────────
   *
   * One normalized progress, one tween at a time, five verbs. The bar, the
   * megabytes and the percentage are all views of loadRef.p, so they cannot
   * disagree at any point — including mid-reverse.
   *
   * Direction changes resume from the CURRENT value and scale their duration by
   * the distance left, so a reverse from 0.4 takes 40% of the reverse time
   * rather than snapping to 1 or restarting at 0.
   */
  const renderLoading = () => {
    const p = loadRef.current.p;
    gsap.set(q('.p-progress'), { scaleX: p, transformOrigin: 'left center' });
    const mbText = `${Math.round(DISK_MB * p)} MB`;
    const pctText = `${(DISK_PERCENT * p).toFixed(1)}%`;
    q('.p-disk-mb').forEach((el) => {
      if (el.textContent !== mbText) el.textContent = mbText;
    });
    q('.p-disk-percent').forEach((el) => {
      if (el.textContent !== pctText) el.textContent = pctText;
    });
  };

  const stopLoading = () => {
    loadTweenRef.current?.kill();
    loadTweenRef.current = null;
    loadDirRef.current = null;
  };

  const playLoading = (to: 0 | 1, dir: 'fwd' | 'rev', fullDuration: number) => {
    // Already travelling that way: let it run. This is what stops a per-frame
    // scroll callback from spawning a second tween.
    if (loadDirRef.current === dir && loadTweenRef.current) return;
    stopLoading();
    const from = loadRef.current.p;
    if (from === to) {
      renderLoading();
      return;
    }
    loadDirRef.current = dir;
    loadTweenRef.current = gsap.to(loadRef.current, {
      p: to,
      duration: fullDuration * Math.abs(to - from),
      ease: dir === 'fwd' ? 'power2.out' : 'power2.in',
      overwrite: true,
      onUpdate: renderLoading,
      onComplete: () => {
        loadTweenRef.current = null;
        loadDirRef.current = null;
      },
    });
  };

  const loading = {
    playForward: () => playLoading(1, 'fwd', LOAD_FORWARD_S),
    playReverse: () => playLoading(0, 'rev', LOAD_REVERSE_S),
    stop: stopLoading,
    setResolved: () => {
      if (loadRef.current.p === 1 && !loadTweenRef.current) return;
      stopLoading();
      loadRef.current.p = 1;
      renderLoading();
    },
    setInitial: () => {
      if (loadRef.current.p === 0 && !loadTweenRef.current) return;
      stopLoading();
      loadRef.current.p = 0;
      renderLoading();
    },
  };

  /* ── State 3 count + Ready. Forward only, inner elements only. ─────────── */
  const stopDemo3 = () => {
    const demo = demo3Ref.current;
    if (!demo) return;
    window.cancelAnimationFrame(demo.frame);
    // Freeze, do not reset: the outer group is fading on p and the text must
    // keep reading 1,250,000 until it is gone.
    demo.anims.forEach((a) => a.pause());
    demo3Ref.current = null;
  };
  const resetDemo3 = () => {
    stopDemo3();
    q<HTMLElement>('.p-count-text, .p-ready-mark').forEach((el) =>
      el.getAnimations().forEach((a) => a.cancel()),
    );
    if (countRef.current) countRef.current.textContent = '0 files+ available';
    demo3ArmedRef.current = false;
  };
  const startDemo3 = () => {
    if (demo3ArmedRef.current) return;
    demo3ArmedRef.current = true;
    const text = countRef.current;
    if (!text) return;
    const formatter = new Intl.NumberFormat('en-US');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      text.textContent = `${formatter.format(TARGET_COUNT)} files+ available`;
      return;
    }
    /*
     * No opacity animation on the number: it arrives with the icon as one
     * result group, then counts. Fading it separately is what produced the
     * icon-first / number-second stagger.
     */
    const anims: Animation[] = [];
    q('.p-ready-mark').forEach((el) =>
      anims.push(
        el.animate(
          [
            { opacity: 0, transform: 'translateY(7px)', filter: 'blur(4px)' },
            { opacity: 0.82, filter: 'blur(1.2px)', offset: 0.55 },
            { opacity: 1, transform: 'none', filter: 'blur(0)' },
          ],
          { duration: READY_IN_MS, delay: READY_DELAY_MS, easing: EASE_OUT, fill: 'both' },
        ),
      ),
    );
    const startedAt = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(
        1,
        Math.max(0, (now - startedAt - COUNT_DELAY_MS) / COUNT_DURATION_MS),
      );
      text.textContent = `${formatter.format(
        Math.round(TARGET_COUNT * (1 - Math.pow(1 - raw, 4))),
      )} files+ available`;
      if (raw < 1 && demo3Ref.current) {
        demo3Ref.current.frame = window.requestAnimationFrame(tick);
      }
    };
    demo3Ref.current = { frame: window.requestAnimationFrame(tick), anims };
  };

  /*
   * The lifecycle, driven by VISIBLE progress (the timeline's, after the scrub)
   * rather than raw scroll, so demos fire when the shell has actually arrived.
   */
  const onVisibleProgress = (v: number) => {
    // The morph seeks the timeline to read destination values; those seeks are
    // bookkeeping, not the reader arriving somewhere.
    if (suspendProgressRef.current) return;
    const goingUp = v > lastVRef.current;
    lastVRef.current = v;

    /*
     * The loading's direction is the only thing scroll decides. Zones, low to
     * high: before the card exists it is zeroed; once the card has landed it
     * autoplays forward; the hold holds it resolved whichever way the reader is
     * moving, which is what makes stopping anywhere in the hold show the same
     * frame; leaving the hold downward unloads it; and past the card's exit,
     * where nothing is visible, it resets for the next arrival.
     */
    if (skipRef.current) {
      /*
       * A direct 1 <-> 3 click. Master progress crosses State 2's geometry, but
       * the reader did not choose State 2, so its loading never autoplays — only
       * the two end states are settled, and the card is hidden anyway.
       */
      if (v >= CARD_GONE || v < CARD_IN) loading.setInitial();
    } else if (v >= CARD_GONE) loading.setInitial();
    else if (v >= HOLD_END) loading.setResolved();
    else if (v >= HOLD_START) {
      if (goingUp) loading.playForward();
    } else if (v >= LOAD_START) {
      if (goingUp) loading.playForward();
      else loading.playReverse();
    } else if (v >= CARD_IN) {
      if (!goingUp) loading.playReverse();
    } else loading.setInitial();

    // State 3: arrive, leave, and reset — in that order, never the other way.
    if (v >= ARRIVE_3) startDemo3();
    else if (demo3Ref.current) stopDemo3();
    if (v < RESET_3 && demo3ArmedRef.current) resetDemo3();

    // State 1: the cascade, once, when the reader is actually here.
    if (inViewRef.current && v <= ARRIVE_1) runFirstCascade();

    // The nav highlight follows what is on screen.
    const highlight = v < HIGHLIGHT_AT[0] ? 0 : v < HIGHLIGHT_AT[1] ? 1 : 2;
    if (highlight !== highlightRef.current) {
      highlightRef.current = highlight;
      setActiveIndex(highlight);
    }
  };

  /*
   * Paint state 1 before the first frame: the shell box, and every piece that
   * belongs to a later state parked at its rest value. This has to happen in a
   * layout effect, not in the timeline's own set() calls, or the state 3 line
   * and the top fade would be visible for the frames before the effect runs.
   */
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    applyState(shell, STATES[0]);
    shell.classList.add('od-unrevealed');
    gsap.set(
      q('.p-select, .p-size, .p-conn-a, .p-conn-b, .p-disk-body, .p-caption, .p-footer3, .p-ready, .p-topfade'),
      { autoAlpha: 0 },
    );
    gsap.set(q('.p-disk-body'), {
      x: CARD_IN_X,
      filter: 'blur(' + CARD_IN_BLUR + 'px)',
    });
    gsap.set(q('.p-progress'), { scaleX: 0, transformOrigin: 'left center' });
    gsap.set(q('.p-select'), { scaleX: 0.985 });
    setLinkGeometry();
    if (stageRef.current) applyFrame(stageRef.current, 0);
    // State 1 baseline: offset == length == line fully hidden.
    gsap.set(q('.p-conn-line'), { strokeDashoffset: lineLengthRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Start the file-tree cascade as the panel reaches the lower part of the
   * viewport, so the tree is already populated by the time the section settles.
   * runFirstCascade is guarded by revealedRef, so this races harmlessly with the
   * onVisibleProgress path that still calls it -- whichever arrives first wins,
   * and it can only ever run once.
   */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || revealedRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      runFirstCascade();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        runFirstCascade();
      },
      { rootMargin: REVEAL_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(shell);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const shell = shellRef.current;
      if (!shell) return;
      const sel = (s: string) => q(s);

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        // Geometry is NOT touched here: nothing but strokeDashoffset may change
        // while the line is drawing.
        onUpdate: () => onVisibleProgress(tl.progress()),
      });
      timelineRef.current = tl;

      /* Everything below is authored FORWARD. Backward is the same tweens run
       * the other way — GSAP guarantees it — which is the whole point. */
      // Authored coordinates in, master progress out — see P() and HOLD_LEN.
      const at = (from: number, to: number) => ({ pos: P(from), dur: P(to) - P(from) });

      // ── Shell ───────────────────────────────────────────────────────────
      MORPH.forEach((m, step) => {
        const st = STATES[step + 1];
        const f = FRAME[step + 1];
        const w = at(m.start, m.end);
        /*
         * The wash travels WITH the shell — same window, same ease — so the
         * framing reframes continuously instead of switching at a boundary.
         */
        tl.to(
          sel('.p-frame-right'),
          { attr: { x: f.right.x, y: f.right.y, width: f.right.w, height: f.right.h },
            duration: w.dur, ease: 'power2.inOut' },
          w.pos,
        );
        tl.to(
          sel('.p-frame-top'),
          { attr: { x: f.top.x, y: f.top.y, width: f.top.w, height: f.top.h },
            duration: w.dur, ease: 'power2.inOut' },
          w.pos,
        );
        tl.to(shell, {
          '--od-pw': String(st.w), '--od-ph': String(st.h),
          '--od-ty': String(st.y), '--od-s': String(st.s),
          duration: w.dur, ease: 'power2.inOut',
        }, w.pos);
      });

      // ── State 1 pieces leave as the first morph begins ──────────────────
      let w = at(0.24, 0.30);
      tl.to(sel('.p-footer1'), { autoAlpha: 0, duration: w.dur }, w.pos);
      w = at(0.28, 0.36);
      tl.to(sel('.p-topfade'), { autoAlpha: 1, duration: w.dur }, w.pos);

      // ── State 2 build: authored as the causal chain, on p ───────────────
      // Rest values were parked by the layout effect above; the tweens read them.

      /*
       * TRIM TIMING. The connector draw gets the largest share of the build so
       * it reads as a progressive Trim Paths, not a pop: 0.405 -> 0.56 is 0.155
       * of master progress — 55% of the whole state 2 build (was 0.41 -> 0.48,
       * 0.07). It is LINEAR in progress, so a quarter of the scroll reveals a
       * quarter of the route; an eased trim front-loads the invisible part.
       * The card begins only once the line is ~94% home, so it never competes.
       */
      w = at(0.36, 0.39); // the row is read — near the END of the morph
      tl.to(sel('.p-select'), { autoAlpha: 1, scaleX: 1, duration: w.dur, ease: 'power2.out' }, w.pos);
      w = at(0.39, 0.42); // its size resolves
      tl.to(sel('.p-size'), { autoAlpha: 1, duration: w.dur }, w.pos);
      // The shell morph lands at 0.42. Only THEN does the line leave app.ts —
      // shell transform, then connector draw, then result card: one focal
      // movement at a time, on a path that no longer moves.
      w = at(0.42, 0.44);
      tl.to(sel('.p-conn-a'), { autoAlpha: 1, duration: w.dur }, w.pos);
      w = at(0.42, 0.56); // the connector DRAWS from app.ts, along the route, to the disk
      /*
       * THE ONLY WRITER OF strokeDashoffset DURING THE DRAW.
       *
       * fromTo, not to: `to` records its start value from the DOM, and
       * ScrollTrigger's invalidateOnRefresh re-records it. Measured — if a
       * refresh landed while the line was drawn, the tween became 0 -> 0 and the
       * connector was permanently full and never trimmed again. That was the
       * regression. fromTo re-reads its start from these vars instead.
       *
       * The from value is a function so an invalidate picks up a re-measured
       * length, and immediateRender stays TRUE (fromTo's default): with it false,
       * a refresh while the reader sits in State 1 leaves the line fully drawn
       * (measured 0px where it must be the full length).
       */
      tl.fromTo(
        sel('.p-conn-line'),
        { strokeDashoffset: () => lineLengthRef.current },
        { strokeDashoffset: 0, duration: w.dur, ease: 'none', immediateRender: true },
        w.pos,
      );
      w = at(0.545, 0.56);
      tl.to(sel('.p-conn-b'), { autoAlpha: 1, duration: w.dur }, w.pos);
      /*
       * THE CARD ARRIVES LAST, AND ONLY ONCE THE COMPOSITION HAS SETTLED.
       *
       * It used to open at 0.55, while the trim still had 7% to run. On a
       * scroll that is harmless -- the shell landed back at 0.42 -- but a CLICK
       * replays this range against a shell that is still interpolating, so the
       * card appeared beside a panel visibly still on the move and the two read
       * as one crowded space. Opening after the trim COMPLETES buys the beat
       * that was missing and lets the shell get most of the rest of the way
       * there before anything new enters.
       *
       * Two curves, one window, no overlap in what they own: the MOVEMENT
       * decelerates so the card settles instead of sliding to a stop, and the
       * VISIBILITY ramps symmetrically so it cannot jump from unseen to plainly
       * there in a couple of frames -- which is what made the arrival pop.
       */
      w = at(0.5665, 0.6035);
      tl.fromTo(
        sel('.p-disk-body'),
        { x: CARD_IN_X, filter: 'blur(' + CARD_IN_BLUR + 'px)' },
        { x: 0, filter: 'blur(0px)', duration: w.dur, ease: 'power2.out', immediateRender: true },
        w.pos,
      );
      tl.fromTo(
        sel('.p-disk-body'),
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: w.dur, ease: 'sine.inOut', immediateRender: true },
        w.pos,
      );
      w = at(0.605, 0.63); // then the caption
      tl.to(sel('.p-caption'), { autoAlpha: 1, duration: w.dur }, w.pos);

      /*
       * ── STATE 2 LEAVES: the build, undone ──────────────────────────────
       *
       * It used to be four opacity fades, which read as State 2 being switched
       * off rather than departing. Now it is the inverse of the entrance, on the
       * same mechanisms: the card leaves the way it arrived but rightward, and
       * the SAME dash on the SAME frozen path retracts from the disk back into
       * app.ts. Every tween here is a fromTo with explicit endpoints — a `to`
       * re-reads its start from the DOM on ScrollTrigger's invalidateOnRefresh,
       * which is what silently broke the forward trim once already.
       *
       * The progress bar is a child of .p-disk-body, so it stays resolved and
       * departs with the card rather than draining separately.
       */
      w = at(0.645, 0.675); // the caption releases first
      tl.fromTo(sel('.p-caption'), { autoAlpha: 1 },
        { autoAlpha: 0, duration: w.dur, immediateRender: false }, w.pos);

      w = at(0.655, 0.715); // the card departs LEFT -> RIGHT: the exact inverse
      tl.fromTo(sel('.p-disk-body'),
        { autoAlpha: 1, x: 0, filter: 'blur(0px)' },
        { autoAlpha: 0, x: 20, filter: 'blur(2px)', duration: w.dur, ease: 'power2.in', immediateRender: false },
        w.pos);

      w = at(0.66, 0.68); // the landing dot goes as the line starts to leave it
      tl.fromTo(sel('.p-conn-b'), { autoAlpha: 1 },
        { autoAlpha: 0, duration: w.dur, immediateRender: false }, w.pos);

      /*
       * THE REVERSE TRIM. Raising the offset shrinks the visible stroke from the
       * path's END back toward its START — measured — so the line retracts from
       * the disk destination into app.ts and vanishes at its source.
       */
      w = at(0.675, 0.755);
      tl.fromTo(sel('.p-conn-line'),
        { strokeDashoffset: 0 },
        { strokeDashoffset: () => lineLengthRef.current, duration: w.dur, ease: 'none', immediateRender: false },
        w.pos);

      w = at(0.745, 0.762); // the source dot goes last, as the line reaches it
      tl.fromTo(sel('.p-conn-a'), { autoAlpha: 1 },
        { autoAlpha: 0, duration: w.dur, immediateRender: false }, w.pos);

      w = at(0.752, 0.778); // the read that started it all releases
      tl.fromTo(sel('.p-size, .p-select'), { autoAlpha: 1 },
        { autoAlpha: 0, duration: w.dur, immediateRender: false }, w.pos);

      // ── Shell-only handoff (0.778 -> 0.885), then State 3 speaks ────────
      w = at(0.885, 0.945);
      tl.to(sel('.p-footer3, .p-ready'), { autoAlpha: 1, duration: w.dur }, w.pos);

      // Pin the total to exactly 1 so positions are literal scroll fractions.
      tl.to({}, { duration: 1 }, 0);

      scrollTriggerRef.current = ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        // Lengthened by TOTAL so every hold and every stretch is ADDED scroll,
        // never scroll taken from an approved transition.
        end: () => {
          if (window.innerWidth < 640) return `+=${Math.round(140 * TOTAL)}%`;
          if (window.innerWidth < 1200) return `+=${Math.round(160 * TOTAL)}%`;
          return `+=${Math.round(200 * TOTAL)}%`;
        },
        pin: true,
        pinSpacing: true,
        scrub: SCRUB,
        animation: tl,
        /*
         * MOBILE PIN STABILISERS.
         *
         * Both were on the OnDemand trigger before this section was rebuilt,
         * and are still on ProblemSolution's; the rewrite dropped them.
         *
         * anticipatePin lets ScrollTrigger pin fractionally early based on
         * scroll velocity, which is what stops a momentum flick on a phone from
         * engaging the pin a frame late and showing the jump that follows.
         * fastScrollEnd completes the section rather than leaving the scrub
         * lagging behind when the reader flicks straight past it.
         *
         * Neither changes a beat, a duration or an easing -- only when the pin
         * latches and how a fast fling is settled.
         */
        anticipatePin: 1,
        fastScrollEnd: true,
        invalidateOnRefresh: true,
        // Resize / relayout: re-resolve the held geometry before the next draw.
        onRefresh: () => setLinkGeometry(),
        onToggle: ({ isActive }) => {
          if (isActive) {
            inViewRef.current = true;
            onVisibleProgress(tl.progress());
          }
        },
      });
    }, containerRef);

    return () => {
      clickTweenRef.current?.kill();
      releaseIntentWatch();
      directActiveRef.current = false;
      setScrub(scrollTriggerRef.current, SCRUB);
      document.documentElement.style.scrollBehavior = '';
      stopLoading();
      stopDemo3();
      timelineRef.current = null;
      scrollTriggerRef.current = null;
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  /* Reduced motion: no pin, no scrub — the panel jumps to the chosen state. */
  useEffect(() => {
    if (!reducedMotion) return;
    const shell = shellRef.current;
    if (!shell) return;
    shell.classList.remove('od-unrevealed');
    applyState(shell, STATES[activeIndex]);
    if (stageRef.current) applyFrame(stageRef.current, activeIndex);
    const show = (s: string, on: boolean) => gsap.set(q(s), { autoAlpha: on ? 1 : 0 });
    show('.p-footer1', activeIndex === 0);
    show('.p-select, .p-size, .p-conn-a, .p-conn-b, .p-disk-body, .p-caption', activeIndex === 1);
    show('.p-footer3, .p-ready', activeIndex === 2);
    show('.p-topfade', activeIndex > 0);
    gsap.set(q('.p-conn-line'), { strokeDashoffset: 0 });
    gsap.set(q('.p-select'), { scaleX: 1 });
    loading.setResolved();
    gsap.set(q('.p-disk-body'), { x: 0, filter: 'none' });
    setLinkGeometry();
    if (countRef.current) {
      countRef.current.textContent = `${new Intl.NumberFormat('en-US').format(TARGET_COUNT)} files+ available`;
    }
  }, [reducedMotion, activeIndex]);

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ── CLICK NAVIGATION ─────────────────────────────────────────────────────
   * A click does not set a state. It tweens the SCROLL POSITION to the target
   * progress, so the same scrub-driven timeline renders every frame between —
   * the same frames a scroll would. Starting from the current position means
   * starting from the current visual frame; there is nothing to reset.
   *
   * A direct 1 <-> 3 skip passes through state 2's range of p. Its pieces are
   * hidden for the flight through their outer .p-state2 wrapper, which only this
   * controller writes -- and which it clears on landing, so the wrapper is never
   * left holding a value the timeline cannot undo.
   */
  /*
   * ── DIRECT MORPH ─────────────────────────────────────────────────────────
   *
   * Master progress is one-dimensional: any scroll tween from State 1 to State 3
   * MUST pass through State 2's authored values, so the panel visibly shrinks to
   * State 2's box before growing again. A direct 1 <-> 3 click therefore cannot
   * be a scroll tween at all.
   *
   * Instead the morph takes temporary ownership of the handful of properties
   * that define the composition and interpolates them straight from one resolved
   * endpoint to the other — State 2's numbers are never on the path. The scroll
   * is parked while it runs, so ScrollTrigger has no progress change to react to
   * and never fights for those properties.
   *
   * The destination values are read from the timeline itself, by seeking it to
   * the target and back inside one synchronous block (no paint happens in
   * between). That is what makes the hand-back at the end exact: when the scroll
   * finally jumps to the destination, the timeline renders values the morph has
   * already arrived at, so there is nothing left to move.
   */
  const readVisual = () => {
    const shell = shellRef.current;
    return {
      vars: MORPH_VARS.map((v) =>
        shell ? parseFloat(shell.style.getPropertyValue(v)) : 0,
      ),
      rects: MORPH_RECTS.map((selector) => {
        const el = q<SVGRectElement>(selector)[0];
        return RECT_ATTRS.map((a) => (el ? parseFloat(el.getAttribute(a) ?? '0') : 0));
      }),
      groups: MORPH_GROUPS.map((selector) => {
        const el = q<HTMLElement>(selector)[0];
        return el ? parseFloat(getComputedStyle(el).opacity) : 0;
      }),
    };
  };

  type Visual = ReturnType<typeof readVisual>;

  /**
   * @param eased  the eased journey position — drives the shell and the framing
   * @param time   the raw wall-clock fraction — drives the foreground handoff
   */
  const writeVisual = (a: Visual, b: Visual, eased: number, time: number) => {
    const lerp = (x: number, y: number) => x + (y - x) * eased;
    const shell = shellRef.current;
    if (shell) {
      MORPH_VARS.forEach((v, i) =>
        shell.style.setProperty(v, String(lerp(a.vars[i], b.vars[i]))),
      );
    }
    MORPH_RECTS.forEach((selector, i) =>
      q<SVGRectElement>(selector).forEach((el) =>
        RECT_ATTRS.forEach((attr, k) =>
          el.setAttribute(attr, String(lerp(a.rects[i][k], b.rects[i][k]))),
        ),
      ),
    );
    /*
     * Foreground ownership is sequenced, not cross-faded. Whichever groups are
     * on their way out finish inside FG_OUT_END; whichever are arriving do not
     * begin until FG_IN_START. Direction is read from the two snapshots, so the
     * reverse route gets the identical structure without a second code path.
     */
    const window_ = (from: number, to: number) =>
      EASE_FN(Math.min(1, Math.max(0, (time - from) / (to - from))));
    const leaving = window_(0, FG_OUT_END);
    const arriving = window_(FG_IN_START, 1);
    MORPH_GROUPS.forEach((selector, i) => {
      const start = a.groups[i];
      const end = b.groups[i];
      const phase = start > end ? leaving : start < end ? arriving : 1;
      gsap.set(q(selector), { autoAlpha: start + (end - start) * phase });
    });
  };

  /*
   * ── CLICK NAVIGATION: ONE MOTION AUTHORITY ───────────────────────────────
   *
   * A click never sets a state. It tweens the SCROLL POSITION toward the
   * destination, so ScrollTrigger stays the single source of truth and the same
   * timeline renders every frame between — the frames a scroll would produce.
   *
   * THE FIX. Previously two easings were stacked: the click tween's
   * power2.inOut moved the scroll, and then `scrub: 0.6` applied a second,
   * independent smoothing on the way from scroll to timeline. The visual
   * therefore trailed the scroll by roughly a third of a second and read as
   * catch-up rather than as one controlled move. For the length of a click the
   * scrub is switched off with the instance's own scrubDuration(0), so the
   * timeline tracks scroll frame-for-frame and the click tween is the only
   * easing in the chain. Normal smoothing is handed back the moment it ends —
   * including when the reader grabs the page mid-flight.
   *
   * Zeroing the scrub could snap if the timeline happened to be lagging at that
   * instant, so the scroll is first aligned to where the VISUAL actually is.
   * The section is pinned, so that alignment moves nothing on screen.
   *
   * Because the tween targets `window`, it always begins from wherever the page
   * currently is. Clicking mid-flight starts from the CURRENT frame — no snap
   * to the abandoned destination first.
   */
  /** Installs the reader-intent listeners for the current navigation. */
  const watchIntent = (onIntent: () => void) => {
    window.addEventListener('wheel', onIntent, { passive: true });
    window.addEventListener('touchstart', onIntent, { passive: true });
    window.addEventListener('keydown', onIntent);
    intentWatchRef.current = () => {
      window.removeEventListener('wheel', onIntent);
      window.removeEventListener('touchstart', onIntent);
      window.removeEventListener('keydown', onIntent);
    };
  };

  /**
   * THE ONE CLICK TRANSITION. Every route — adjacent or direct — runs through
   * here, so "1 second" means the same thing on all six.
   *
   * The old adjacent routes tweened SCROLL progress instead, and the shell's
   * morph occupies only a sub-range of the authored timeline: measured, the
   * panel moved for just 85-96ms of a 1000ms click, while a direct 1<->3 morph
   * used the full second. That is why some routes felt an order of magnitude
   * faster despite identical constants.
   *
   * Now one normalized proxy drives every route from the origin snapshot to the
   * destination snapshot, so the shell always occupies the whole second and is
   * exactly half way at 500ms — whichever pair of states is involved.
   */
  const runClickMorph = (index: number) => {
    const st = scrollTriggerRef.current;
    const tl = timelineRef.current;
    if (!st || !tl) return;

    directActiveRef.current = true;
    // Nothing semantic autoplays while the morph owns the visual.
    skipRef.current = true;
    document.documentElement.style.scrollBehavior = 'auto';
    setScrub(st, 0);

    const origin = tl.progress();
    st.scroll(st.start + origin * (st.end - st.start));

    /*
     * A CLICK INTO STATE 2 ALWAYS ARRIVES AT ZERO.
     *
     * Zeroed HERE, at t = 0, which is the last moment it is guaranteed unseen:
     * the card carries the bar, and the card is invisible at both origins --
     * State 1 has never shown it and State 3 left it behind. Resetting later,
     * once the card is on its way in, would show 312 MB snapping back to 0.
     * Coming from State 3 this replaces the old "restore it already resolved"
     * rule, so both click arrivals now read the same story from the same
     * controller: 0 MB / 0.0% / empty bar, then one autoplay.
     */
    if (index === 1) loading.setInitial();

    /** Seek the timeline without the lifecycle mistaking it for an arrival. */
    const silentSeek = (progress: number) => {
      suspendProgressRef.current = true;
      tl.progress(progress);
      suspendProgressRef.current = false;
    };

    // Read the destination composition without ever painting it.
    const from = readVisual();
    silentSeek(TARGET[index]);
    const to = readVisual();
    silentSeek(origin);
    writeVisual(from, from, 0, 0);

    const finishMorph = () => {
      directActiveRef.current = false;
      skipRef.current = false;
      releaseIntentWatch();
      setScrub(scrollTriggerRef.current, SCRUB);
      document.documentElement.style.scrollBehavior = '';
      /*
       * RELEASE .p-state2 BACK TO THE TIMELINE.
       *
       * The wrapper is a borrowed tool, not a state. It is the click's own way
       * of fading State 2 out on an exit, but leaving ANY value on it outlives
       * the click: the authored timeline never writes .p-state2, so an inline
       * opacity: 0 left behind here made State 2's connector and card invisible
       * for the rest of the page — under manual scroll as well as clicks.
       *
       * Clearing is always safe: land() has already seeked the timeline to the
       * destination, so State 2's children carry their correct authored opacity
       * at every endpoint (0 at States 1 and 3, resolved at State 2). The
       * wrapper returning to its CSS default of 1 therefore shows nothing that
       * should be hidden.
       */
      gsap.set(q('.p-state2'), { clearProps: 'opacity' });
    };

    const state2 = q('.p-state2');
    const wrapperFrom = state2[0]
      ? parseFloat(getComputedStyle(state2[0]).opacity)
      : 0;
    const arrivingAtState2 = index === 1;
    /** Where the eased clock stands within the arriving window, 0..1. */
    const easedIn = EASE_FN(FG_IN_START);
    const arrivedFraction = (eased: number) =>
      Math.min(1, Math.max(0, (eased - easedIn) / (1 - easedIn)));

    const proxy = { t: 0 };
    let flipped = false;
    let handedOver = false;
    const render = () => {
      const eased = EASE_FN(proxy.t);

      if (arrivingAtState2) {
        /*
         * PLAY State 2's build rather than jump to it. The authored range runs
         * app.ts -> size -> connector draw -> card -> caption, so the card can
         * only arrive once the connector has very nearly landed. It advances on
         * the click's own eased clock, so it shares the transition's character.
         */
        if (proxy.t >= FG_IN_START) {
          silentSeek(
            BUILD2_FROM + (BUILD2_TO - BUILD2_FROM) * arrivedFraction(eased),
          );
          /*
           * Re-assert the card AFTER the seek, so it has exactly one writer per
           * frame -- the same seek-then-own pattern the shell and the foreground
           * groups already use. Movement decelerates; visibility ramps
           * symmetrically so there is no frame where it jumps into being.
           */
          const u = window01(proxy.t, CARD_IN_FROM, CARD_IN_TO);
          const settle = CARD_SETTLE(u);
          gsap.set(q('.p-disk-body'), {
            autoAlpha: CARD_SOFT(u),
            x: CARD_IN_X * (1 - settle),
            filter: 'blur(' + CARD_IN_BLUR * (1 - settle) + 'px)',
          });
          gsap.set(q('.p-caption'), {
            autoAlpha: CARD_SOFT(window01(proxy.t, CAPTION_IN_FROM, 1)),
          });
        }
      } else if (!handedOver && proxy.t >= FG_OUT_END) {
        /*
         * Leaving toward State 1 or 3: hand the inner layer its destination
         * values once, while the wrapper is already transparent. This is the
         * exit path and is deliberately untouched.
         */
        handedOver = true;
        silentSeek(TARGET[index]);
      }

      writeVisual(from, to, eased, proxy.t);

      /*
       * The wrapper steps rather than fades when arriving, because the build
       * underneath starts from its own invisible first frame — fading it as
       * well would show the card twice over.
       */
      const wrapper = arrivingAtState2
        ? proxy.t >= FG_IN_START
          ? 1
          : wrapperFrom
        : wrapperFrom *
          (1 -
            EASE_FN(Math.min(1, Math.max(0, proxy.t / FG_OUT_END))));
      gsap.set(state2, { opacity: wrapper });

      if (!flipped && proxy.t >= 0.5) {
        flipped = true;
        highlightRef.current = index;
        setActiveIndex(index);
      }
    };
    const land = () => {
      silentSeek(TARGET[index]);
      writeVisual(from, to, 1, 1);
      // The visual already IS the destination, so this moves nothing on screen.
      st.scroll(st.start + TARGET[index] * (st.end - st.start));
      ScrollTrigger.update();
      lastVRef.current = TARGET[index];
      finishMorph();
      /*
       * One autoplay, whichever state the click came from. The proxy was zeroed
       * at t = 0 and the card has finished arriving by now, so the bar, the MB
       * and the percentage all leave 0 together on the same normalized p.
       */
      if (index === 1) loading.playForward();
    };

    clickTweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: CLICK_DURATION,
      // Linear here on purpose: EASE_FN is applied inside render, so the
      // foreground handoff can be scheduled in real milliseconds.
      ease: 'none',
      overwrite: true,
      onUpdate: render,
      onComplete: land,
    });

    /*
     * Not a state transition — an abort. A morph frame matches no scroll
     * position, so control cannot be dropped mid-way without the panel jumping;
     * it closes the remaining distance quickly instead of holding the reader
     * for a full CLICK_DURATION.
     */
    watchIntent(() => {
      releaseIntentWatch();
      clickTweenRef.current?.kill();
      clickTweenRef.current = gsap.to(proxy, {
        t: 1,
        duration: 0.28,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: render,
        onComplete: land,
      });
    });
  };

  /*
   * A click never sets a state and never tweens scroll. It hands the visual to
   * runClickMorph, which lands on the destination and then synchronises the real
   * scroll position so ScrollTrigger resumes as the source of truth — manual
   * scrolling afterwards is sequential exactly as authored.
   *
   * Clicking mid-transition simply starts a new morph from the CURRENT rendered
   * frame, which is why interruption needs no special case.
   */
  const scrollToItem = (index: number) => {
    if (reducedMotion) {
      setActiveIndex(index);
      return;
    }
    if (!scrollTriggerRef.current || !timelineRef.current) return;
    clickTweenRef.current?.kill();
    releaseIntentWatch();
    runClickMorph(index);
  };

  const textHeader = (
    <div className="relative z-10 flex w-full max-w-[500px] flex-col gap-[10px] min-[744px]:items-center min-[744px]:text-center lg:items-start lg:text-left">
      <SectionLabel label="On demand files" />
      <h2 className="text-section font-normal text-text-primary">
        The whole tree,<br className="sm:hidden" />{' '}a fraction of the disk
      </h2>
      <p className="text-[14px] leading-[20px] text-text-primary">
        Beam keeps lightweight refs to every file and downloads contents only when
        something actually reads them. You conserve disk space
        <br className="hidden min-[744px]:block" />
        on laptops and small sandboxes, while the full file
        <br className="hidden min-[744px]:block" />
        system stays browsable and searchable.
      </p>
    </div>
  );

  const renderItem = (index: number, isActive: boolean) => {
    const item = items[index];
    const isLast = index === items.length - 1;
    return (
      <div
        key={item.title}
        id={`ondemand-item-${index}`}
        className="relative flex items-start gap-[6px]"
      >
        {!isLast && (
          <div
            className="pointer-events-none absolute -bottom-4 left-[5.5px] top-4 w-px overflow-hidden rounded-full bg-black/[0.08]"
            aria-hidden="true"
          >
            <motion.span
              className="block h-full w-full origin-top bg-text-primary"
              initial={false}
              animate={{ scaleY: activeIndex > index ? 1 : 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.35,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          </div>
        )}

        <div className="relative z-10 flex h-5 w-3 shrink-0 items-center justify-center">
          <img
            src={item.icon}
            alt=""
            className={`h-3 w-3 shrink-0 bg-canvas transition-all duration-500 ${
              index <= activeIndex ? 'opacity-100' : 'opacity-[0.55]'
            }`}
            width={12}
            height={12}
          />
        </div>
        <div className="flex flex-col text-[14px] leading-[20px] min-[744px]:w-[200px] min-[744px]:flex-none lg:w-auto lg:flex-initial">
          <button
            type="button"
            onClick={() => scrollToItem(index)}
            aria-pressed={isActive}
            className={`rounded-sm text-left font-normal transition-colors duration-500 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 ${
              index <= activeIndex ? 'text-text-primary' : 'text-text-muted'
            }`}
          >
            {item.title}
          </button>
          <motion.div
            className="od-desc"
            initial={false}
            animate={{
              gridTemplateRows: isActive ? '1fr' : '0fr',
              opacity: isActive ? 1 : 0,
            }}
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div>
              <span className="block text-text-secondary">
                {item.description}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  /*
   * THE PANEL. One shell, one drawing, in one place in the tree. The layout
   * around it is pure CSS, so no breakpoint can move this subtree to another
   * parent and force React to remount it.
   */
  const keyVisual = (
    <div ref={stageRef} className="od-stage min-[744px]:-mb-16 min-[1200px]:mb-0">
      <div ref={shellRef} className="od-shell">
        <div className="od-inner">
          <div className="od-list" />
          <div className="od-content-clip">
            <OnDemandPanel countRef={countRef} />
          </div>
        </div>
        <div className="od-below">
          <OnDemandSatellites />
        </div>
      </div>
      <div className="od-link">
        <OnDemandLink />
      </div>
      <div className="od-frame">
        <OnDemandFrame />
      </div>
    </div>
  );

  return (
    <section
      ref={containerRef}
      className="od-section relative h-[100svh] w-full bg-canvas lg:h-[100dvh]"
    >
      <style>{shellCss}</style>

      <div className="od-layout mx-auto flex h-full w-full max-w-[500px] flex-col items-start justify-start gap-6 px-5 pt-12 sm:max-w-[640px] sm:px-8 sm:pt-16 min-[744px]:w-[680px] min-[744px]:max-w-none min-[744px]:-translate-y-12 min-[744px]:items-center min-[744px]:justify-center min-[744px]:gap-8 min-[744px]:px-0 min-[744px]:pt-0 lg:translate-y-0 lg:justify-start min-[1200px]:w-full min-[1200px]:max-w-[1440px] min-[1200px]:translate-y-0 min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:justify-center min-[1200px]:gap-0">
        <div className="flex w-full min-w-0 items-center justify-center min-[1200px]:order-2 min-[1200px]:flex-1">
          {keyVisual}
        </div>

        <div className="flex w-full flex-col gap-6 min-[744px]:items-center min-[744px]:gap-8 min-[1200px]:order-1 min-[1200px]:w-[631px] min-[1200px]:shrink-0 min-[1200px]:items-start min-[1200px]:justify-center min-[1200px]:gap-[130px] min-[1200px]:pl-[131px]">
          {textHeader}
          <div className="flex w-full max-w-[500px] flex-col gap-3 min-[744px]:w-fit min-[744px]:max-w-full lg:w-full lg:max-w-[500px]">
            {items.map((_, index) => renderItem(index, index === activeIndex))}
          </div>
        </div>
      </div>
    </section>
  );
}
