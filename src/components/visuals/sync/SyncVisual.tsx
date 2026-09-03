"use client";

import { useEffect, useMemo, useRef, type PointerEvent } from "react";

/*
 * REAL TIME OWNS THIS VISUAL.
 *
 *   performance.now()
 *     -> elapsed ms since THIS transaction began
 *     -> normalized progress
 *     -> every stage value, the dotted trail, and the counter
 *
 * Nothing reads its state back from an animation. A transaction is 1800ms of
 * wall clock, measured, not asserted by keyframe percentages: the MacBook change
 * begins at elapsed 0 and the Cloud VM finishes at elapsed 1800, whatever the
 * frame rate does in between. Easing is applied to VALUES sampled from that
 * clock; the clock itself is never eased.
 */
const TRANSACTION_MS = 1800;
const SETTLE_SHORT_MS = 500;
const SETTLE_SYNCED_MS = 700;
const LOOP_CYCLE_MS =
  TRANSACTION_MS * 2 + SETTLE_SHORT_MS + SETTLE_SYNCED_MS;

/* Stage windows, in ms from the transaction's own start. Cloud lands on 1800. */
const MAC_CHANGE: readonly [number, number] = [0, 420];
const LOWER_TRAIL: readonly [number, number] = [200, 640];
const BEAM_RECEIVE: readonly [number, number] = [640, 1060];
const UPPER_TRAIL: readonly [number, number] = [940, 1380];
const CLOUD_RECEIVE: readonly [number, number] = [1380, TRANSACTION_MS];

/* Dotted state trail: a clear head with a falloff tail, not a marquee. */
/*
 * ONE packet, not thirty-two particles. A single head position walks the path
 * and every particle hangs off it at a fixed arc-length offset, so the packet
 * keeps its shape through bends and nothing is individually animated or delayed.
 *
 * THIS IS THE FOUNDER-APPROVED PROFILE, authored directly.
 *
 * It was arrived at in the Motion Lab at Trail Length 2.00, Dot Scale 1.20,
 * Glow Intensity 0.40, Glow Radius 1.00 over the previous 16-particle baseline,
 * and those four settings are baked into the arrays below rather than left as
 * runtime multipliers. The homepage renders <SyncVisual /> with no tuning prop
 * and gets exactly this — the dev dials are a relative layer on top, so 1.00x
 * on all four now MEANS this profile.
 *
 * 32 particles at 8-unit spacing span 248 of the 412-unit path (60.2%) — a long
 * flowing stream that still never spans the whole route. The length comes from
 * particle COUNT, not from wider gaps: spacing is untouched at 8.
 *
 * Head core 3.36 against a 2.5 connector, 1.34x the line. It reads as the front
 * through opacity and its halo as much as through size.
 *
 * Both falloffs stay gentle early and evaporate together at the tail: the
 * leading three are within 1.5% of each other in size, the mid-section still
 * holds 0.50 opacity at the fifteenth particle, and the last particle is at
 * 0.02 opacity / 1.62 units rather than ending on a medium dot. Head-to-tail
 * size range is 3.36 -> 1.62 (2.1x), so the packet reads as one coherent
 * stream rather than a shrinking queue.
 */
const TRAIL_OPACITY = [
  1, 0.985484, 0.970968, 0.951935, 0.932581, 0.904839, 0.875806, 0.839032,
  0.800323, 0.758065, 0.714516, 0.670968, 0.627419, 0.583871, 0.540323,
  0.496774, 0.453226, 0.411935, 0.373226, 0.334516, 0.295806, 0.25871, 0.224839,
  0.192258, 0.163226, 0.135161, 0.110968, 0.087419, 0.068065, 0.049032,
  0.034516, 0.02,
] as const;
const TRAIL_SIZE = [
  3.36, 3.330968, 3.301935, 3.245806, 3.187742, 3.129677, 3.071613, 3.013548,
  2.955484, 2.897419, 2.839355, 2.78129, 2.723226, 2.665161, 2.607097, 2.549032,
  2.490968, 2.432903, 2.374839, 2.316774, 2.25871, 2.200645, 2.142581, 2.084516,
  2.026452, 1.968387, 1.910323, 1.852258, 1.794194, 1.736129, 1.678065, 1.62,
] as const;
/*
 * Halo strength per particle, at the approved Glow Intensity 0.40 — the earlier
 * 0.55 / 0.44 / 0.32 ... profile scaled by 0.4 and baked. Sharp core, subtle
 * bloom, front-loaded: the leading three carry it, the next four keep a trace,
 * the remaining twenty-five have none. Blurring the whole packet equally is what
 * turns a luminous trail into fog, so the halo is a separate underlay rather
 * than a filter on the group. Cores are NOT dimmed by this — TRAIL_OPACITY is
 * untouched by glow.
 */
const TRAIL_HALO = [
  0.22, 0.176, 0.128, 0.08, 0.048, 0.024, 0.012, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
] as const;
/*
 * Halo FOOTPRINT per particle, in path units, at the approved Glow Radius 1.00.
 *
 * This used to be derived as core size x a single TRAIL_HALO_SCALE factor. That
 * derivation no longer holds: baking Trail Length 2.00 resampled the core sizes
 * onto a finer index, so the halo — which stays anchored to the leading
 * particles BY INDEX — no longer has a fixed ratio to the core beneath it. No
 * single scale factor reproduces the approved footprint (it would need 2.09 at
 * the head falling to 1.84 by the seventh). Authoring the footprint directly is
 * what preserves the signed-off bloom exactly, so the leading halo stays 7.028
 * units as it was.
 *
 * Entries past the seventh are 0 because their halo opacity is 0 and the layer
 * is not rendered at all; they exist only to keep the array index-aligned.
 */
const TRAIL_HALO_SIZE = [
  7.028, 6.9025, 6.6515, 6.4005, 6.1495, 5.8985, 5.6475, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
] as const;
/*
 * Blur radius of the halo underlay (feGaussianBlur stdDeviation, path units).
 * 1.35 is the approved value and Glow Radius 1.00 leaves it exactly there; the
 * dev dial multiplies it together with the halo footprint so the bloom spreads
 * or tightens as one thing.
 */
const TRAIL_HALO_BLUR = 1.35;
const TRAIL_SPACING = 8;
/** Particles in the approved profile. A tuning length of 1 reproduces exactly this. */
const BASE_VISIBLE = 32;
/** Ceiling for the dev tuning dial; production never renders more than BASE_VISIBLE. */
const MAX_PARTICLES = 64;

/*
 * DEV-ONLY relative tuning layer. Every field is a multiplier over the baked
 * Founder-approved profile above, so 1 means "production, unchanged" for all
 * four — a panel reset reproduces the homepage exactly.
 */
export type SyncTrailTuning = {
  /** Multiplier on the packet's head-to-tail span. 1 = the approved 32 particles. */
  length?: number;
  /** Multiplier on every particle's core size. 1 = the approved sizes. */
  scale?: number;
  /**
   * Multiplier on the halo layer's opacity. 0 = no halo (cores remain),
   * 1 = the approved glow, 2 = roughly twice as strong. Cores are untouched.
   */
  glowIntensity?: number;
  /**
   * Multiplier on the halo's footprint AND blur radius. 0.5 = tight rim,
   * 1 = the approved glow, 2 = broad soft bloom. The per-particle falloff
   * (head strongest, tail none) is preserved at every value.
   */
  glowRadius?: number;
};

/** The halo-only part of the tuning, clamped, with the resolved blur. */
export function resolveTrailGlow(tuning?: SyncTrailTuning) {
  const intensity = Math.min(2, Math.max(0, tuning?.glowIntensity ?? 1));
  const radius = Math.min(2, Math.max(0.5, tuning?.glowRadius ?? 1));
  return { intensity, radius, blur: TRAIL_HALO_BLUR * radius };
}

type TrailParticle = {
  size: number;
  opacity: number;
  halo: number;
  haloSize: number;
};

/**
 * The packet's per-particle profile, optionally stretched or scaled.
 *
 * `length` adds PARTICLES rather than widening gaps — spacing stays at
 * TRAIL_SPACING — and resamples the approved falloff across however many there
 * are, so the head/mid/tail shape survives at any length.
 *
 * `scale` multiplies core sizes only. The halo is deliberately left out of both:
 * it stays anchored to the leading particles BY INDEX and is sized from its own
 * authored TRAIL_HALO_SIZE footprint, so neither dial can alter the approved
 * glow.
 *
 * `glowIntensity` scales halo opacity only; `glowRadius` scales halo footprint
 * only (its blur is scaled alongside by resolveTrailGlow). Neither touches a
 * core, and both multiply the same front-loaded TRAIL_HALO falloff, so the
 * head/mid/tail hierarchy is preserved — the tail's halo stays at zero.
 *
 * With no tuning this returns the approved 32-particle profile verbatim: count
 * is BASE_VISIBLE, so `at` lands on whole indices and every value is read
 * straight out of the arrays with no interpolation.
 */
export function resolveTrailProfile(tuning?: SyncTrailTuning): TrailParticle[] {
  const length = Math.min(2, Math.max(0.5, tuning?.length ?? 1));
  const scale = Math.min(1.6, Math.max(0.4, tuning?.scale ?? 1));
  const glow = resolveTrailGlow(tuning);
  const count = Math.min(
    MAX_PARTICLES,
    Math.max(2, Math.round(BASE_VISIBLE * length)),
  );

  const profile: TrailParticle[] = [];
  for (let i = 0; i < count; i += 1) {
    const at = (i / (count - 1)) * (BASE_VISIBLE - 1);
    const lo = Math.min(BASE_VISIBLE - 1, Math.floor(at));
    const hi = Math.min(BASE_VISIBLE - 1, lo + 1);
    const f = at - lo;

    const baseSize = TRAIL_SIZE[lo] + (TRAIL_SIZE[hi] - TRAIL_SIZE[lo]) * f;
    const opacity =
      TRAIL_OPACITY[lo] + (TRAIL_OPACITY[hi] - TRAIL_OPACITY[lo]) * f;

    profile.push({
      size: baseSize * scale,
      opacity,
      halo: Math.min(1, (TRAIL_HALO[i] ?? 0) * glow.intensity),
      haloSize:
        (TRAIL_HALO_SIZE[Math.min(i, BASE_VISIBLE - 1)] ?? 0) * glow.radius,
    });
  }
  return profile;
}

/** Founder-facing description of a tuning setting, for the dev panel readout. */
export function describeTrail(tuning?: SyncTrailTuning) {
  const profile = resolveTrailProfile(tuning);
  const glow = resolveTrailGlow(tuning);
  return {
    count: profile.length,
    spanUnits: (profile.length - 1) * TRAIL_SPACING,
    headSize: profile[0].size,
    /** Particles whose halo is visible at all (opacity > 0). */
    haloCount: profile.filter((particle) => particle.halo > 0).length,
    headHalo: profile[0].halo,
    headHaloSize: profile[0].haloSize,
    haloBlur: glow.blur,
  };
}
const TRAIL_SAMPLES = 512;

type PathTable = { len: number; xs: Float32Array; ys: Float32Array };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/* Matches the approved cubic-bezier(.22, 1, .36, 1) to within ~1%. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);
const stageProgress = (elapsed: number, [from, to]: readonly [number, number]) =>
  clamp01((elapsed - from) / (to - from));

export type SyncSample = {
  /** null while settled between transactions. */
  kind: "add" | "delete" | null;
  synced: boolean;
  /** ms of real time since THIS transaction began. */
  elapsed: number;
  mac: number;
  beam: number;
  cloud: number;
  /** displayed seconds, truncated for presentation only. */
  seconds: number;
  /** trail head as a fraction of the connector; null when no trail is in flight. */
  lowerHead: number | null;
  upperHead: number | null;
  done: boolean;
};

/**
 * The whole visual as a pure function of REAL ELAPSED MILLISECONDS.
 *
 * The render loop does nothing but `sampleSyncAt(mode, performance.now() - t0)`
 * and write the result to the DOM, so a transaction lasts 1800ms of wall clock
 * by construction: `sinceStart` is real time, and the Cloud VM reaches its final
 * value exactly when that argument reaches TRANSACTION_MS. Easing is applied to
 * the returned values, never to the argument.
 *
 * Exported so the schedule can be checked directly with real numbers.
 */
export function sampleSyncAt(mode: "intro" | "loop", sinceStart: number): SyncSample {
  const settled = (synced: boolean, done: boolean): SyncSample => ({
    kind: null,
    synced,
    elapsed: TRANSACTION_MS,
    mac: synced ? 1 : 0,
    beam: synced ? 1 : 0,
    cloud: synced ? 1 : 0,
    seconds: TRANSACTION_MS / 1000,
    lowerHead: null,
    upperHead: null,
    done,
  });

  const transaction = (adding: boolean, elapsed: number): SyncSample => {
    const towards = (progress: number) => (adding ? progress : 1 - progress);
    const trail = ([from, to]: readonly [number, number]) =>
      elapsed < from ? null : (elapsed - from) / (to - from);
    return {
      kind: adding ? "add" : "delete",
      synced: false,
      elapsed,
      mac: towards(easeOut(stageProgress(elapsed, MAC_CHANGE))),
      beam: towards(easeOut(stageProgress(elapsed, BEAM_RECEIVE))),
      cloud: towards(easeOut(stageProgress(elapsed, CLOUD_RECEIVE))),
      seconds: Math.min(elapsed / 1000, TRANSACTION_MS / 1000),
      lowerHead: trail(LOWER_TRAIL),
      upperHead: trail(UPPER_TRAIL),
      done: false,
    };
  };

  if (mode === "intro") {
    return sinceStart >= TRANSACTION_MS ? settled(true, true) : transaction(true, sinceStart);
  }

  // Each MacBook-originated change gets its own fresh 1.8s measurement; the
  // modulo only schedules when the next one starts.
  const cycle = ((sinceStart % LOOP_CYCLE_MS) + LOOP_CYCLE_MS) % LOOP_CYCLE_MS;
  if (cycle < TRANSACTION_MS) return transaction(false, cycle);
  if (cycle < TRANSACTION_MS + SETTLE_SHORT_MS) return settled(false, false);
  if (cycle < TRANSACTION_MS * 2 + SETTLE_SHORT_MS) {
    return transaction(true, cycle - TRANSACTION_MS - SETTLE_SHORT_MS);
  }
  return settled(true, false);
}

function tabulate(path: SVGPathElement): PathTable {
  const len = path.getTotalLength();
  const xs = new Float32Array(TRAIL_SAMPLES + 1);
  const ys = new Float32Array(TRAIL_SAMPLES + 1);
  for (let i = 0; i <= TRAIL_SAMPLES; i += 1) {
    const point = path.getPointAtLength((len * i) / TRAIL_SAMPLES);
    xs[i] = point.x;
    ys[i] = point.y;
  }
  return { len, xs, ys };
}

export function SyncVisual({ trailTuning }: { trailTuning?: SyncTrailTuning } = {}) {
  /*
   * DEV-ONLY tuning seam. Absent in production, where the approved profile is
   * used verbatim. This component imports nothing from src/dev and knows nothing
   * about DialKit — the Motion Lab passes plain numbers in.
   */
  const trailProfile = useMemo(
    () => resolveTrailProfile(trailTuning),
    [
      trailTuning?.length,
      trailTuning?.scale,
      trailTuning?.glowIntensity,
      trailTuning?.glowRadius,
    ],
  );
  const trailGlow = resolveTrailGlow(trailTuning);
  const trailProfileRef = useRef(trailProfile);
  trailProfileRef.current = trailProfile;

  const rootRef = useRef<SVGSVGElement>(null);
  const counterRef = useRef<SVGTextElement>(null);
  const lowerPathRef = useRef<SVGPathElement>(null);
  const upperPathRef = useRef<SVGPathElement>(null);
  const lowerDotsRef = useRef<SVGGElement[]>([]);
  const upperDotsRef = useRef<SVGGElement[]>([]);

  const runRef = useRef<{ mode: "intro" | "loop"; t0: number } | null>(null);
  const stopRequestedRef = useRef(false);
  const introDoneRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lowerTable = lowerPathRef.current ? tabulate(lowerPathRef.current) : null;
    const upperTable = upperPathRef.current ? tabulate(upperPathRef.current) : null;

    const setVar = (name: string, value: number) =>
      root.style.setProperty(name, String(value));

    // The value stays continuous; only this label is quantised, and it truncates
    // so the readout never claims a tenth that has not actually elapsed yet.
    const showCount = (seconds: number) => {
      const node = counterRef.current;
      if (!node) return;
      const label = `${(Math.floor(seconds * 10) / 10).toFixed(1)}s`;
      if (node.textContent !== label) node.textContent = label;
    };

    const hideTrail = (dots: SVGGElement[]) => {
      for (const dot of dots) dot.style.opacity = "0";
    };

    const drawTrail = (
      dots: SVGGElement[],
      table: PathTable | null,
      headFraction: number | null,
      reversed: boolean,
    ) => {
      if (!table) return;
      const profile = trailProfileRef.current;
      // Head reaches the destination exactly when that machine starts reacting;
      // afterwards it keeps going so the tail flows out rather than blinking off.
      const head = (headFraction ?? 0) * table.len;
      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        if (!dot) continue;
        const particle = profile[i];
        const distance = head - i * TRAIL_SPACING;
        if (
          !particle ||
          headFraction === null ||
          distance < 0 ||
          distance > table.len ||
          particle.opacity === 0
        ) {
          dot.style.opacity = "0";
          continue;
        }
        // `distance` is measured along the direction of TRAVEL; map it onto the
        // authored path, flipping when the path runs against the semantics.
        const along = reversed ? table.len - distance : distance;
        const t = clamp01(along / table.len) * TRAIL_SAMPLES;
        const index = Math.min(TRAIL_SAMPLES - 1, Math.floor(t));
        const f = t - index;
        const x = table.xs[index] + (table.xs[index + 1] - table.xs[index]) * f;
        const y = table.ys[index] + (table.ys[index + 1] - table.ys[index]) * f;
        dot.setAttribute("transform", `translate(${x} ${y})`);
        dot.style.opacity = String(particle.opacity);
      }
    };

    const paint = (sample: SyncSample) => {
      setVar("--mac-open", sample.mac);
      setVar("--beam-open", sample.beam);
      setVar("--cloud-open", sample.cloud);
      showCount(sample.seconds);
      // MacBook -> Beam runs against the authored path; Beam -> Cloud runs with it.
      drawTrail(lowerDotsRef.current, lowerTable, sample.lowerHead, true);
      drawTrail(upperDotsRef.current, upperTable, sample.upperHead, false);
    };

    const rest = () => {
      runRef.current = null;
      frameRef.current = null;
      stopRequestedRef.current = false;
      root.style.removeProperty("--mac-open");
      root.style.removeProperty("--beam-open");
      root.style.removeProperty("--cloud-open");
      showCount(TRANSACTION_MS / 1000);
      hideTrail(lowerDotsRef.current);
      hideTrail(upperDotsRef.current);
    };

    const frame = (now: number) => {
      const run = runRef.current;
      if (!run) return;

      // The ONLY input is real elapsed time.
      const sample = sampleSyncAt(run.mode, now - run.t0);

      if (sample.done) {
        introDoneRef.current = true;
        rest();
        return;
      }
      // Release only on the synced settle: it is the resting state, so handing
      // control back is invisible, and testing it on the frame itself means no
      // timer can overshoot into the MacBook shrink that follows.
      if (sample.kind === null && sample.synced && stopRequestedRef.current) {
        rest();
        return;
      }

      paint(sample);
      frameRef.current = requestAnimationFrame(frame);
    };

    const start = (mode: "intro" | "loop") => {
      stopRequestedRef.current = false;
      runRef.current = { mode, t0: performance.now() };
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(frame);
    };

    startRef.current = start;
    restRef.current = rest;

    // Collapsed and waiting, so the intro reads as a build rather than a snap.
    setVar("--mac-open", 0);
    setVar("--beam-open", 0);
    setVar("--cloud-open", 0);
    showCount(0);

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          observer?.disconnect();
          start("intro");
        },
        { threshold: 0.35 },
      );
      observer.observe(root);
    } else {
      start("intro");
    }

    return () => {
      observer?.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      runRef.current = null;
      startRef.current = null;
      restRef.current = null;
    };
  }, []);

  const startRef = useRef<((mode: "intro" | "loop") => void) | null>(null);
  const restRef = useRef<(() => void) | null>(null);

  function beginHover(event: PointerEvent<SVGSVGElement>) {
    if (
      event.pointerType !== "mouse" ||
      !introDoneRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    stopRequestedRef.current = false;
    if (runRef.current?.mode === "loop") return;
    startRef.current?.("loop");
  }

  function endHover(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType !== "mouse") return;
    // The frame loop lets the current transaction finish and releases on the
    // synced settle, so exit never lands part-way through a state change.
    stopRequestedRef.current = true;
  }

  return (
<svg
  ref={rootRef}
  className="sync-root"
  viewBox="0 0 809 692"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="A new file in the Beam workspace synchronising to a Cloud VM and a MacBook Pro, until all three machines match."
  onPointerEnter={beginHover}
  onPointerLeave={endHover}
  style={{
    display: "block",
    width: "100%",
    maxWidth: 809,
    height: "auto",
    aspectRatio: "809 / 692",
    overflow: "hidden",
    background: "#fafafa",
    // Not a control: no hand cursor, nothing to click, nothing selectable.
    cursor: "default",
    userSelect: "none",
    WebkitUserSelect: "none",
  }}
>
<style>{`
  /*
   * Sync story: MacBook (source) -> Beam workspace -> Cloud VM.
   *
   * Panels genuinely hug their content. Each panel's open/closed state is a
   * single animatable number; every geometry rule below is a static calc() that
   * reads it, so one variable moves the card frame, the rows above, the rows
   * below and the auth.ts row together as one real layout change.
   *
   * Collapse removes exactly one 44px row and is CENTRE-ANCHORED: the frame
   * gains 22px of y and loses 44px of height, content above moves down 22px and
   * content below moves up 22px. The panel's vertical centre never moves, so the
   * topology stays put.
   *
   * Panels only ever shrink from their authored size, so the existing clipPaths
   * stay oversized and never clip — no defs surgery required.
   */
  @property --beam-open { syntax: "<number>"; inherits: true; initial-value: 1; }
  @property --cloud-open { syntax: "<number>"; inherits: true; initial-value: 1; }
  @property --mac-open { syntax: "<number>"; inherits: true; initial-value: 1; }

  .sync-root {
    --intro-cycle: 1.8s;
    --loop-cycle: 4.8s;
    --row: 44px;
    --half-row: 22px;
  }

  /*
   * Panel grow/shrink curve: cubic-bezier(.22, 1, .36, 1), applied per segment
   * inside the drive keyframes so each panel move eases while every hold stays a
   * true hold: 40% of the height change in the first 10% of the stage, 86% by a
   * third of it, settled at the end. That is the Clerk profile (51% @ 50ms,
   * 90% @ 163ms of a nominal 500ms). Monotonic, so no overshoot and no bounce.
   *
   * The curve now lives in JS as easeOut(), applied to a stage progress that was
   * itself sampled from the real clock — the values ease, the clock never does.
   */

  /* Collapsed and waiting for the build. Set from JS only. */

  .sync-root [id^="NEW"] { fill: #0d76f2; }

  /*
   * Live transaction clock. The outlined label kept its "Synced everywhere ·"
   * glyphs; only the number became live text. Measured against the original
   * outlines, that number is TikTok Sans at 20px — figure height 14.76 (exact)
   * and "1.8s" 35.47 wide against the outline's 35.52 — so the typography is
   * the label's own, not a substitute.
   *
   * Its content is written from real elapsed ms each frame. It reads no
   * animation and no propagation state; those read the same clock it does.
   */
  .sync-root [id="sync-counter"] {
    font-family: "TikTok Sans", "TikTokSans", Inter, system-ui, sans-serif;
    font-size: 20px;
    font-variant-numeric: tabular-nums;
    fill: #0A0A0A;
  }

  .sync-root [id="Union"],
  .sync-root [id="Union_2"] { display: none; }

  /*
   * Panel drop shadow: Figma exported the ddddii shadow on the panel GROUP, so its
   * SourceAlpha included the inner Dialog's own drop shadow. Those chains mask with
   * feComposite operator="out" against hardAlpha (SourceAlpha x127, which makes even
   * 1% alpha opaque), so the Dialog's soft shadow subtracted the panel's shadow. It
   * happened to be harmless at the authored height and destroyed the shadow once the
   * panel collapsed, which read as a pale rounded shape detached below the card.
   * The filter now wraps the frame rect alone, outside the clip, so the shadow is cast
   * by the panel shape only and is identical in both states. Measured deltas below the
   * panel edge: short 40,26,21,17,14,11,9,7,5 - tall 41,26,20,17,14,11,9,7,5.
   *
   * Layout model, verified against the real SVG nesting:
   *
   *   Frame 21472604xx (panel)
   *     [outer frame rect] [inner card rects]
   *     Header_x
   *     Frame 2147260221_x        <- FILE LIST CONTAINER (holds ~/project too)
   *       rect h=236 / h=236.83       the file-list PLATE (white fill + grey ring)
   *       Frame 2147260340_x        README.md
   *       Frame 2147260341_x        auth.ts   <- the row that comes and goes
   *       Frame 2147260342_x        utils.ts
   *       Frame 2147260343_x        .env
   *         Frame 2147260345_x        lock  <- NESTED inside the .env row
   *
   * Transforms therefore INHERIT. Collapsing removes one 44px row, centre-anchored:
   *   every frame rect      y +22px, height -44px
   *   file-list plate       height -44px  (no y: the container's +22px already
   *                                       centre-anchors it, top +22 / bottom -22)
   *   Header + list container   +22px   (everything above the removed row)
   *   README                    none    (inherits the container's +22px)
   *   auth.ts + NEW             fades   (no movement)
   *   utils.ts and .env         -44px   (net -22px after the container's +22px)
   *   lock                      none    (inherits from its .env row, so it stays attached)
   */

  /* ---------- BEAM workspace (left) ---------- */
  .sync-root [id="Frame 2147260385"] rect[height="306.598"] {
    y: calc(183.701px + (1 - var(--beam-open)) * var(--half-row));
    height: calc(306.598px - (1 - var(--beam-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260385"] rect[height="305.768"] {
    y: calc(184.116px + (1 - var(--beam-open)) * var(--half-row));
    height: calc(305.768px - (1 - var(--beam-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260385"] rect[height="291.66"] {
    y: calc(191.17px + (1 - var(--beam-open)) * var(--half-row));
    height: calc(291.66px - (1 - var(--beam-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260385"] rect[height="290.83"] {
    y: calc(191.585px + (1 - var(--beam-open)) * var(--half-row));
    height: calc(290.83px - (1 - var(--beam-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260385"] rect[height="236"] {
    height: calc(236px - (1 - var(--beam-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260385"] rect[height="236.83"] {
    height: calc(236.83px - (1 - var(--beam-open)) * var(--row));
  }
  .sync-root [id="Header"],
  .sync-root [id="Frame 2147260221"] {
    transform: translateY(calc((1 - var(--beam-open)) * var(--half-row)));
  }
  .sync-root [id="Frame 2147260342"],
  .sync-root [id="Frame 2147260343"] {
    transform: translateY(calc((1 - var(--beam-open)) * var(--row) * -1));
  }
  /*
   * auth.ts resolves in place: scale + opacity + blur, no entrance translate.
   * NEW is a child of this row, so the badge is carried by the same state.
   * The -22px cancels the file-list container's collapse shift, which was what
   * made the row look like it slid up from below and back down on delete; the
   * panel still reflows around it, the row itself just no longer travels.
   */
  .sync-root [id="Frame 2147260341"] {
    opacity: var(--beam-open);
    transform-box: fill-box;
    transform-origin: center;
    transform:
      translateY(calc((1 - var(--beam-open)) * var(--half-row) * -1))
      scale(calc(.96 + .04 * var(--beam-open)));
    filter: blur(calc((1 - var(--beam-open)) * 3px));
  }

  /* ---------- CLOUD VM (right top) ---------- */
  .sync-root [id="Frame 2147260386"] rect[height="306.598"] {
    y: calc(21px + (1 - var(--cloud-open)) * var(--half-row));
    height: calc(306.598px - (1 - var(--cloud-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260386"] rect[height="305.768"] {
    y: calc(21.415px + (1 - var(--cloud-open)) * var(--half-row));
    height: calc(305.768px - (1 - var(--cloud-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260386"] rect[height="291.66"] {
    y: calc(28.4692px + (1 - var(--cloud-open)) * var(--half-row));
    height: calc(291.66px - (1 - var(--cloud-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260386"] rect[height="290.83"] {
    y: calc(28.8842px + (1 - var(--cloud-open)) * var(--half-row));
    height: calc(290.83px - (1 - var(--cloud-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260386"] rect[height="236"] {
    height: calc(236px - (1 - var(--cloud-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260386"] rect[height="236.83"] {
    height: calc(236.83px - (1 - var(--cloud-open)) * var(--row));
  }
  .sync-root [id="Header_2"],
  .sync-root [id="Frame 2147260221_2"] {
    transform: translateY(calc((1 - var(--cloud-open)) * var(--half-row)));
  }
  .sync-root [id="Frame 2147260342_2"],
  .sync-root [id="Frame 2147260343_2"] {
    transform: translateY(calc((1 - var(--cloud-open)) * var(--row) * -1));
  }
  /*
   * auth.ts resolves in place: scale + opacity + blur, no entrance translate.
   * NEW is a child of this row, so the badge is carried by the same state.
   * The -22px cancels the file-list container's collapse shift, which was what
   * made the row look like it slid up from below and back down on delete; the
   * panel still reflows around it, the row itself just no longer travels.
   */
  .sync-root [id="Frame 2147260341_2"] {
    opacity: var(--cloud-open);
    transform-box: fill-box;
    transform-origin: center;
    transform:
      translateY(calc((1 - var(--cloud-open)) * var(--half-row) * -1))
      scale(calc(.96 + .04 * var(--cloud-open)));
    filter: blur(calc((1 - var(--cloud-open)) * 3px));
  }

  /* ---------- MACBOOK PRO (right bottom) — the source ---------- */
  .sync-root [id="Frame 2147260431"] rect[height="306.598"] {
    y: calc(363.701px + (1 - var(--mac-open)) * var(--half-row));
    height: calc(306.598px - (1 - var(--mac-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260431"] rect[height="305.768"] {
    y: calc(364.116px + (1 - var(--mac-open)) * var(--half-row));
    height: calc(305.768px - (1 - var(--mac-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260431"] rect[height="291.66"] {
    y: calc(371.17px + (1 - var(--mac-open)) * var(--half-row));
    height: calc(291.66px - (1 - var(--mac-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260431"] rect[height="290.83"] {
    y: calc(371.585px + (1 - var(--mac-open)) * var(--half-row));
    height: calc(290.83px - (1 - var(--mac-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260431"] rect[height="236"] {
    height: calc(236px - (1 - var(--mac-open)) * var(--row));
  }
  .sync-root [id="Frame 2147260431"] rect[height="236.83"] {
    height: calc(236.83px - (1 - var(--mac-open)) * var(--row));
  }
  .sync-root [id="Header_3"],
  .sync-root [id="Frame 2147260221_3"] {
    transform: translateY(calc((1 - var(--mac-open)) * var(--half-row)));
  }
  .sync-root [id="Frame 2147260342_3"],
  .sync-root [id="Frame 2147260343_3"] {
    transform: translateY(calc((1 - var(--mac-open)) * var(--row) * -1));
  }
  /*
   * auth.ts resolves in place: scale + opacity + blur, no entrance translate.
   * NEW is a child of this row, so the badge is carried by the same state.
   * The -22px cancels the file-list container's collapse shift, which was what
   * made the row look like it slid up from below and back down on delete; the
   * panel still reflows around it, the row itself just no longer travels.
   */
  .sync-root [id="Frame 2147260341_3"] {
    opacity: var(--mac-open);
    transform-box: fill-box;
    transform-origin: center;
    transform:
      translateY(calc((1 - var(--mac-open)) * var(--half-row) * -1))
      scale(calc(.96 + .04 * var(--mac-open)));
    filter: blur(calc((1 - var(--mac-open)) * 3px));
  }

  /* ---------- propagation packets ---------- */

  /*
   * Dotted state trail. The connector paths below carry no stroke: they exist
   * only as geometry for getPointAtLength, and the dots are placed along them
   * from the real transaction clock. Opacity falls off behind a clear leading
   * edge so the direction of travel reads on its own, and the leading seven
   * carry a halo underlay (see TRAIL_HALO) rather than the whole packet glowing.
   */
  .sync-trail-path { stroke: none; fill: none; }
  .sync-trail g { opacity: 0; }
  .sync-trail rect { fill: #0D76F2; }
  /*
   * The halo is a blurred underlay behind a sharp core, so the particle keeps a
   * crisp edge and only gains a rim of light. A filter on the group would blur
   * the core too and read as fog.
   */
  .sync-trail-halo { filter: url(#syncTrailGlow); }



  /* ---------- keyframes ---------- */

  /* First view. Mac 150ms, Beam 900ms, +300ms -> upper packet 1200ms, Cloud 1750ms. */


  /*
   * Hover loop. Both stories originate on the MacBook and propagate forward.
   * ADD:    mac 2.9% | lower packet 6.7% | beam 17.3% | upper packet 23.1% | cloud 33.7%
   * DELETE: mac 53.8% | lower packet 57.7% | beam 68.3% | upper packet 74% | cloud 84.6%
   * The +0.3s overlap is 5.8% of a 5.2s cycle (17.3 -> 23.1, 68.3 -> 74).
   */

  @media (prefers-reduced-motion: reduce) {
    .sync-root,
    .sync-root * { animation: none !important; }
    /* Land directly on the synchronised result: every machine has auth.ts. */
    .sync-root {
      --beam-open: 1 !important;
      --cloud-open: 1 !important;
      --mac-open: 1 !important;
    }
    .sync-root .sync-trail g { opacity: 0 !important; }
  }
`}</style>
<rect width="809" height="692" fill="#B2B2B2"/>
<g id="Beam Website">
<g id="-">
<rect width="1440" height="892" transform="translate(0 -100)" fill="#FAFAFA"/>
<g id="Frame 2147260467">
<g id="Key Visual - Sync" clipPath="url(#clip0_928_111777)">
<rect width="809" height="692" fill="#FAFAFA"/>
<g id="Union">
<path d="M531 154.299H430.542C424.191 154.3 419.042 159.448 419.042 165.799V327.799C419.042 334.276 416.037 340.045 411.353 343.799C416.037 347.554 419.042 353.322 419.042 359.799V521.799C419.042 528.15 424.191 533.299 430.542 533.299H531V542.299H430.542C419.221 542.299 410.042 533.121 410.042 521.799V359.799C410.042 353.448 404.893 348.299 398.542 348.299H293V339.299H398.542C404.893 339.299 410.042 334.151 410.042 327.799V165.799C410.042 154.478 419.221 145.3 430.542 145.299H531V154.299Z" fill="black"/>
<path d="M531 154.299H430.542C424.191 154.3 419.042 159.448 419.042 165.799V327.799C419.042 334.276 416.037 340.045 411.353 343.799C416.037 347.554 419.042 353.322 419.042 359.799V521.799C419.042 528.15 424.191 533.299 430.542 533.299H531V542.299H430.542C419.221 542.299 410.042 533.121 410.042 521.799V359.799C410.042 353.448 404.893 348.299 398.542 348.299H293V339.299H398.542C404.893 339.299 410.042 334.151 410.042 327.799V165.799C410.042 154.478 419.221 145.3 430.542 145.299H531V154.299Z" fill="#E5E5E5"/>
<path d="M531 154.299H430.542C424.191 154.3 419.042 159.448 419.042 165.799V327.799C419.042 334.276 416.037 340.045 411.353 343.799C416.037 347.554 419.042 353.322 419.042 359.799V521.799C419.042 528.15 424.191 533.299 430.542 533.299H531V542.299H430.542C419.221 542.299 410.042 533.121 410.042 521.799V359.799C410.042 353.448 404.893 348.299 398.542 348.299H293V339.299H398.542C404.893 339.299 410.042 334.151 410.042 327.799V165.799C410.042 154.478 419.221 145.3 430.542 145.299H531V154.299Z" fill="url(#paint0_linear_928_111777)"/>
<path d="M531 154.299H430.542C424.191 154.3 419.042 159.448 419.042 165.799V327.799C419.042 334.276 416.037 340.045 411.353 343.799C416.037 347.554 419.042 353.322 419.042 359.799V521.799C419.042 528.15 424.191 533.299 430.542 533.299H531V542.299H430.542C419.221 542.299 410.042 533.121 410.042 521.799V359.799C410.042 353.448 404.893 348.299 398.542 348.299H293V339.299H398.542C404.893 339.299 410.042 334.151 410.042 327.799V165.799C410.042 154.478 419.221 145.3 430.542 145.299H531V154.299Z" fill="url(#paint1_linear_928_111777)"/>
<path d="M531 154.299H430.542C424.191 154.3 419.042 159.448 419.042 165.799V327.799C419.042 334.276 416.037 340.045 411.353 343.799C416.037 347.554 419.042 353.322 419.042 359.799V521.799C419.042 528.15 424.191 533.299 430.542 533.299H531V542.299H430.542C419.221 542.299 410.042 533.121 410.042 521.799V359.799C410.042 353.448 404.893 348.299 398.542 348.299H293V339.299H398.542C404.893 339.299 410.042 334.151 410.042 327.799V165.799C410.042 154.478 419.221 145.3 430.542 145.299H531V154.299Z" fill="url(#paint2_linear_928_111777)"/>
<path d="M531 154.299H430.542C424.191 154.3 419.042 159.448 419.042 165.799V327.799C419.042 334.276 416.037 340.045 411.353 343.799C416.037 347.554 419.042 353.322 419.042 359.799V521.799C419.042 528.15 424.191 533.299 430.542 533.299H531V542.299H430.542C419.221 542.299 410.042 533.121 410.042 521.799V359.799C410.042 353.448 404.893 348.299 398.542 348.299H293V339.299H398.542C404.893 339.299 410.042 334.151 410.042 327.799V165.799C410.042 154.478 419.221 145.3 430.542 145.299H531V154.299Z" fill="white"/>
</g>
<g id="Union_2">
<path d="M528 151.299H430.542C422.534 151.3 416.042 157.791 416.042 165.799V327.799C416.042 334.938 411.767 341.077 405.639 343.799C411.767 346.522 416.042 352.661 416.042 359.799V521.799C416.042 529.807 422.534 536.299 430.542 536.299H528V539.299H430.542C420.877 539.299 413.042 531.464 413.042 521.799V359.799C413.042 351.791 406.55 345.299 398.542 345.299H296V342.299H398.542C406.55 342.299 413.042 335.807 413.042 327.799V165.799C413.042 156.134 420.877 148.3 430.542 148.299H528V151.299Z" fill="black"/>
<path d="M528 151.299H430.542C422.534 151.3 416.042 157.791 416.042 165.799V327.799C416.042 334.938 411.767 341.077 405.639 343.799C411.767 346.522 416.042 352.661 416.042 359.799V521.799C416.042 529.807 422.534 536.299 430.542 536.299H528V539.299H430.542C420.877 539.299 413.042 531.464 413.042 521.799V359.799C413.042 351.791 406.55 345.299 398.542 345.299H296V342.299H398.542C406.55 342.299 413.042 335.807 413.042 327.799V165.799C413.042 156.134 420.877 148.3 430.542 148.299H528V151.299Z" fill="#E5E5E5"/>
<path d="M528 151.299H430.542C422.534 151.3 416.042 157.791 416.042 165.799V327.799C416.042 334.938 411.767 341.077 405.639 343.799C411.767 346.522 416.042 352.661 416.042 359.799V521.799C416.042 529.807 422.534 536.299 430.542 536.299H528V539.299H430.542C420.877 539.299 413.042 531.464 413.042 521.799V359.799C413.042 351.791 406.55 345.299 398.542 345.299H296V342.299H398.542C406.55 342.299 413.042 335.807 413.042 327.799V165.799C413.042 156.134 420.877 148.3 430.542 148.299H528V151.299Z" fill="url(#paint3_linear_928_111777)"/>
<path d="M528 151.299H430.542C422.534 151.3 416.042 157.791 416.042 165.799V327.799C416.042 334.938 411.767 341.077 405.639 343.799C411.767 346.522 416.042 352.661 416.042 359.799V521.799C416.042 529.807 422.534 536.299 430.542 536.299H528V539.299H430.542C420.877 539.299 413.042 531.464 413.042 521.799V359.799C413.042 351.791 406.55 345.299 398.542 345.299H296V342.299H398.542C406.55 342.299 413.042 335.807 413.042 327.799V165.799C413.042 156.134 420.877 148.3 430.542 148.299H528V151.299Z" fill="url(#paint4_linear_928_111777)"/>
<path d="M528 151.299H430.542C422.534 151.3 416.042 157.791 416.042 165.799V327.799C416.042 334.938 411.767 341.077 405.639 343.799C411.767 346.522 416.042 352.661 416.042 359.799V521.799C416.042 529.807 422.534 536.299 430.542 536.299H528V539.299H430.542C420.877 539.299 413.042 531.464 413.042 521.799V359.799C413.042 351.791 406.55 345.299 398.542 345.299H296V342.299H398.542C406.55 342.299 413.042 335.807 413.042 327.799V165.799C413.042 156.134 420.877 148.3 430.542 148.299H528V151.299Z" fill="url(#paint5_linear_928_111777)"/>
<path d="M528 151.299H430.542C422.534 151.3 416.042 157.791 416.042 165.799V327.799C416.042 334.938 411.767 341.077 405.639 343.799C411.767 346.522 416.042 352.661 416.042 359.799V521.799C416.042 529.807 422.534 536.299 430.542 536.299H528V539.299H430.542C420.877 539.299 413.042 531.464 413.042 521.799V359.799C413.042 351.791 406.55 345.299 398.542 345.299H296V342.299H398.542C406.55 342.299 413.042 335.807 413.042 327.799V165.799C413.042 156.134 420.877 148.3 430.542 148.299H528V151.299Z" fill="url(#paint6_linear_928_111777)"/>
</g>
<g className="sync-connector-track" aria-hidden="true">
{/*
  The route, not the payload. This was an 11-unit grey stroke with a 9-unit white
  stroke laid over it — a drawn tube whose walls happened to be 1 unit wide, which
  is why it read as a rail rather than a line. One 2.5-unit stroke instead: still
  6x lighter than before, and 1.5x SolutionVisual's connector in proportional
  terms (0.309% of canvas width against 0.204%), which holds up better through
  Sync's two 90-degree bends than exact parity would.
*/}
<path d="M296 343.799H398.542C407.568 343.799 414.542 336.382 414.542 327.799V165.799C414.542 156.963 421.706 149.799 430.542 149.799H528" stroke="#DCDCDC" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
<path d="M296 343.799H398.542C407.568 343.799 414.542 351.216 414.542 359.799V521.799C414.542 530.635 421.706 537.799 430.542 537.799H528" stroke="#DCDCDC" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
</g>
<g className="sync-trail" aria-hidden="true">
<path ref={upperPathRef} className="sync-trail-path" d="M296 343.799H398.542C407.568 343.799 414.542 336.382 414.542 327.799V165.799C414.542 156.963 421.706 149.799 430.542 149.799H528"/>
<path ref={lowerPathRef} className="sync-trail-path" d="M296 343.799H398.542C407.568 343.799 414.542 351.216 414.542 359.799V521.799C414.542 530.635 421.706 537.799 430.542 537.799H528"/>
{trailProfile.map((particle, i) => (
<g key={"lower-" + i} ref={(el) => { if (el) lowerDotsRef.current[i] = el; }}>
{particle.halo > 0 && (
<rect className="sync-trail-halo" x={-particle.haloSize / 2} y={-particle.haloSize / 2} width={particle.haloSize} height={particle.haloSize} rx={particle.haloSize * 0.3} opacity={particle.halo} />
)}
<rect x={-particle.size / 2} y={-particle.size / 2} width={particle.size} height={particle.size} rx={particle.size * 0.3} />
</g>
))}
{trailProfile.map((particle, i) => (
<g key={"upper-" + i} ref={(el) => { if (el) upperDotsRef.current[i] = el; }}>
{particle.halo > 0 && (
<rect className="sync-trail-halo" x={-particle.haloSize / 2} y={-particle.haloSize / 2} width={particle.haloSize} height={particle.haloSize} rx={particle.haloSize * 0.3} opacity={particle.halo} />
)}
<rect x={-particle.size / 2} y={-particle.size / 2} width={particle.size} height={particle.size} rx={particle.size * 0.3} />
</g>
))}
</g><g id="Frame 2147260377">
<g id="Frame" clipPath="url(#clip1_928_111777)">
<path id="Vector" d="M88.5915 546.133C88.6955 546.672 88.75 547.229 88.75 547.799C88.75 552.632 84.8325 556.549 80 556.549C75.1675 556.549 71.25 552.632 71.25 547.799C71.25 542.967 75.1675 539.049 80 539.049C80.9332 539.049 81.8323 539.195 82.6757 539.466" stroke="#0A0A0A" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_2" d="M76.6831 546.139L80.0164 550.723L88.3165 539.459" stroke="#0A0A0A" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="Synced everywhere &#194;&#183;" d="M106.48 555.139C105.547 555.139 104.7 554.993 103.94 554.699C103.193 554.393 102.567 553.939 102.06 553.339C101.567 552.739 101.2 552.006 100.96 551.139L102.68 550.579C102.867 551.259 103.133 551.826 103.48 552.279C103.827 552.733 104.26 553.079 104.78 553.319C105.3 553.546 105.9 553.659 106.58 553.659C107.247 553.659 107.807 553.559 108.26 553.359C108.727 553.146 109.073 552.839 109.3 552.439C109.527 552.039 109.64 551.566 109.64 551.019C109.64 550.313 109.447 549.773 109.06 549.399C108.687 549.013 108.14 548.719 107.42 548.519L105.18 547.899C104.073 547.606 103.233 547.166 102.66 546.579C102.087 545.979 101.8 545.213 101.8 544.279C101.8 543.479 101.993 542.793 102.38 542.219C102.78 541.633 103.333 541.179 104.04 540.859C104.76 540.526 105.607 540.359 106.58 540.359C107.393 540.359 108.127 540.473 108.78 540.699C109.433 540.926 109.987 541.266 110.44 541.719C110.907 542.173 111.253 542.726 111.48 543.379L109.84 543.999C109.547 543.253 109.127 542.706 108.58 542.359C108.033 541.999 107.347 541.819 106.52 541.819C105.613 541.819 104.913 542.019 104.42 542.419C103.927 542.819 103.68 543.373 103.68 544.079C103.68 544.693 103.867 545.173 104.24 545.519C104.613 545.853 105.18 546.133 105.94 546.359L108.24 547.019C109.28 547.326 110.087 547.799 110.66 548.439C111.247 549.079 111.54 549.906 111.54 550.919C111.54 551.759 111.333 552.499 110.92 553.139C110.52 553.766 109.94 554.259 109.18 554.619C108.433 554.966 107.533 555.139 106.48 555.139ZM115.918 558.799L117.558 554.539L117.918 553.759L121.058 544.279H122.858L117.658 558.799H115.918ZM116.958 554.799L113.078 544.279H114.858L118.138 553.799H118.678V554.799H116.958ZM131.798 554.799V548.119C131.798 547.226 131.578 546.573 131.138 546.159C130.698 545.733 130.125 545.519 129.418 545.519C128.578 545.519 127.905 545.793 127.398 546.339C126.892 546.873 126.638 547.593 126.638 548.499V554.799H124.938V544.279H126.498V546.119H126.558C126.838 545.466 127.258 544.959 127.818 544.599C128.378 544.226 129.058 544.039 129.858 544.039C130.605 544.039 131.245 544.186 131.778 544.479C132.325 544.759 132.745 545.186 133.038 545.759C133.345 546.333 133.498 547.053 133.498 547.919V554.799H131.798ZM140.859 555.039C139.953 555.039 139.133 554.826 138.399 554.399C137.666 553.959 137.079 553.333 136.639 552.519C136.213 551.693 135.999 550.699 135.999 549.539C135.999 548.366 136.213 547.373 136.639 546.559C137.066 545.733 137.639 545.106 138.359 544.679C139.093 544.253 139.913 544.039 140.819 544.039C141.846 544.039 142.706 544.259 143.399 544.699C144.106 545.126 144.639 545.806 144.999 546.739L143.499 547.339C143.233 546.699 142.873 546.233 142.419 545.939C141.979 545.646 141.433 545.499 140.779 545.499C140.273 545.499 139.786 545.639 139.319 545.919C138.853 546.186 138.473 546.619 138.179 547.219C137.886 547.806 137.739 548.579 137.739 549.539C137.739 550.486 137.886 551.259 138.179 551.859C138.473 552.459 138.853 552.899 139.319 553.179C139.799 553.459 140.299 553.599 140.819 553.599C141.486 553.599 142.039 553.446 142.479 553.139C142.919 552.833 143.273 552.359 143.539 551.719L145.019 552.299C144.673 553.219 144.153 553.906 143.459 554.359C142.766 554.813 141.899 555.039 140.859 555.039ZM151.545 555.039C150.519 555.039 149.632 554.813 148.885 554.359C148.139 553.893 147.565 553.239 147.165 552.399C146.779 551.559 146.585 550.593 146.585 549.499C146.585 548.406 146.792 547.453 147.205 546.639C147.632 545.826 148.212 545.193 148.945 544.739C149.692 544.273 150.532 544.039 151.465 544.039C152.399 544.039 153.212 544.239 153.905 544.639C154.612 545.026 155.152 545.586 155.525 546.319C155.912 547.039 156.105 547.899 156.105 548.899C156.105 549.086 156.105 549.273 156.105 549.459C156.105 549.646 156.092 549.793 156.065 549.899H147.585V548.619H155.025L154.425 548.919C154.439 548.159 154.325 547.519 154.085 546.999C153.845 546.479 153.499 546.086 153.045 545.819C152.592 545.553 152.059 545.419 151.445 545.419C150.845 545.419 150.312 545.553 149.845 545.819C149.379 546.086 149.005 546.499 148.725 547.059C148.459 547.619 148.325 548.353 148.325 549.259V549.559C148.325 550.839 148.599 551.833 149.145 552.539C149.705 553.246 150.539 553.599 151.645 553.599C152.299 553.599 152.859 553.466 153.325 553.199C153.792 552.933 154.179 552.519 154.485 551.959L155.845 552.639C155.605 553.159 155.285 553.599 154.885 553.959C154.485 554.319 154.005 554.593 153.445 554.779C152.885 554.953 152.252 555.039 151.545 555.039ZM162.649 555.039C161.743 555.039 160.943 554.819 160.249 554.379C159.569 553.926 159.036 553.286 158.649 552.459C158.263 551.633 158.069 550.659 158.069 549.539C158.069 548.406 158.263 547.433 158.649 546.619C159.036 545.793 159.569 545.159 160.249 544.719C160.943 544.266 161.736 544.039 162.629 544.039C163.149 544.039 163.629 544.139 164.069 544.339C164.523 544.539 164.916 544.813 165.249 545.159C165.596 545.493 165.856 545.873 166.029 546.299H166.109V540.219H167.809V554.799H166.209V552.819H166.149C165.976 553.246 165.709 553.633 165.349 553.979C165.003 554.313 164.596 554.573 164.129 554.759C163.663 554.946 163.169 555.039 162.649 555.039ZM162.989 553.599C163.643 553.599 164.209 553.439 164.689 553.119C165.169 552.786 165.543 552.319 165.809 551.719C166.076 551.106 166.209 550.379 166.209 549.539C166.209 548.713 166.069 547.999 165.789 547.399C165.509 546.799 165.129 546.333 164.649 545.999C164.169 545.666 163.616 545.499 162.989 545.499C162.349 545.499 161.789 545.659 161.309 545.979C160.843 546.299 160.476 546.759 160.209 547.359C159.956 547.959 159.829 548.686 159.829 549.539C159.829 550.379 159.956 551.106 160.209 551.719C160.476 552.319 160.843 552.786 161.309 553.119C161.789 553.439 162.349 553.599 162.989 553.599ZM180.862 555.039C179.835 555.039 178.949 554.813 178.202 554.359C177.455 553.893 176.882 553.239 176.482 552.399C176.095 551.559 175.902 550.593 175.902 549.499C175.902 548.406 176.109 547.453 176.522 546.639C176.949 545.826 177.529 545.193 178.262 544.739C179.009 544.273 179.849 544.039 180.782 544.039C181.715 544.039 182.529 544.239 183.222 544.639C183.929 545.026 184.469 545.586 184.842 546.319C185.229 547.039 185.422 547.899 185.422 548.899C185.422 549.086 185.422 549.273 185.422 549.459C185.422 549.646 185.409 549.793 185.382 549.899H176.902V548.619H184.342L183.742 548.919C183.755 548.159 183.642 547.519 183.402 546.999C183.162 546.479 182.815 546.086 182.362 545.819C181.909 545.553 181.375 545.419 180.762 545.419C180.162 545.419 179.629 545.553 179.162 545.819C178.695 546.086 178.322 546.499 178.042 547.059C177.775 547.619 177.642 548.353 177.642 549.259V549.559C177.642 550.839 177.915 551.833 178.462 552.539C179.022 553.246 179.855 553.599 180.962 553.599C181.615 553.599 182.175 553.466 182.642 553.199C183.109 552.933 183.495 552.519 183.802 551.959L185.162 552.639C184.922 553.159 184.602 553.599 184.202 553.959C183.802 554.319 183.322 554.593 182.762 554.779C182.202 554.953 181.569 555.039 180.862 555.039ZM190.467 554.799L186.847 544.279H188.687L191.667 553.719H191.747L194.707 544.279H196.547L192.927 554.799H190.467ZM202.795 555.039C201.769 555.039 200.882 554.813 200.135 554.359C199.389 553.893 198.815 553.239 198.415 552.399C198.029 551.559 197.835 550.593 197.835 549.499C197.835 548.406 198.042 547.453 198.455 546.639C198.882 545.826 199.462 545.193 200.195 544.739C200.942 544.273 201.782 544.039 202.715 544.039C203.649 544.039 204.462 544.239 205.155 544.639C205.862 545.026 206.402 545.586 206.775 546.319C207.162 547.039 207.355 547.899 207.355 548.899C207.355 549.086 207.355 549.273 207.355 549.459C207.355 549.646 207.342 549.793 207.315 549.899H198.835V548.619H206.275L205.675 548.919C205.689 548.159 205.575 547.519 205.335 546.999C205.095 546.479 204.749 546.086 204.295 545.819C203.842 545.553 203.309 545.419 202.695 545.419C202.095 545.419 201.562 545.553 201.095 545.819C200.629 546.086 200.255 546.499 199.975 547.059C199.709 547.619 199.575 548.353 199.575 549.259V549.559C199.575 550.839 199.849 551.833 200.395 552.539C200.955 553.246 201.789 553.599 202.895 553.599C203.549 553.599 204.109 553.466 204.575 553.199C205.042 552.933 205.429 552.519 205.735 551.959L207.095 552.639C206.855 553.159 206.535 553.599 206.135 553.959C205.735 554.319 205.255 554.593 204.695 554.779C204.135 554.953 203.502 555.039 202.795 555.039ZM209.899 554.799V544.279H211.459V546.199H211.519C211.706 545.546 212.046 545.026 212.539 544.639C213.033 544.239 213.599 544.039 214.239 544.039C214.373 544.039 214.499 544.053 214.619 544.079C214.753 544.093 214.859 544.113 214.939 544.139V545.699C214.846 545.673 214.739 545.653 214.619 545.639C214.499 545.626 214.359 545.619 214.199 545.619C213.706 545.619 213.259 545.739 212.859 545.979C212.473 546.219 212.166 546.553 211.939 546.979C211.713 547.406 211.599 547.906 211.599 548.479V554.799H209.899ZM218.886 558.799L220.526 554.539L220.886 553.759L224.026 544.279H225.826L220.626 558.799H218.886ZM219.926 554.799L216.046 544.279H217.826L221.106 553.799H221.646V554.799H219.926ZM229.624 554.799L227.084 544.279H228.804L230.824 553.699H230.884L232.984 544.279H235.464L237.584 553.699H237.624L239.644 544.279H241.384L238.844 554.799H236.384L234.264 545.399H234.184L232.084 554.799H229.624ZM243.61 554.799V540.219H245.31V545.959H245.37C245.637 545.359 246.037 544.893 246.57 544.559C247.117 544.213 247.764 544.039 248.51 544.039C249.27 544.039 249.917 544.186 250.45 544.479C250.997 544.759 251.417 545.186 251.71 545.759C252.017 546.333 252.17 547.053 252.17 547.919V554.799H250.47V548.119C250.47 547.226 250.25 546.573 249.81 546.159C249.37 545.733 248.797 545.519 248.09 545.519C247.25 545.519 246.577 545.773 246.07 546.279C245.564 546.786 245.31 547.526 245.31 548.499V554.799H243.61ZM259.631 555.039C258.605 555.039 257.718 554.813 256.971 554.359C256.225 553.893 255.651 553.239 255.251 552.399C254.865 551.559 254.671 550.593 254.671 549.499C254.671 548.406 254.878 547.453 255.291 546.639C255.718 545.826 256.298 545.193 257.031 544.739C257.778 544.273 258.618 544.039 259.551 544.039C260.485 544.039 261.298 544.239 261.991 544.639C262.698 545.026 263.238 545.586 263.611 546.319C263.998 547.039 264.191 547.899 264.191 548.899C264.191 549.086 264.191 549.273 264.191 549.459C264.191 549.646 264.178 549.793 264.151 549.899H255.671V548.619H263.111L262.511 548.919C262.525 548.159 262.411 547.519 262.171 546.999C261.931 546.479 261.585 546.086 261.131 545.819C260.678 545.553 260.145 545.419 259.531 545.419C258.931 545.419 258.398 545.553 257.931 545.819C257.465 546.086 257.091 546.499 256.811 547.059C256.545 547.619 256.411 548.353 256.411 549.259V549.559C256.411 550.839 256.685 551.833 257.231 552.539C257.791 553.246 258.625 553.599 259.731 553.599C260.385 553.599 260.945 553.466 261.411 553.199C261.878 552.933 262.265 552.519 262.571 551.959L263.931 552.639C263.691 553.159 263.371 553.599 262.971 553.959C262.571 554.319 262.091 554.593 261.531 554.779C260.971 554.953 260.338 555.039 259.631 555.039ZM266.735 554.799V544.279H268.295V546.199H268.355C268.542 545.546 268.882 545.026 269.375 544.639C269.869 544.239 270.435 544.039 271.075 544.039C271.209 544.039 271.335 544.053 271.455 544.079C271.589 544.093 271.695 544.113 271.775 544.139V545.699C271.682 545.673 271.575 545.653 271.455 545.639C271.335 545.626 271.195 545.619 271.035 545.619C270.542 545.619 270.095 545.739 269.695 545.979C269.309 546.219 269.002 546.553 268.775 546.979C268.549 547.406 268.435 547.906 268.435 548.479V554.799H266.735ZM277.678 555.039C276.652 555.039 275.765 554.813 275.018 554.359C274.272 553.893 273.698 553.239 273.298 552.399C272.912 551.559 272.718 550.593 272.718 549.499C272.718 548.406 272.925 547.453 273.338 546.639C273.765 545.826 274.345 545.193 275.078 544.739C275.825 544.273 276.665 544.039 277.598 544.039C278.532 544.039 279.345 544.239 280.038 544.639C280.745 545.026 281.285 545.586 281.658 546.319C282.045 547.039 282.238 547.899 282.238 548.899C282.238 549.086 282.238 549.273 282.238 549.459C282.238 549.646 282.225 549.793 282.198 549.899H273.718V548.619H281.158L280.558 548.919C280.572 548.159 280.458 547.519 280.218 546.999C279.978 546.479 279.632 546.086 279.178 545.819C278.725 545.553 278.192 545.419 277.578 545.419C276.978 545.419 276.445 545.553 275.978 545.819C275.512 546.086 275.138 546.499 274.858 547.059C274.592 547.619 274.458 548.353 274.458 549.259V549.559C274.458 550.839 274.732 551.833 275.278 552.539C275.838 553.246 276.672 553.599 277.778 553.599C278.432 553.599 278.992 553.466 279.458 553.199C279.925 552.933 280.312 552.519 280.618 551.959L281.978 552.639C281.738 553.159 281.418 553.599 281.018 553.959C280.618 554.319 280.138 554.593 279.578 554.779C279.018 554.953 278.385 555.039 277.678 555.039ZM291.79 550.419C291.443 550.419 291.143 550.293 290.89 550.039C290.65 549.786 290.53 549.486 290.53 549.139C290.53 548.806 290.65 548.519 290.89 548.279C291.143 548.026 291.443 547.899 291.79 547.899C292.15 547.899 292.45 548.026 292.69 548.279C292.93 548.519 293.05 548.806 293.05 549.139C293.05 549.486 292.93 549.786 292.69 550.039C292.45 550.293 292.15 550.419 291.79 550.419Z" fill="#0A0A0A"/>
<text ref={counterRef} id="sync-counter" x="301.33" y="554.8" aria-hidden="true">1.8s</text>
</g>
<g id="Frame 2147260385">
<g filter="url(#filter0_ddddii_928_111777)">
<rect x="59" y="183.701" width="290" height="306.598" rx="9.95902" fill="white"/>
</g>
<g clipPath="url(#clip2_928_111777)">
<g id="Dialog" filter="url(#filter1_ddi_928_111777)">
<g clipPath="url(#clip3_928_111777)">
<rect x="66.4692" y="191.17" width="275.061" height="291.66" rx="3.31967" fill="#F5F5F5"/>
<g id="Header">
<g id="Heading 2">
<g id="Frame_2" clipPath="url(#clip4_928_111777)">
<path id="Vector_3" d="M100.799 221.5C100.799 223.954 98.8094 225.944 96.3549 225.944H90.2438C87.7892 225.944 85.7993 223.954 85.7993 221.5V217.611C85.7993 215.156 87.7892 213.166 90.2438 213.166H96.3549C98.8094 213.166 100.799 215.156 100.799 217.611V221.5Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_4" d="M100.799 218.166H101.633C101.939 218.166 102.188 218.415 102.188 218.722V220.388C102.188 220.695 101.939 220.944 101.633 220.944H100.799" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_5" d="M85.799 218.166H84.9657C84.6589 218.166 84.4102 218.415 84.4102 218.722V220.388C84.4102 220.695 84.6589 220.944 84.9657 220.944H85.799" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_6" d="M94.1324 224.555H92.4657C92.1589 224.555 91.9102 224.804 91.9102 225.11V225.944H94.6879V225.11C94.6879 224.804 94.4392 224.555 94.1324 224.555Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_7" d="M93.2993 213.166V210.666" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_8" d="M90.2439 221.778C91.0109 221.778 91.6328 221.156 91.6328 220.389C91.6328 219.622 91.0109 219 90.2439 219C89.4768 219 88.855 219.622 88.855 220.389C88.855 221.156 89.4768 221.778 90.2439 221.778Z" fill="#8F8F8F"/>
<path id="Vector_9" d="M96.3547 221.778C97.1218 221.778 97.7436 221.156 97.7436 220.389C97.7436 219.622 97.1218 219 96.3547 219C95.5876 219 94.9658 219.622 94.9658 220.389C94.9658 221.156 95.5876 221.778 96.3547 221.778Z" fill="#8F8F8F"/>
</g>
<path id="Beam workspace" d="M114.998 226V211.9H120.138C121.472 211.9 122.505 212.206 123.238 212.82C123.972 213.433 124.338 214.286 124.338 215.38C124.338 215.9 124.232 216.373 124.018 216.8C123.805 217.213 123.498 217.56 123.098 217.84C122.698 218.106 122.218 218.286 121.658 218.38V218.44C122.325 218.506 122.918 218.686 123.438 218.98C123.972 219.273 124.385 219.68 124.678 220.2C124.985 220.706 125.138 221.32 125.138 222.04C125.138 223.266 124.698 224.233 123.818 224.94C122.952 225.646 121.745 226 120.198 226H114.998ZM116.778 225.4L115.978 224.6H120.098C121.178 224.6 121.978 224.38 122.498 223.94C123.032 223.5 123.298 222.833 123.298 221.94C123.298 221.06 123.025 220.393 122.478 219.94C121.945 219.473 121.132 219.24 120.038 219.24H116.438V217.88H119.758C120.638 217.88 121.325 217.68 121.818 217.28C122.312 216.88 122.558 216.306 122.558 215.56C122.558 214.84 122.332 214.286 121.878 213.9C121.438 213.5 120.818 213.3 120.018 213.3H115.978L116.778 212.5V225.4ZM132.266 226.24C131.239 226.24 130.352 226.013 129.606 225.56C128.859 225.093 128.286 224.44 127.886 223.6C127.499 222.76 127.306 221.793 127.306 220.7C127.306 219.606 127.512 218.653 127.926 217.84C128.352 217.026 128.932 216.393 129.666 215.94C130.412 215.473 131.252 215.24 132.186 215.24C133.119 215.24 133.932 215.44 134.626 215.84C135.332 216.226 135.872 216.786 136.246 217.52C136.632 218.24 136.826 219.1 136.826 220.1C136.826 220.286 136.826 220.473 136.826 220.66C136.826 220.846 136.812 220.993 136.786 221.1H128.306V219.82H135.746L135.146 220.12C135.159 219.36 135.046 218.72 134.806 218.2C134.566 217.68 134.219 217.286 133.766 217.02C133.312 216.753 132.779 216.62 132.166 216.62C131.566 216.62 131.032 216.753 130.566 217.02C130.099 217.286 129.726 217.7 129.446 218.26C129.179 218.82 129.046 219.553 129.046 220.46V220.76C129.046 222.04 129.319 223.033 129.866 223.74C130.426 224.446 131.259 224.8 132.366 224.8C133.019 224.8 133.579 224.666 134.046 224.4C134.512 224.133 134.899 223.72 135.206 223.16L136.566 223.84C136.326 224.36 136.006 224.8 135.606 225.16C135.206 225.52 134.726 225.793 134.166 225.98C133.606 226.153 132.972 226.24 132.266 226.24ZM142.33 226.24C141.29 226.24 140.45 225.966 139.81 225.42C139.17 224.873 138.85 224.146 138.85 223.24C138.85 222.373 139.156 221.66 139.77 221.1C140.396 220.54 141.276 220.18 142.41 220.02L146.41 219.42V220.68L142.93 221.18C142.143 221.3 141.556 221.526 141.17 221.86C140.783 222.193 140.59 222.633 140.59 223.18C140.59 223.713 140.77 224.133 141.13 224.44C141.503 224.733 142.016 224.88 142.67 224.88C143.243 224.88 143.743 224.753 144.17 224.5C144.596 224.233 144.923 223.866 145.15 223.4C145.39 222.92 145.51 222.36 145.51 221.72V218.9C145.51 218.22 145.316 217.68 144.93 217.28C144.556 216.866 143.99 216.66 143.23 216.66C142.563 216.66 142.023 216.806 141.61 217.1C141.196 217.393 140.91 217.846 140.75 218.46L139.15 218.02C139.376 217.166 139.856 216.493 140.59 216C141.323 215.493 142.216 215.24 143.27 215.24C144.59 215.24 145.576 215.566 146.23 216.22C146.883 216.873 147.21 217.78 147.21 218.94V223.86L147.99 226H146.19L145.61 224.38H145.53C145.223 224.94 144.79 225.393 144.23 225.74C143.683 226.073 143.05 226.24 142.33 226.24ZM150.424 226V215.48H151.984V217.18H152.064C152.331 216.553 152.724 216.073 153.244 215.74C153.764 215.406 154.371 215.24 155.064 215.24C155.798 215.24 156.418 215.413 156.924 215.76C157.444 216.093 157.831 216.573 158.084 217.2H158.144C158.424 216.573 158.831 216.093 159.364 215.76C159.911 215.413 160.544 215.24 161.264 215.24C161.918 215.24 162.491 215.38 162.984 215.66C163.478 215.926 163.871 216.333 164.164 216.88C164.458 217.426 164.604 218.113 164.604 218.94V226H162.904V219.16C162.904 218.373 162.711 217.773 162.324 217.36C161.938 216.933 161.398 216.72 160.704 216.72C159.958 216.72 159.378 216.966 158.964 217.46C158.564 217.94 158.364 218.62 158.364 219.5V226H156.664V219.16C156.664 218.386 156.471 217.786 156.084 217.36C155.711 216.933 155.184 216.72 154.504 216.72C153.771 216.72 153.191 216.986 152.764 217.52C152.338 218.04 152.124 218.746 152.124 219.64V226H150.424ZM174.759 226L172.219 215.48H173.939L175.959 224.9H176.019L178.119 215.48H180.599L182.719 224.9H182.759L184.779 215.48H186.519L183.979 226H181.519L179.399 216.6H179.319L177.219 226H174.759ZM193.165 226.24C192.218 226.24 191.365 226.02 190.605 225.58C189.845 225.126 189.245 224.493 188.805 223.68C188.378 222.853 188.165 221.88 188.165 220.76C188.165 219.626 188.385 218.653 188.825 217.84C189.265 217.013 189.865 216.373 190.625 215.92C191.385 215.466 192.232 215.24 193.165 215.24C194.125 215.24 194.985 215.466 195.745 215.92C196.505 216.36 197.098 216.993 197.525 217.82C197.965 218.633 198.185 219.613 198.185 220.76C198.185 221.88 197.965 222.853 197.525 223.68C197.098 224.493 196.505 225.126 195.745 225.58C194.985 226.02 194.125 226.24 193.165 226.24ZM193.185 224.8C193.772 224.8 194.312 224.653 194.805 224.36C195.298 224.066 195.692 223.626 195.985 223.04C196.278 222.44 196.425 221.68 196.425 220.76C196.425 219.826 196.278 219.06 195.985 218.46C195.692 217.86 195.298 217.42 194.805 217.14C194.312 216.846 193.772 216.7 193.185 216.7C192.585 216.7 192.038 216.846 191.545 217.14C191.052 217.42 190.658 217.86 190.365 218.46C190.072 219.06 189.925 219.826 189.925 220.76C189.925 221.68 190.072 222.44 190.365 223.04C190.658 223.626 191.052 224.066 191.545 224.36C192.038 224.653 192.585 224.8 193.185 224.8ZM200.776 226V215.48H202.336V217.4H202.396C202.582 216.746 202.922 216.226 203.416 215.84C203.909 215.44 204.476 215.24 205.116 215.24C205.249 215.24 205.376 215.253 205.496 215.28C205.629 215.293 205.736 215.313 205.816 215.34V216.9C205.722 216.873 205.616 216.853 205.496 216.84C205.376 216.826 205.236 216.82 205.076 216.82C204.582 216.82 204.136 216.94 203.736 217.18C203.349 217.42 203.042 217.753 202.816 218.18C202.589 218.606 202.476 219.106 202.476 219.68V226H200.776ZM208.669 223.14V220.5H209.489L214.289 215.48H216.329L211.869 220.1L211.469 220.34L208.669 223.14ZM207.729 226V211.42H209.429V226H207.729ZM214.589 226L210.809 220.32L211.829 218.98L216.529 226H214.589ZM222.012 226.24C220.892 226.24 219.958 226.006 219.212 225.54C218.478 225.06 217.972 224.36 217.692 223.44L219.232 222.94C219.458 223.633 219.805 224.133 220.272 224.44C220.752 224.733 221.345 224.88 222.052 224.88C222.758 224.88 223.298 224.74 223.672 224.46C224.058 224.166 224.252 223.74 224.252 223.18C224.252 222.726 224.118 222.38 223.852 222.14C223.598 221.886 223.192 221.686 222.632 221.54L220.812 221.04C219.958 220.826 219.318 220.486 218.892 220.02C218.465 219.54 218.252 218.946 218.252 218.24C218.252 217.64 218.412 217.113 218.732 216.66C219.065 216.206 219.518 215.86 220.092 215.62C220.665 215.366 221.332 215.24 222.092 215.24C222.745 215.24 223.332 215.333 223.852 215.52C224.372 215.706 224.812 215.973 225.172 216.32C225.532 216.666 225.792 217.093 225.952 217.6L224.452 218.12C224.238 217.6 223.932 217.22 223.532 216.98C223.132 216.74 222.638 216.62 222.052 216.62C221.372 216.62 220.852 216.753 220.492 217.02C220.132 217.286 219.952 217.666 219.952 218.16C219.952 218.52 220.065 218.826 220.292 219.08C220.532 219.32 220.938 219.52 221.512 219.68L223.412 220.18C223.945 220.313 224.398 220.506 224.772 220.76C225.145 221.013 225.432 221.333 225.632 221.72C225.832 222.093 225.932 222.56 225.932 223.12C225.932 223.76 225.765 224.313 225.432 224.78C225.112 225.246 224.658 225.606 224.072 225.86C223.498 226.113 222.812 226.24 222.012 226.24ZM228.354 230V215.48H229.934V217.48H230.014C230.174 217.04 230.427 216.653 230.774 216.32C231.134 215.986 231.547 215.726 232.014 215.54C232.481 215.34 232.981 215.24 233.514 215.24C234.421 215.24 235.214 215.466 235.894 215.92C236.587 216.36 237.121 216.993 237.494 217.82C237.881 218.646 238.074 219.626 238.074 220.76C238.074 221.88 237.881 222.853 237.494 223.68C237.121 224.506 236.594 225.14 235.914 225.58C235.234 226.02 234.434 226.24 233.514 226.24C233.007 226.24 232.527 226.146 232.074 225.96C231.621 225.76 231.221 225.493 230.874 225.16C230.541 224.813 230.287 224.42 230.114 223.98H230.054V230H228.354ZM233.174 224.8C233.814 224.8 234.367 224.64 234.834 224.32C235.301 224 235.661 223.54 235.914 222.94C236.181 222.326 236.314 221.6 236.314 220.76C236.314 219.906 236.181 219.18 235.914 218.58C235.661 217.98 235.301 217.52 234.834 217.2C234.367 216.866 233.814 216.7 233.174 216.7C232.521 216.7 231.947 216.866 231.454 217.2C230.974 217.52 230.601 217.98 230.334 218.58C230.067 219.18 229.934 219.906 229.934 220.76C229.934 221.56 230.074 222.266 230.354 222.88C230.634 223.493 231.014 223.966 231.494 224.3C231.987 224.633 232.547 224.8 233.174 224.8ZM243.619 226.24C242.579 226.24 241.739 225.966 241.099 225.42C240.459 224.873 240.139 224.146 240.139 223.24C240.139 222.373 240.445 221.66 241.059 221.1C241.685 220.54 242.565 220.18 243.699 220.02L247.699 219.42V220.68L244.219 221.18C243.432 221.3 242.845 221.526 242.459 221.86C242.072 222.193 241.879 222.633 241.879 223.18C241.879 223.713 242.059 224.133 242.419 224.44C242.792 224.733 243.305 224.88 243.959 224.88C244.532 224.88 245.032 224.753 245.459 224.5C245.885 224.233 246.212 223.866 246.439 223.4C246.679 222.92 246.799 222.36 246.799 221.72V218.9C246.799 218.22 246.605 217.68 246.219 217.28C245.845 216.866 245.279 216.66 244.519 216.66C243.852 216.66 243.312 216.806 242.899 217.1C242.485 217.393 242.199 217.846 242.039 218.46L240.439 218.02C240.665 217.166 241.145 216.493 241.879 216C242.612 215.493 243.505 215.24 244.559 215.24C245.879 215.24 246.865 215.566 247.519 216.22C248.172 216.873 248.499 217.78 248.499 218.94V223.86L249.279 226H247.479L246.899 224.38H246.819C246.512 224.94 246.079 225.393 245.519 225.74C244.972 226.073 244.339 226.24 243.619 226.24ZM256.013 226.24C255.107 226.24 254.287 226.026 253.553 225.6C252.82 225.16 252.233 224.533 251.793 223.72C251.367 222.893 251.153 221.9 251.153 220.74C251.153 219.566 251.367 218.573 251.793 217.76C252.22 216.933 252.793 216.306 253.513 215.88C254.247 215.453 255.067 215.24 255.973 215.24C257 215.24 257.86 215.46 258.553 215.9C259.26 216.326 259.793 217.006 260.153 217.94L258.653 218.54C258.387 217.9 258.027 217.433 257.573 217.14C257.133 216.846 256.587 216.7 255.933 216.7C255.427 216.7 254.94 216.84 254.473 217.12C254.007 217.386 253.627 217.82 253.333 218.42C253.04 219.006 252.893 219.78 252.893 220.74C252.893 221.686 253.04 222.46 253.333 223.06C253.627 223.66 254.007 224.1 254.473 224.38C254.953 224.66 255.453 224.8 255.973 224.8C256.64 224.8 257.193 224.646 257.633 224.34C258.073 224.033 258.427 223.56 258.693 222.92L260.173 223.5C259.827 224.42 259.307 225.106 258.613 225.56C257.92 226.013 257.053 226.24 256.013 226.24ZM266.699 226.24C265.673 226.24 264.786 226.013 264.039 225.56C263.293 225.093 262.719 224.44 262.319 223.6C261.933 222.76 261.739 221.793 261.739 220.7C261.739 219.606 261.946 218.653 262.359 217.84C262.786 217.026 263.366 216.393 264.099 215.94C264.846 215.473 265.686 215.24 266.619 215.24C267.553 215.24 268.366 215.44 269.059 215.84C269.766 216.226 270.306 216.786 270.679 217.52C271.066 218.24 271.259 219.1 271.259 220.1C271.259 220.286 271.259 220.473 271.259 220.66C271.259 220.846 271.246 220.993 271.219 221.1H262.739V219.82H270.179L269.579 220.12C269.593 219.36 269.479 218.72 269.239 218.2C268.999 217.68 268.653 217.286 268.199 217.02C267.746 216.753 267.213 216.62 266.599 216.62C265.999 216.62 265.466 216.753 264.999 217.02C264.533 217.286 264.159 217.7 263.879 218.26C263.613 218.82 263.479 219.553 263.479 220.46V220.76C263.479 222.04 263.753 223.033 264.299 223.74C264.859 224.446 265.693 224.8 266.799 224.8C267.453 224.8 268.013 224.666 268.479 224.4C268.946 224.133 269.333 223.72 269.639 223.16L270.999 223.84C270.759 224.36 270.439 224.8 270.039 225.16C269.639 225.52 269.159 225.793 268.599 225.98C268.039 226.153 267.406 226.24 266.699 226.24Z" fill="#0A0A0A"/>
</g>
</g>
<g id="Frame 2147260221" filter="url(#filter2_i_928_111777)">
<rect x="67.2993" y="246" width="273.4017" height="236" rx="3.31967" fill="white"/>
<rect x="66.8843" y="245.585" width="274.2317" height="236.83" rx="3.73463" fill="none" stroke="#C4C4C4" strokeWidth="0.829918"/>
<path id="~/project" d="M91.1193 276.28C90.6527 276.28 90.2726 276.193 89.9793 276.02C89.6993 275.833 89.3593 275.5 88.9593 275.02C88.6927 274.686 88.4793 274.446 88.3193 274.3C88.1726 274.14 88.0393 274.04 87.9193 274C87.8126 273.96 87.686 273.94 87.5393 273.94C87.1926 273.94 86.926 274.12 86.7393 274.48C86.5526 274.84 86.4593 275.373 86.4593 276.08H84.8793C84.8793 274.986 85.1193 274.1 85.5993 273.42C86.0793 272.74 86.706 272.4 87.4793 272.4C87.986 272.4 88.386 272.5 88.6793 272.7C88.986 272.9 89.3127 273.226 89.6593 273.68C90.006 274.133 90.266 274.426 90.4393 274.56C90.626 274.68 90.846 274.74 91.0993 274.74C91.446 274.74 91.706 274.56 91.8793 274.2C92.066 273.826 92.1593 273.293 92.1593 272.6H93.7393C93.7393 273.693 93.4993 274.58 93.0193 275.26C92.5393 275.94 91.906 276.28 91.1193 276.28ZM97.4515 283.2L103.532 266H105.132L99.0515 283.2H97.4515ZM108.884 284V270.4H110.444L110.484 272.8L110.244 272.68C110.51 271.853 110.95 271.226 111.564 270.8C112.19 270.373 112.91 270.16 113.724 270.16C114.777 270.16 115.637 270.42 116.304 270.94C116.984 271.46 117.484 272.14 117.804 272.98C118.124 273.82 118.284 274.726 118.284 275.7C118.284 276.673 118.124 277.58 117.804 278.42C117.484 279.26 116.984 279.94 116.304 280.46C115.637 280.98 114.777 281.24 113.724 281.24C113.177 281.24 112.664 281.146 112.184 280.96C111.717 280.773 111.317 280.513 110.984 280.18C110.664 279.846 110.444 279.453 110.324 279L110.564 278.72V284H108.884ZM113.564 279.64C114.484 279.64 115.204 279.293 115.724 278.6C116.257 277.906 116.524 276.94 116.524 275.7C116.524 274.46 116.257 273.493 115.724 272.8C115.204 272.106 114.484 271.76 113.564 271.76C112.95 271.76 112.417 271.906 111.964 272.2C111.524 272.493 111.177 272.933 110.924 273.52C110.684 274.106 110.564 274.833 110.564 275.7C110.564 276.566 110.684 277.293 110.924 277.88C111.164 278.466 111.51 278.906 111.964 279.2C112.417 279.493 112.95 279.64 113.564 279.64ZM123.836 281V270.4H125.236L125.396 273.08L125.236 273.04C125.369 272.133 125.656 271.466 126.096 271.04C126.549 270.613 127.149 270.4 127.896 270.4H130.076V271.92H127.916C127.396 271.92 126.956 272.026 126.596 272.24C126.249 272.44 125.983 272.74 125.796 273.14C125.609 273.526 125.516 274.013 125.516 274.6V281H123.836ZM121.076 281V279.52H128.876V281H121.076ZM121.076 271.88V270.4H124.756V271.88H121.076ZM137.268 281.24C136.295 281.24 135.441 281.013 134.708 280.56C133.988 280.106 133.428 279.466 133.028 278.64C132.628 277.8 132.428 276.82 132.428 275.7C132.428 274.566 132.628 273.586 133.028 272.76C133.428 271.933 133.988 271.293 134.708 270.84C135.441 270.386 136.295 270.16 137.268 270.16C138.241 270.16 139.088 270.386 139.808 270.84C140.541 271.293 141.108 271.933 141.508 272.76C141.908 273.586 142.108 274.566 142.108 275.7C142.108 276.82 141.908 277.8 141.508 278.64C141.108 279.466 140.541 280.106 139.808 280.56C139.088 281.013 138.241 281.24 137.268 281.24ZM137.268 279.64C138.241 279.64 138.995 279.293 139.528 278.6C140.075 277.893 140.348 276.926 140.348 275.7C140.348 274.473 140.075 273.513 139.528 272.82C138.995 272.113 138.241 271.76 137.268 271.76C136.295 271.76 135.535 272.113 134.988 272.82C134.455 273.513 134.188 274.473 134.188 275.7C134.188 276.926 134.455 277.893 134.988 278.6C135.535 279.293 136.295 279.64 137.268 279.64ZM145.46 284V282.52H148.82C149.34 282.52 149.727 282.406 149.98 282.18C150.247 281.953 150.38 281.52 150.38 280.88V270.4H152.06V281C152.06 281.973 151.82 282.713 151.34 283.22C150.86 283.74 150.087 284 149.02 284H145.46ZM145.66 271.88V270.4H151.34V271.88H145.66ZM150.28 268.74V266.78H152.04V268.74H150.28ZM161.432 281.24C160.432 281.24 159.566 281.013 158.832 280.56C158.112 280.106 157.552 279.466 157.152 278.64C156.766 277.8 156.572 276.82 156.572 275.7C156.572 274.58 156.766 273.606 157.152 272.78C157.552 271.953 158.106 271.313 158.812 270.86C159.532 270.393 160.379 270.16 161.352 270.16C162.272 270.16 163.086 270.38 163.792 270.82C164.499 271.246 165.052 271.873 165.452 272.7C165.852 273.526 166.052 274.533 166.052 275.72V276.22H158.332C158.399 277.353 158.699 278.206 159.232 278.78C159.779 279.353 160.512 279.64 161.432 279.64C162.126 279.64 162.692 279.48 163.132 279.16C163.586 278.826 163.899 278.393 164.072 277.86L165.872 278C165.592 278.946 165.059 279.726 164.272 280.34C163.499 280.94 162.552 281.24 161.432 281.24ZM158.332 274.74H164.212C164.132 273.713 163.832 272.96 163.312 272.48C162.792 272 162.139 271.76 161.352 271.76C160.539 271.76 159.866 272.013 159.332 272.52C158.812 273.013 158.479 273.753 158.332 274.74ZM173.525 281.24C172.538 281.24 171.678 281.013 170.945 280.56C170.211 280.106 169.645 279.466 169.245 278.64C168.845 277.8 168.645 276.82 168.645 275.7C168.645 274.58 168.845 273.606 169.245 272.78C169.645 271.953 170.211 271.313 170.945 270.86C171.678 270.393 172.538 270.16 173.525 270.16C174.311 270.16 175.011 270.306 175.625 270.6C176.238 270.88 176.745 271.293 177.145 271.84C177.545 272.386 177.818 273.053 177.965 273.84L176.205 273.96C176.045 273.253 175.725 272.713 175.245 272.34C174.778 271.953 174.205 271.76 173.525 271.76C172.551 271.76 171.785 272.113 171.225 272.82C170.678 273.513 170.405 274.473 170.405 275.7C170.405 276.926 170.678 277.893 171.225 278.6C171.785 279.293 172.551 279.64 173.525 279.64C174.205 279.64 174.791 279.44 175.285 279.04C175.791 278.64 176.125 278.04 176.285 277.24L178.045 277.36C177.898 278.146 177.618 278.833 177.205 279.42C176.791 279.993 176.271 280.44 175.645 280.76C175.018 281.08 174.311 281.24 173.525 281.24ZM186.797 281C185.77 281 185.003 280.76 184.497 280.28C183.99 279.8 183.737 279.066 183.737 278.08V267.92H185.417V278.08C185.417 278.573 185.53 278.94 185.757 279.18C185.983 279.406 186.33 279.52 186.797 279.52H189.637V281H186.797ZM180.237 271.88V270.4H189.637V271.88H180.237Z" fill="black" fillOpacity="0.5"/>
<g id="Frame 2147260340">
<g id="Frame_3" clipPath="url(#clip5_928_111777)">
<path id="Vector_10" d="M94.5493 315.083H100.383C100.383 314.548 100.171 314.038 99.7943 313.661L95.9693 309.836C95.5927 309.46 95.0826 309.248 94.551 309.248V315.081L94.5493 315.083Z" fill="#8F8F8F"/>
<path id="Vector_11" d="M94.5493 309.25V315.083H100.383" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_12" d="M95.9708 309.838L99.7942 313.661C100.171 314.038 100.382 314.548 100.382 315.081V323.416C100.382 325.258 98.8908 326.75 97.0492 326.75H89.5492C87.7075 326.75 86.2158 325.258 86.2158 323.416V312.583C86.2158 310.741 87.7075 309.25 89.5492 309.25H94.5508C95.0842 309.25 95.5942 309.461 95.9708 309.838Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="README.md" d="M114.658 325V310.8H118.978C120.472 310.8 121.652 311.18 122.518 311.94C123.385 312.686 123.818 313.72 123.818 315.04C123.818 315.706 123.665 316.3 123.358 316.82C123.052 317.326 122.658 317.726 122.178 318.02C121.698 318.313 121.205 318.48 120.698 318.52L120.618 318.28C121.565 318.333 122.272 318.56 122.738 318.96C123.218 319.36 123.498 320.013 123.578 320.92L123.938 325H122.218L121.878 321.14C121.838 320.7 121.732 320.346 121.558 320.08C121.398 319.8 121.138 319.6 120.778 319.48C120.432 319.346 119.952 319.28 119.338 319.28H116.378V325H114.658ZM116.378 317.6H118.978C119.965 317.6 120.718 317.38 121.238 316.94C121.758 316.486 122.018 315.853 122.018 315.04C122.018 314.213 121.758 313.58 121.238 313.14C120.718 312.7 119.965 312.48 118.978 312.48H116.378V317.6ZM127.05 325V310.8H135.69V312.48H128.77V317.06H135.45V318.7H128.77V323.32H135.85V325H127.05ZM137.763 325L142.083 310.8H144.403L148.723 325H146.883L143.243 312.36L139.603 325H137.763ZM139.943 320.96L140.543 319.28H145.943L146.543 320.96H139.943ZM151.035 325V310.8H154.395C155.622 310.8 156.688 311.08 157.595 311.64C158.515 312.186 159.222 312.993 159.715 314.06C160.222 315.113 160.475 316.4 160.475 317.92C160.475 319.44 160.222 320.726 159.715 321.78C159.222 322.833 158.515 323.633 157.595 324.18C156.688 324.726 155.622 325 154.395 325H151.035ZM152.755 323.32H154.295C155.682 323.32 156.755 322.873 157.515 321.98C158.288 321.073 158.675 319.72 158.675 317.92C158.675 316.12 158.288 314.766 157.515 313.86C156.755 312.94 155.682 312.48 154.295 312.48H152.755V323.32ZM166.467 323.4L163.787 312.4H163.947V325H162.227V310.8H164.827L167.627 322.48H166.827L169.627 310.8H172.227V325H170.507V312.4H170.667L167.987 323.4H166.467ZM175.019 325V310.8H183.659V312.48H176.739V317.06H183.419V318.7H176.739V323.32H183.819V325H175.019ZM189.971 325V322.56H192.451V325H189.971ZM198.004 325V314.4H199.544L199.604 316.76L199.404 316.72C199.524 315.933 199.777 315.313 200.164 314.86C200.564 314.393 201.07 314.16 201.684 314.16C202.31 314.16 202.79 314.386 203.124 314.84C203.47 315.293 203.684 315.96 203.764 316.84H203.564C203.684 316.013 203.95 315.36 204.364 314.88C204.79 314.4 205.324 314.16 205.964 314.16C206.817 314.16 207.437 314.453 207.824 315.04C208.21 315.626 208.404 316.6 208.404 317.96V325H206.724V318.2C206.724 317.253 206.624 316.593 206.424 316.22C206.224 315.833 205.91 315.64 205.484 315.64C205.204 315.64 204.957 315.733 204.744 315.92C204.53 316.093 204.357 316.373 204.224 316.76C204.104 317.146 204.044 317.64 204.044 318.24V325H202.364V318.2C202.364 317.293 202.264 316.64 202.064 316.24C201.877 315.84 201.564 315.64 201.124 315.64C200.844 315.64 200.597 315.733 200.384 315.92C200.17 316.093 199.997 316.373 199.864 316.76C199.744 317.146 199.684 317.64 199.684 318.24V325H198.004ZM214.536 325.24C213.602 325.24 212.796 325.013 212.116 324.56C211.436 324.106 210.909 323.466 210.536 322.64C210.176 321.813 209.996 320.833 209.996 319.7C209.996 318.566 210.176 317.586 210.536 316.76C210.909 315.933 211.436 315.293 212.116 314.84C212.796 314.386 213.602 314.16 214.536 314.16C215.282 314.16 215.936 314.34 216.496 314.7C217.056 315.046 217.462 315.44 217.716 315.88V310.8H219.396V325H217.876L217.816 323.4C217.522 323.973 217.089 324.426 216.516 324.76C215.942 325.08 215.282 325.24 214.536 325.24ZM214.636 323.64C215.276 323.64 215.822 323.48 216.276 323.16C216.742 322.84 217.096 322.386 217.336 321.8C217.589 321.2 217.716 320.5 217.716 319.7C217.716 318.873 217.589 318.166 217.336 317.58C217.096 316.993 216.742 316.546 216.276 316.24C215.809 315.92 215.249 315.76 214.596 315.76C213.729 315.76 213.036 316.113 212.516 316.82C212.009 317.513 211.756 318.473 211.756 319.7C211.756 320.913 212.009 321.873 212.516 322.58C213.036 323.286 213.742 323.64 214.636 323.64Z" fill="#0A0A0A"/>
</g>
<g id="Frame 2147260341">
<g id="Frame_4" clipPath="url(#clip6_928_111777)">
<path id="Vector_13" d="M94.5493 359.083H100.383C100.383 358.548 100.171 358.038 99.7943 357.661L95.9693 353.836C95.5927 353.46 95.0826 353.248 94.551 353.248V359.081L94.5493 359.083Z" fill="#0D76F2"/>
<path id="Vector_14" d="M94.5493 353.25V359.083H100.383" stroke="#0D76F2" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_15" d="M95.9708 353.838L99.7942 357.661C100.171 358.038 100.382 358.548 100.382 359.081V367.416C100.382 369.258 98.8908 370.75 97.0492 370.75H89.5492C87.7075 370.75 86.2158 369.258 86.2158 367.416V356.583C86.2158 354.741 87.7075 353.25 89.5492 353.25H94.5508C95.0842 353.25 95.5942 353.461 95.9708 353.838Z" stroke="#0D76F2" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="auth.ts" d="M117.858 369.24C117.192 369.24 116.592 369.12 116.058 368.88C115.525 368.64 115.105 368.306 114.798 367.88C114.492 367.44 114.338 366.933 114.338 366.36C114.338 365.453 114.605 364.753 115.138 364.26C115.685 363.753 116.538 363.386 117.698 363.16L121.258 362.44C121.258 361.533 121.052 360.86 120.638 360.42C120.238 359.98 119.658 359.76 118.898 359.76C118.165 359.76 117.592 359.926 117.178 360.26C116.765 360.58 116.478 361.046 116.318 361.66L114.538 361.52C114.738 360.52 115.212 359.713 115.958 359.1C116.718 358.473 117.698 358.16 118.898 358.16C120.178 358.16 121.172 358.546 121.878 359.32C122.585 360.08 122.938 361.133 122.938 362.48V366.88C122.938 367.12 122.992 367.286 123.098 367.38C123.205 367.473 123.365 367.52 123.578 367.52H124.258V369C124.178 369.013 124.052 369.02 123.878 369.02C123.705 369.033 123.538 369.04 123.378 369.04C122.925 369.04 122.538 368.966 122.218 368.82C121.912 368.673 121.678 368.44 121.518 368.12C121.358 367.786 121.272 367.36 121.258 366.84H121.578C121.485 367.293 121.258 367.706 120.898 368.08C120.552 368.44 120.112 368.726 119.578 368.94C119.045 369.14 118.472 369.24 117.858 369.24ZM118.018 367.76C118.738 367.76 119.338 367.64 119.818 367.4C120.298 367.146 120.658 366.8 120.898 366.36C121.138 365.906 121.258 365.386 121.258 364.8V363.88L118.018 364.52C117.298 364.653 116.798 364.86 116.518 365.14C116.238 365.406 116.098 365.76 116.098 366.2C116.098 366.693 116.265 367.08 116.598 367.36C116.945 367.626 117.418 367.76 118.018 367.76ZM130.51 369.24C129.457 369.24 128.617 368.886 127.99 368.18C127.364 367.46 127.05 366.473 127.05 365.22V358.4H128.73V364.76C128.73 365.786 128.91 366.546 129.27 367.04C129.644 367.52 130.21 367.76 130.97 367.76C131.797 367.76 132.45 367.493 132.93 366.96C133.41 366.413 133.65 365.666 133.65 364.72V358.4H135.33V369H133.73V366.38L133.99 366.52C133.777 367.386 133.37 368.06 132.77 368.54C132.17 369.006 131.417 369.24 130.51 369.24ZM144.803 369C143.776 369 143.009 368.76 142.503 368.28C141.996 367.8 141.743 367.066 141.743 366.08V355.92H143.423V366.08C143.423 366.573 143.536 366.94 143.763 367.18C143.989 367.406 144.336 367.52 144.803 367.52H147.643V369H144.803ZM138.243 359.88V358.4H147.643V359.88H138.243ZM151.235 369V354.8H152.915V360.74L152.715 360.7C152.848 360.113 153.075 359.633 153.395 359.26C153.715 358.886 154.108 358.613 154.575 358.44C155.042 358.253 155.548 358.16 156.095 358.16C156.855 358.16 157.495 358.333 158.015 358.68C158.548 359.013 158.948 359.486 159.215 360.1C159.495 360.7 159.635 361.393 159.635 362.18V369H157.955V362.66C157.955 361.633 157.768 360.873 157.395 360.38C157.035 359.886 156.482 359.64 155.735 359.64C154.882 359.64 154.195 359.9 153.675 360.42C153.168 360.94 152.915 361.693 152.915 362.68V369H151.235ZM165.987 369V366.56H168.467V369H165.987ZM180.779 369C179.753 369 178.986 368.76 178.479 368.28C177.973 367.8 177.719 367.066 177.719 366.08V355.92H179.399V366.08C179.399 366.573 179.513 366.94 179.739 367.18C179.966 367.406 180.313 367.52 180.779 367.52H183.619V369H180.779ZM174.219 359.88V358.4H183.619V359.88H174.219ZM191.411 369.24C190.491 369.24 189.698 369.08 189.031 368.76C188.365 368.44 187.838 368.013 187.451 367.48C187.078 366.933 186.865 366.326 186.811 365.66L188.571 365.54C188.678 366.193 188.965 366.706 189.431 367.08C189.911 367.453 190.571 367.64 191.411 367.64C192.198 367.64 192.805 367.526 193.231 367.3C193.671 367.073 193.891 366.72 193.891 366.24C193.891 365.933 193.818 365.68 193.671 365.48C193.525 365.28 193.251 365.113 192.851 364.98C192.451 364.833 191.865 364.693 191.091 364.56C190.065 364.373 189.258 364.146 188.671 363.88C188.098 363.6 187.691 363.253 187.451 362.84C187.211 362.426 187.091 361.933 187.091 361.36C187.091 360.746 187.245 360.2 187.551 359.72C187.858 359.24 188.311 358.86 188.911 358.58C189.511 358.3 190.245 358.16 191.111 358.16C191.991 358.16 192.725 358.32 193.311 358.64C193.911 358.946 194.385 359.36 194.731 359.88C195.078 360.386 195.305 360.946 195.411 361.56L193.651 361.68C193.571 361.306 193.418 360.98 193.191 360.7C192.978 360.406 192.691 360.18 192.331 360.02C191.985 359.846 191.571 359.76 191.091 359.76C190.318 359.76 189.745 359.913 189.371 360.22C188.998 360.526 188.811 360.906 188.811 361.36C188.811 361.72 188.898 362.006 189.071 362.22C189.245 362.433 189.525 362.606 189.911 362.74C190.298 362.86 190.811 362.973 191.451 363.08C192.545 363.253 193.391 363.48 193.991 363.76C194.591 364.026 195.011 364.36 195.251 364.76C195.491 365.16 195.611 365.653 195.611 366.24C195.611 366.866 195.425 367.406 195.051 367.86C194.691 368.3 194.191 368.64 193.551 368.88C192.925 369.12 192.211 369.24 191.411 369.24Z" fill="#0D76F2"/>
<path id="NEW" d="M290.101 369V354.8H292.541L297.581 367.04V354.8H299.301V369H296.861L291.821 356.76V369H290.101ZM302.493 369V354.8H311.133V356.48H304.213V361.06H310.893V362.7H304.213V367.32H311.293V369H302.493ZM314.846 369L313.286 354.8H315.086L316.406 368H316.206L317.766 356.4H319.606L321.166 368H320.966L322.286 354.8H324.086L322.526 369H319.926L318.446 357.8H318.926L317.446 369H314.846Z" fill="#0F63C7"/>
</g>
<g id="Frame 2147260342">
<g id="Frame_5" clipPath="url(#clip7_928_111777)">
<path id="Vector_16" d="M94.5493 403.083H100.383C100.383 402.548 100.171 402.038 99.7943 401.661L95.9693 397.836C95.5927 397.46 95.0826 397.248 94.551 397.248V403.081L94.5493 403.083Z" fill="#8F8F8F"/>
<path id="Vector_17" d="M94.5493 397.25V403.083H100.383" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_18" d="M95.9708 397.838L99.7942 401.661C100.171 402.038 100.382 402.548 100.382 403.081V411.416C100.382 413.258 98.8908 414.75 97.0492 414.75H89.5492C87.7075 414.75 86.2158 413.258 86.2158 411.416V400.583C86.2158 398.741 87.7075 397.25 89.5492 397.25H94.5508C95.0842 397.25 95.5942 397.461 95.9708 397.838Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="utils.ts" d="M118.518 413.24C117.465 413.24 116.625 412.886 115.998 412.18C115.372 411.46 115.058 410.473 115.058 409.22V402.4H116.738V408.76C116.738 409.786 116.918 410.546 117.278 411.04C117.652 411.52 118.218 411.76 118.978 411.76C119.805 411.76 120.458 411.493 120.938 410.96C121.418 410.413 121.658 409.666 121.658 408.72V402.4H123.338V413H121.738V410.38L121.998 410.52C121.785 411.386 121.378 412.06 120.778 412.54C120.178 413.006 119.425 413.24 118.518 413.24ZM132.81 413C131.784 413 131.017 412.76 130.51 412.28C130.004 411.8 129.75 411.066 129.75 410.08V399.92H131.43V410.08C131.43 410.573 131.544 410.94 131.77 411.18C131.997 411.406 132.344 411.52 132.81 411.52H135.65V413H132.81ZM126.25 403.88V402.4H135.65V403.88H126.25ZM143.103 413V402.4H144.783V413H143.103ZM138.843 413V411.52H148.443V413H138.843ZM139.043 403.88V402.4H144.783V403.88H139.043ZM142.943 400.74V398.78H144.703V400.74H142.943ZM154.695 413V401.64C154.695 401.213 154.575 400.88 154.335 400.64C154.095 400.4 153.762 400.28 153.335 400.28H150.835V398.8H153.415C154.388 398.8 155.122 399.053 155.615 399.56C156.122 400.053 156.375 400.786 156.375 401.76V413H154.695ZM150.435 413V411.52H160.035V413H150.435ZM167.427 413.24C166.507 413.24 165.714 413.08 165.047 412.76C164.38 412.44 163.854 412.013 163.467 411.48C163.094 410.933 162.88 410.326 162.827 409.66L164.587 409.54C164.694 410.193 164.98 410.706 165.447 411.08C165.927 411.453 166.587 411.64 167.427 411.64C168.214 411.64 168.82 411.526 169.247 411.3C169.687 411.073 169.907 410.72 169.907 410.24C169.907 409.933 169.834 409.68 169.687 409.48C169.54 409.28 169.267 409.113 168.867 408.98C168.467 408.833 167.88 408.693 167.107 408.56C166.08 408.373 165.274 408.146 164.687 407.88C164.114 407.6 163.707 407.253 163.467 406.84C163.227 406.426 163.107 405.933 163.107 405.36C163.107 404.746 163.26 404.2 163.567 403.72C163.874 403.24 164.327 402.86 164.927 402.58C165.527 402.3 166.26 402.16 167.127 402.16C168.007 402.16 168.74 402.32 169.327 402.64C169.927 402.946 170.4 403.36 170.747 403.88C171.094 404.386 171.32 404.946 171.427 405.56L169.667 405.68C169.587 405.306 169.434 404.98 169.207 404.7C168.994 404.406 168.707 404.18 168.347 404.02C168 403.846 167.587 403.76 167.107 403.76C166.334 403.76 165.76 403.913 165.387 404.22C165.014 404.526 164.827 404.906 164.827 405.36C164.827 405.72 164.914 406.006 165.087 406.22C165.26 406.433 165.54 406.606 165.927 406.74C166.314 406.86 166.827 406.973 167.467 407.08C168.56 407.253 169.407 407.48 170.007 407.76C170.607 408.026 171.027 408.36 171.267 408.76C171.507 409.16 171.627 409.653 171.627 410.24C171.627 410.866 171.44 411.406 171.067 411.86C170.707 412.3 170.207 412.64 169.567 412.88C168.94 413.12 168.227 413.24 167.427 413.24ZM177.979 413V410.56H180.459V413H177.979ZM192.771 413C191.745 413 190.978 412.76 190.471 412.28C189.965 411.8 189.711 411.066 189.711 410.08V399.92H191.391V410.08C191.391 410.573 191.505 410.94 191.731 411.18C191.958 411.406 192.305 411.52 192.771 411.52H195.611V413H192.771ZM186.211 403.88V402.4H195.611V403.88H186.211ZM203.404 413.24C202.484 413.24 201.69 413.08 201.024 412.76C200.357 412.44 199.83 412.013 199.444 411.48C199.07 410.933 198.857 410.326 198.804 409.66L200.564 409.54C200.67 410.193 200.957 410.706 201.424 411.08C201.904 411.453 202.564 411.64 203.404 411.64C204.19 411.64 204.797 411.526 205.224 411.3C205.664 411.073 205.884 410.72 205.884 410.24C205.884 409.933 205.81 409.68 205.664 409.48C205.517 409.28 205.244 409.113 204.844 408.98C204.444 408.833 203.857 408.693 203.084 408.56C202.057 408.373 201.25 408.146 200.664 407.88C200.09 407.6 199.684 407.253 199.444 406.84C199.204 406.426 199.084 405.933 199.084 405.36C199.084 404.746 199.237 404.2 199.544 403.72C199.85 403.24 200.304 402.86 200.904 402.58C201.504 402.3 202.237 402.16 203.104 402.16C203.984 402.16 204.717 402.32 205.304 402.64C205.904 402.946 206.377 403.36 206.724 403.88C207.07 404.386 207.297 404.946 207.404 405.56L205.644 405.68C205.564 405.306 205.41 404.98 205.184 404.7C204.97 404.406 204.684 404.18 204.324 404.02C203.977 403.846 203.564 403.76 203.084 403.76C202.31 403.76 201.737 403.913 201.364 404.22C200.99 404.526 200.804 404.906 200.804 405.36C200.804 405.72 200.89 406.006 201.064 406.22C201.237 406.433 201.517 406.606 201.904 406.74C202.29 406.86 202.804 406.973 203.444 407.08C204.537 407.253 205.384 407.48 205.984 407.76C206.584 408.026 207.004 408.36 207.244 408.76C207.484 409.16 207.604 409.653 207.604 410.24C207.604 410.866 207.417 411.406 207.044 411.86C206.684 412.3 206.184 412.64 205.544 412.88C204.917 413.12 204.204 413.24 203.404 413.24Z" fill="#0A0A0A"/>
</g>
<g id="Frame 2147260343">
<g id="Frame_6" clipPath="url(#clip8_928_111777)">
<path id="Vector_19" d="M94.5493 447.083H100.383C100.383 446.548 100.171 446.038 99.7943 445.661L95.9693 441.836C95.5927 441.46 95.0826 441.248 94.551 441.248V447.081L94.5493 447.083Z" fill="#8F8F8F"/>
<path id="Vector_20" d="M94.5493 441.25V447.083H100.383" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_21" d="M95.9708 441.838L99.7942 445.661C100.171 446.038 100.382 446.548 100.382 447.081V455.416C100.382 457.258 98.8908 458.75 97.0492 458.75H89.5492C87.7075 458.75 86.2158 457.258 86.2158 455.416V444.583C86.2158 442.741 87.7075 441.25 89.5492 441.25H94.5508C95.0842 441.25 95.5942 441.461 95.9708 441.838Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id=".env" d="M118.018 457V454.56H120.498V457H118.018ZM131.43 457.24C130.43 457.24 129.564 457.013 128.83 456.56C128.11 456.106 127.55 455.466 127.15 454.64C126.764 453.8 126.57 452.82 126.57 451.7C126.57 450.58 126.764 449.606 127.15 448.78C127.55 447.953 128.104 447.313 128.81 446.86C129.53 446.393 130.377 446.16 131.35 446.16C132.27 446.16 133.084 446.38 133.79 446.82C134.497 447.246 135.05 447.873 135.45 448.7C135.85 449.526 136.05 450.533 136.05 451.72V452.22H128.33C128.397 453.353 128.697 454.206 129.23 454.78C129.777 455.353 130.51 455.64 131.43 455.64C132.124 455.64 132.69 455.48 133.13 455.16C133.584 454.826 133.897 454.393 134.07 453.86L135.87 454C135.59 454.946 135.057 455.726 134.27 456.34C133.497 456.94 132.55 457.24 131.43 457.24ZM128.33 450.74H134.21C134.13 449.713 133.83 448.96 133.31 448.48C132.79 448 132.137 447.76 131.35 447.76C130.537 447.76 129.864 448.013 129.33 448.52C128.81 449.013 128.477 449.753 128.33 450.74ZM138.923 457V446.4H140.463L140.523 449.1L140.323 448.92C140.456 448.293 140.696 447.78 141.043 447.38C141.403 446.966 141.829 446.66 142.323 446.46C142.816 446.26 143.336 446.16 143.883 446.16C144.696 446.16 145.369 446.34 145.903 446.7C146.449 447.06 146.863 447.546 147.143 448.16C147.423 448.76 147.563 449.433 147.563 450.18V457H145.883V450.66C145.883 449.673 145.689 448.926 145.303 448.42C144.916 447.9 144.323 447.64 143.523 447.64C142.976 447.64 142.483 447.76 142.043 448C141.603 448.226 141.249 448.566 140.983 449.02C140.729 449.46 140.603 450.006 140.603 450.66V457H138.923ZM154.175 457L150.235 446.4H152.075L155.235 455.28L158.395 446.4H160.235L156.295 457H154.175Z" fill="#0A0A0A"/>
<g id="Frame 2147260345">
<g id="Frame_7" clipPath="url(#clip9_928_111777)">
<path id="Vector_22" d="M314.701 452.5V454.166" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_23" d="M310.951 447.916V445C310.951 442.928 312.63 441.25 314.701 441.25C316.773 441.25 318.451 442.928 318.451 445V447.916" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_24" d="M320.118 447.917H309.285C307.904 447.917 306.785 449.036 306.785 450.417V456.25C306.785 457.631 307.904 458.75 309.285 458.75H320.118C321.499 458.75 322.618 457.631 322.618 456.25V450.417C322.618 449.036 321.499 447.917 320.118 447.917Z" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
</g>
</g>
</g>
</g>
<rect x="66.8842" y="191.585" width="274.232" height="290.83" rx="2.90471" stroke="#C4C4C4" strokeWidth="0.829918"/>
</g>
</g>
<rect x="59.415" y="184.116" width="289.17" height="305.768" rx="9.54406" stroke="black" strokeOpacity="0.1" strokeWidth="0.829918"/>
</g>
<g id="Frame 2147260386">
<g filter="url(#filter3_ddddii_928_111777)">
<rect x="459" y="21" width="290" height="306.598" rx="9.959" fill="white"/>
</g>
<g clipPath="url(#clip10_928_111777)">
<g id="Dialog_2" filter="url(#filter4_ddi_928_111777)">
<g clipPath="url(#clip11_928_111777)">
<rect x="466.469" y="28.4692" width="275.061" height="291.66" rx="3.31967" fill="#F5F5F5"/>
<g id="Header_2">
<g id="Heading 2_2">
<g id="Frame_8" clipPath="url(#clip12_928_111777)">
<path id="Vector_25" d="M497.883 53.3825C497.478 53.3825 497.094 53.4592 496.724 53.5658C495.916 51.0492 493.584 49.2158 490.799 49.2158C487.348 49.2158 484.549 52.0142 484.549 55.4658C484.549 58.9175 487.348 61.7158 490.799 61.7158H497.883C500.184 61.7158 502.049 59.8508 502.049 57.5492C502.049 55.2475 500.184 53.3825 497.883 53.3825Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="Cloud VM" d="M520.858 63.6391C519.592 63.6391 518.478 63.3391 517.518 62.7391C516.558 62.1257 515.812 61.2657 515.278 60.1591C514.745 59.0524 514.478 57.7524 514.478 56.2591C514.478 55.1257 514.625 54.1124 514.918 53.2191C515.225 52.3124 515.658 51.5324 516.218 50.8791C516.778 50.2257 517.445 49.7324 518.218 49.3991C519.005 49.0524 519.878 48.8791 520.838 48.8791C521.825 48.8791 522.692 49.0257 523.438 49.3191C524.185 49.5991 524.818 50.0257 525.338 50.5991C525.858 51.1724 526.265 51.8857 526.558 52.7391L524.878 53.3391C524.558 52.3657 524.058 51.6391 523.378 51.1591C522.712 50.6791 521.858 50.4391 520.818 50.4391C519.898 50.4391 519.098 50.6724 518.418 51.1391C517.752 51.6057 517.238 52.2791 516.878 53.1591C516.518 54.0257 516.338 55.0591 516.338 56.2591C516.338 57.4457 516.518 58.4791 516.878 59.3591C517.252 60.2257 517.772 60.8991 518.438 61.3791C519.118 61.8457 519.918 62.0791 520.838 62.0791C521.865 62.0791 522.712 61.8391 523.378 61.3591C524.045 60.8657 524.538 60.1324 524.858 59.1591L526.578 59.7191C526.272 60.5857 525.852 61.3057 525.318 61.8791C524.798 62.4524 524.165 62.8924 523.418 63.1991C522.672 63.4924 521.818 63.6391 520.858 63.6391ZM529.194 63.2991V48.7191H530.894V63.2991H529.194ZM538.497 63.5391C537.55 63.5391 536.697 63.3191 535.937 62.8791C535.177 62.4257 534.577 61.7924 534.137 60.9791C533.71 60.1524 533.497 59.1791 533.497 58.0591C533.497 56.9257 533.717 55.9524 534.157 55.1391C534.597 54.3124 535.197 53.6724 535.957 53.2191C536.717 52.7657 537.564 52.5391 538.497 52.5391C539.457 52.5391 540.317 52.7657 541.077 53.2191C541.837 53.6591 542.43 54.2924 542.857 55.1191C543.297 55.9324 543.517 56.9124 543.517 58.0591C543.517 59.1791 543.297 60.1524 542.857 60.9791C542.43 61.7924 541.837 62.4257 541.077 62.8791C540.317 63.3191 539.457 63.5391 538.497 63.5391ZM538.517 62.0991C539.104 62.0991 539.644 61.9524 540.137 61.6591C540.63 61.3657 541.024 60.9257 541.317 60.3391C541.61 59.7391 541.757 58.9791 541.757 58.0591C541.757 57.1257 541.61 56.3591 541.317 55.7591C541.024 55.1591 540.63 54.7191 540.137 54.4391C539.644 54.1457 539.104 53.9991 538.517 53.9991C537.917 53.9991 537.37 54.1457 536.877 54.4391C536.384 54.7191 535.99 55.1591 535.697 55.7591C535.404 56.3591 535.257 57.1257 535.257 58.0591C535.257 58.9791 535.404 59.7391 535.697 60.3391C535.99 60.9257 536.384 61.3657 536.877 61.6591C537.37 61.9524 537.917 62.0991 538.517 62.0991ZM550.208 63.5391C549.328 63.5391 548.568 63.3857 547.928 63.0791C547.301 62.7591 546.821 62.2791 546.488 61.6391C546.168 60.9991 546.008 60.1924 546.008 59.2191V52.7791H547.708V59.1791C547.708 60.1924 547.934 60.9257 548.388 61.3791C548.854 61.8324 549.461 62.0591 550.208 62.0591C550.954 62.0591 551.561 61.8324 552.028 61.3791C552.494 60.9257 552.728 60.1924 552.728 59.1791V52.7791H554.428V59.2191C554.428 60.1924 554.261 60.9991 553.928 61.6391C553.594 62.2791 553.114 62.7591 552.488 63.0791C551.861 63.3857 551.101 63.5391 550.208 63.5391ZM561.475 63.5391C560.568 63.5391 559.768 63.3191 559.075 62.8791C558.395 62.4257 557.862 61.7857 557.475 60.9591C557.088 60.1324 556.895 59.1591 556.895 58.0391C556.895 56.9057 557.088 55.9324 557.475 55.1191C557.862 54.2924 558.395 53.6591 559.075 53.2191C559.768 52.7657 560.562 52.5391 561.455 52.5391C561.975 52.5391 562.455 52.6391 562.895 52.8391C563.348 53.0391 563.742 53.3124 564.075 53.6591C564.422 53.9924 564.682 54.3724 564.855 54.7991H564.935V48.7191H566.635V63.2991H565.035V61.3191H564.975C564.802 61.7457 564.535 62.1324 564.175 62.4791C563.828 62.8124 563.422 63.0724 562.955 63.2591C562.488 63.4457 561.995 63.5391 561.475 63.5391ZM561.815 62.0991C562.468 62.0991 563.035 61.9391 563.515 61.6191C563.995 61.2857 564.368 60.8191 564.635 60.2191C564.902 59.6057 565.035 58.8791 565.035 58.0391C565.035 57.2124 564.895 56.4991 564.615 55.8991C564.335 55.2991 563.955 54.8324 563.475 54.4991C562.995 54.1657 562.442 53.9991 561.815 53.9991C561.175 53.9991 560.615 54.1591 560.135 54.4791C559.668 54.7991 559.302 55.2591 559.035 55.8591C558.782 56.4591 558.655 57.1857 558.655 58.0391C558.655 58.8791 558.782 59.6057 559.035 60.2191C559.302 60.8191 559.668 61.2857 560.135 61.6191C560.615 61.9391 561.175 62.0991 561.815 62.0991ZM578.968 63.2991L574.328 49.1991H576.268L580.288 62.1991H580.368L584.388 49.1991H586.328L581.688 63.2991H578.968ZM588.71 63.2991V49.1991H591.87L595.59 61.9991H595.67L599.39 49.1991H602.55V63.2991H600.87V50.1991H600.81L596.85 63.2991H594.41L590.45 50.1991H590.39V63.2991H588.71Z" fill="#0A0A0A"/>
</g>
</g>
<g id="Frame 2147260221_2" filter="url(#filter5_i_928_111777)">
<rect x="467.299" y="83.2993" width="273.401" height="236" rx="3.31967" fill="white"/>
<rect x="466.884" y="82.8843" width="274.231" height="236.83" rx="3.73463" fill="none" stroke="#C4C4C4" strokeWidth="0.829918"/>
<path id="~/project_2" d="M491.119 113.579C490.652 113.579 490.272 113.493 489.979 113.319C489.699 113.133 489.359 112.799 488.959 112.319C488.692 111.986 488.479 111.746 488.319 111.599C488.172 111.439 488.039 111.339 487.919 111.299C487.812 111.259 487.685 111.239 487.539 111.239C487.192 111.239 486.925 111.419 486.739 111.779C486.552 112.139 486.459 112.673 486.459 113.379H484.879C484.879 112.286 485.119 111.399 485.599 110.719C486.079 110.039 486.705 109.699 487.479 109.699C487.985 109.699 488.385 109.799 488.679 109.999C488.985 110.199 489.312 110.526 489.659 110.979C490.005 111.433 490.265 111.726 490.439 111.859C490.625 111.979 490.845 112.039 491.099 112.039C491.445 112.039 491.705 111.859 491.879 111.499C492.065 111.126 492.159 110.593 492.159 109.899H493.739C493.739 110.993 493.499 111.879 493.019 112.559C492.539 113.239 491.905 113.579 491.119 113.579ZM497.451 120.499L503.531 103.299H505.131L499.051 120.499H497.451ZM508.883 121.299V107.699H510.443L510.483 110.099L510.243 109.979C510.51 109.153 510.95 108.526 511.563 108.099C512.19 107.673 512.91 107.459 513.723 107.459C514.777 107.459 515.637 107.719 516.303 108.239C516.983 108.759 517.483 109.439 517.803 110.279C518.123 111.119 518.283 112.026 518.283 112.999C518.283 113.973 518.123 114.879 517.803 115.719C517.483 116.559 516.983 117.239 516.303 117.759C515.637 118.279 514.777 118.539 513.723 118.539C513.177 118.539 512.663 118.446 512.183 118.259C511.717 118.073 511.317 117.813 510.983 117.479C510.663 117.146 510.443 116.753 510.323 116.299L510.563 116.019V121.299H508.883ZM513.563 116.939C514.483 116.939 515.203 116.593 515.723 115.899C516.257 115.206 516.523 114.239 516.523 112.999C516.523 111.759 516.257 110.793 515.723 110.099C515.203 109.406 514.483 109.059 513.563 109.059C512.95 109.059 512.417 109.206 511.963 109.499C511.523 109.793 511.177 110.233 510.923 110.819C510.683 111.406 510.563 112.133 510.563 112.999C510.563 113.866 510.683 114.593 510.923 115.179C511.163 115.766 511.51 116.206 511.963 116.499C512.417 116.793 512.95 116.939 513.563 116.939ZM523.835 118.299V107.699H525.235L525.395 110.379L525.235 110.339C525.369 109.433 525.655 108.766 526.095 108.339C526.549 107.913 527.149 107.699 527.895 107.699H530.075V109.219H527.915C527.395 109.219 526.955 109.326 526.595 109.539C526.249 109.739 525.982 110.039 525.795 110.439C525.609 110.826 525.515 111.313 525.515 111.899V118.299H523.835ZM521.075 118.299V116.819H528.875V118.299H521.075ZM521.075 109.179V107.699H524.755V109.179H521.075ZM537.268 118.539C536.294 118.539 535.441 118.313 534.708 117.859C533.988 117.406 533.428 116.766 533.028 115.939C532.628 115.099 532.428 114.119 532.428 112.999C532.428 111.866 532.628 110.886 533.028 110.059C533.428 109.233 533.988 108.593 534.708 108.139C535.441 107.686 536.294 107.459 537.268 107.459C538.241 107.459 539.088 107.686 539.808 108.139C540.541 108.593 541.108 109.233 541.508 110.059C541.908 110.886 542.108 111.866 542.108 112.999C542.108 114.119 541.908 115.099 541.508 115.939C541.108 116.766 540.541 117.406 539.808 117.859C539.088 118.313 538.241 118.539 537.268 118.539ZM537.268 116.939C538.241 116.939 538.994 116.593 539.528 115.899C540.074 115.193 540.348 114.226 540.348 112.999C540.348 111.773 540.074 110.813 539.528 110.119C538.994 109.413 538.241 109.059 537.268 109.059C536.294 109.059 535.534 109.413 534.988 110.119C534.454 110.813 534.188 111.773 534.188 112.999C534.188 114.226 534.454 115.193 534.988 115.899C535.534 116.593 536.294 116.939 537.268 116.939ZM545.46 121.299V119.819H548.82C549.34 119.819 549.726 119.706 549.98 119.479C550.246 119.253 550.38 118.819 550.38 118.179V107.699H552.06V118.299C552.06 119.273 551.82 120.013 551.34 120.519C550.86 121.039 550.086 121.299 549.02 121.299H545.46ZM545.66 109.179V107.699H551.34V109.179H545.66ZM550.28 106.039V104.079H552.04V106.039H550.28ZM561.432 118.539C560.432 118.539 559.565 118.313 558.832 117.859C558.112 117.406 557.552 116.766 557.152 115.939C556.765 115.099 556.572 114.119 556.572 112.999C556.572 111.879 556.765 110.906 557.152 110.079C557.552 109.253 558.105 108.613 558.812 108.159C559.532 107.693 560.379 107.459 561.352 107.459C562.272 107.459 563.085 107.679 563.792 108.119C564.499 108.546 565.052 109.173 565.452 109.999C565.852 110.826 566.052 111.833 566.052 113.019V113.519H558.332C558.399 114.653 558.699 115.506 559.232 116.079C559.779 116.653 560.512 116.939 561.432 116.939C562.125 116.939 562.692 116.779 563.132 116.459C563.585 116.126 563.899 115.693 564.072 115.159L565.872 115.299C565.592 116.246 565.059 117.026 564.272 117.639C563.499 118.239 562.552 118.539 561.432 118.539ZM558.332 112.039H564.212C564.132 111.013 563.832 110.259 563.312 109.779C562.792 109.299 562.139 109.059 561.352 109.059C560.539 109.059 559.865 109.313 559.332 109.819C558.812 110.313 558.479 111.053 558.332 112.039ZM573.524 118.539C572.537 118.539 571.677 118.313 570.944 117.859C570.211 117.406 569.644 116.766 569.244 115.939C568.844 115.099 568.644 114.119 568.644 112.999C568.644 111.879 568.844 110.906 569.244 110.079C569.644 109.253 570.211 108.613 570.944 108.159C571.677 107.693 572.537 107.459 573.524 107.459C574.311 107.459 575.011 107.606 575.624 107.899C576.237 108.179 576.744 108.593 577.144 109.139C577.544 109.686 577.817 110.353 577.964 111.139L576.204 111.259C576.044 110.553 575.724 110.013 575.244 109.639C574.777 109.253 574.204 109.059 573.524 109.059C572.551 109.059 571.784 109.413 571.224 110.119C570.677 110.813 570.404 111.773 570.404 112.999C570.404 114.226 570.677 115.193 571.224 115.899C571.784 116.593 572.551 116.939 573.524 116.939C574.204 116.939 574.791 116.739 575.284 116.339C575.791 115.939 576.124 115.339 576.284 114.539L578.044 114.659C577.897 115.446 577.617 116.133 577.204 116.719C576.791 117.293 576.271 117.739 575.644 118.059C575.017 118.379 574.311 118.539 573.524 118.539ZM586.796 118.299C585.77 118.299 585.003 118.059 584.496 117.579C583.99 117.099 583.736 116.366 583.736 115.379V105.219H585.416V115.379C585.416 115.873 585.53 116.239 585.756 116.479C585.983 116.706 586.33 116.819 586.796 116.819H589.636V118.299H586.796ZM580.236 109.179V107.699H589.636V109.179H580.236Z" fill="black" fillOpacity="0.5"/>
<g id="Frame 2147260340_2">
<g id="Frame_9" clipPath="url(#clip13_928_111777)">
<path id="Vector_26" d="M494.549 152.383H500.382C500.382 151.848 500.17 151.338 499.794 150.961L495.969 147.136C495.592 146.759 495.082 146.548 494.55 146.548V152.381L494.549 152.383Z" fill="#8F8F8F"/>
<path id="Vector_27" d="M494.549 146.549V152.383H500.382" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_28" d="M495.97 147.138L499.794 150.961C500.17 151.338 500.382 151.848 500.382 152.381V160.716C500.382 162.558 498.89 164.049 497.049 164.049H489.549C487.707 164.049 486.215 162.558 486.215 160.716V149.883C486.215 148.041 487.707 146.549 489.549 146.549H494.55C495.084 146.549 495.594 146.761 495.97 147.138Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="README.md_2" d="M514.658 162.299V148.099H518.978C520.471 148.099 521.651 148.479 522.518 149.239C523.384 149.986 523.818 151.019 523.818 152.339C523.818 153.006 523.664 153.599 523.358 154.119C523.051 154.626 522.658 155.026 522.178 155.319C521.698 155.613 521.204 155.779 520.698 155.819L520.618 155.579C521.564 155.633 522.271 155.859 522.738 156.259C523.218 156.659 523.498 157.313 523.578 158.219L523.938 162.299H522.218L521.878 158.439C521.838 157.999 521.731 157.646 521.558 157.379C521.398 157.099 521.138 156.899 520.778 156.779C520.431 156.646 519.951 156.579 519.338 156.579H516.378V162.299H514.658ZM516.378 154.899H518.978C519.964 154.899 520.718 154.679 521.238 154.239C521.758 153.786 522.018 153.153 522.018 152.339C522.018 151.513 521.758 150.879 521.238 150.439C520.718 149.999 519.964 149.779 518.978 149.779H516.378V154.899ZM527.05 162.299V148.099H535.69V149.779H528.77V154.359H535.45V155.999H528.77V160.619H535.85V162.299H527.05ZM537.762 162.299L542.082 148.099H544.402L548.722 162.299H546.882L543.242 149.659L539.602 162.299H537.762ZM539.942 158.259L540.542 156.579H545.942L546.542 158.259H539.942ZM551.034 162.299V148.099H554.394C555.621 148.099 556.688 148.379 557.594 148.939C558.514 149.486 559.221 150.293 559.714 151.359C560.221 152.413 560.474 153.699 560.474 155.219C560.474 156.739 560.221 158.026 559.714 159.079C559.221 160.133 558.514 160.933 557.594 161.479C556.688 162.026 555.621 162.299 554.394 162.299H551.034ZM552.754 160.619H554.294C555.681 160.619 556.754 160.173 557.514 159.279C558.288 158.373 558.674 157.019 558.674 155.219C558.674 153.419 558.288 152.066 557.514 151.159C556.754 150.239 555.681 149.779 554.294 149.779H552.754V160.619ZM566.467 160.699L563.787 149.699H563.947V162.299H562.227V148.099H564.827L567.627 159.779H566.827L569.627 148.099H572.227V162.299H570.507V149.699H570.667L567.987 160.699H566.467ZM575.019 162.299V148.099H583.659V149.779H576.739V154.359H583.419V155.999H576.739V160.619H583.819V162.299H575.019ZM589.971 162.299V159.859H592.451V162.299H589.971ZM598.003 162.299V151.699H599.543L599.603 154.059L599.403 154.019C599.523 153.233 599.776 152.613 600.163 152.159C600.563 151.693 601.07 151.459 601.683 151.459C602.31 151.459 602.79 151.686 603.123 152.139C603.47 152.593 603.683 153.259 603.763 154.139H603.563C603.683 153.313 603.95 152.659 604.363 152.179C604.79 151.699 605.323 151.459 605.963 151.459C606.816 151.459 607.436 151.753 607.823 152.339C608.21 152.926 608.403 153.899 608.403 155.259V162.299H606.723V155.499C606.723 154.553 606.623 153.893 606.423 153.519C606.223 153.133 605.91 152.939 605.483 152.939C605.203 152.939 604.956 153.033 604.743 153.219C604.53 153.393 604.356 153.673 604.223 154.059C604.103 154.446 604.043 154.939 604.043 155.539V162.299H602.363V155.499C602.363 154.593 602.263 153.939 602.063 153.539C601.876 153.139 601.563 152.939 601.123 152.939C600.843 152.939 600.596 153.033 600.383 153.219C600.17 153.393 599.996 153.673 599.863 154.059C599.743 154.446 599.683 154.939 599.683 155.539V162.299H598.003ZM614.535 162.539C613.602 162.539 612.795 162.313 612.115 161.859C611.435 161.406 610.909 160.766 610.535 159.939C610.175 159.113 609.995 158.133 609.995 156.999C609.995 155.866 610.175 154.886 610.535 154.059C610.909 153.233 611.435 152.593 612.115 152.139C612.795 151.686 613.602 151.459 614.535 151.459C615.282 151.459 615.935 151.639 616.495 151.999C617.055 152.346 617.462 152.739 617.715 153.179V148.099H619.395V162.299H617.875L617.815 160.699C617.522 161.273 617.089 161.726 616.515 162.059C615.942 162.379 615.282 162.539 614.535 162.539ZM614.635 160.939C615.275 160.939 615.822 160.779 616.275 160.459C616.742 160.139 617.095 159.686 617.335 159.099C617.589 158.499 617.715 157.799 617.715 156.999C617.715 156.173 617.589 155.466 617.335 154.879C617.095 154.293 616.742 153.846 616.275 153.539C615.809 153.219 615.249 153.059 614.595 153.059C613.729 153.059 613.035 153.413 612.515 154.119C612.009 154.813 611.755 155.773 611.755 156.999C611.755 158.213 612.009 159.173 612.515 159.879C613.035 160.586 613.742 160.939 614.635 160.939Z" fill="#0A0A0A"/>
</g>
<g id="Frame 2147260341_2">
<g id="Frame_10" clipPath="url(#clip14_928_111777)">
<path id="Vector_29" d="M494.549 196.383H500.382C500.382 195.848 500.17 195.338 499.794 194.961L495.969 191.136C495.592 190.759 495.082 190.548 494.55 190.548V196.381L494.549 196.383Z" fill="#0D76F2"/>
<path id="Vector_30" d="M494.549 190.549V196.383H500.382" stroke="#0D76F2" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_31" d="M495.97 191.138L499.794 194.961C500.17 195.338 500.382 195.848 500.382 196.381V204.716C500.382 206.558 498.89 208.049 497.049 208.049H489.549C487.707 208.049 486.215 206.558 486.215 204.716V193.883C486.215 192.041 487.707 190.549 489.549 190.549H494.55C495.084 190.549 495.594 190.761 495.97 191.138Z" stroke="#0D76F2" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="auth.ts_2" d="M517.858 206.539C517.191 206.539 516.591 206.419 516.058 206.179C515.524 205.939 515.104 205.606 514.798 205.179C514.491 204.739 514.338 204.233 514.338 203.659C514.338 202.753 514.604 202.053 515.138 201.559C515.684 201.053 516.538 200.686 517.698 200.459L521.258 199.739C521.258 198.833 521.051 198.159 520.638 197.719C520.238 197.279 519.658 197.059 518.898 197.059C518.164 197.059 517.591 197.226 517.178 197.559C516.764 197.879 516.478 198.346 516.318 198.959L514.538 198.819C514.738 197.819 515.211 197.013 515.958 196.399C516.718 195.773 517.698 195.459 518.898 195.459C520.178 195.459 521.171 195.846 521.878 196.619C522.584 197.379 522.938 198.433 522.938 199.779V204.179C522.938 204.419 522.991 204.586 523.098 204.679C523.204 204.773 523.364 204.819 523.578 204.819H524.258V206.299C524.178 206.313 524.051 206.319 523.878 206.319C523.704 206.333 523.538 206.339 523.378 206.339C522.924 206.339 522.538 206.266 522.218 206.119C521.911 205.973 521.678 205.739 521.518 205.419C521.358 205.086 521.271 204.659 521.258 204.139H521.578C521.484 204.593 521.258 205.006 520.898 205.379C520.551 205.739 520.111 206.026 519.578 206.239C519.044 206.439 518.471 206.539 517.858 206.539ZM518.018 205.059C518.738 205.059 519.338 204.939 519.818 204.699C520.298 204.446 520.658 204.099 520.898 203.659C521.138 203.206 521.258 202.686 521.258 202.099V201.179L518.018 201.819C517.298 201.953 516.798 202.159 516.518 202.439C516.238 202.706 516.098 203.059 516.098 203.499C516.098 203.993 516.264 204.379 516.598 204.659C516.944 204.926 517.418 205.059 518.018 205.059ZM530.51 206.539C529.457 206.539 528.617 206.186 527.99 205.479C527.363 204.759 527.05 203.773 527.05 202.519V195.699H528.73V202.059C528.73 203.086 528.91 203.846 529.27 204.339C529.643 204.819 530.21 205.059 530.97 205.059C531.797 205.059 532.45 204.793 532.93 204.259C533.41 203.713 533.65 202.966 533.65 202.019V195.699H535.33V206.299H533.73V203.679L533.99 203.819C533.777 204.686 533.37 205.359 532.77 205.839C532.17 206.306 531.417 206.539 530.51 206.539ZM544.802 206.299C543.776 206.299 543.009 206.059 542.502 205.579C541.996 205.099 541.742 204.366 541.742 203.379V193.219H543.422V203.379C543.422 203.873 543.536 204.239 543.762 204.479C543.989 204.706 544.336 204.819 544.802 204.819H547.642V206.299H544.802ZM538.242 197.179V195.699H547.642V197.179H538.242ZM551.234 206.299V192.099H552.914V198.039L552.714 197.999C552.848 197.413 553.074 196.933 553.394 196.559C553.714 196.186 554.108 195.913 554.574 195.739C555.041 195.553 555.548 195.459 556.094 195.459C556.854 195.459 557.494 195.633 558.014 195.979C558.548 196.313 558.948 196.786 559.214 197.399C559.494 197.999 559.634 198.693 559.634 199.479V206.299H557.954V199.959C557.954 198.933 557.768 198.173 557.394 197.679C557.034 197.186 556.481 196.939 555.734 196.939C554.881 196.939 554.194 197.199 553.674 197.719C553.168 198.239 552.914 198.993 552.914 199.979V206.299H551.234ZM565.987 206.299V203.859H568.467V206.299H565.987ZM580.779 206.299C579.752 206.299 578.985 206.059 578.479 205.579C577.972 205.099 577.719 204.366 577.719 203.379V193.219H579.399V203.379C579.399 203.873 579.512 204.239 579.739 204.479C579.965 204.706 580.312 204.819 580.779 204.819H583.619V206.299H580.779ZM574.219 197.179V195.699H583.619V197.179H574.219ZM591.411 206.539C590.491 206.539 589.698 206.379 589.031 206.059C588.364 205.739 587.838 205.313 587.451 204.779C587.078 204.233 586.864 203.626 586.811 202.959L588.571 202.839C588.678 203.493 588.964 204.006 589.431 204.379C589.911 204.753 590.571 204.939 591.411 204.939C592.198 204.939 592.804 204.826 593.231 204.599C593.671 204.373 593.891 204.019 593.891 203.539C593.891 203.233 593.818 202.979 593.671 202.779C593.524 202.579 593.251 202.413 592.851 202.279C592.451 202.133 591.864 201.993 591.091 201.859C590.064 201.673 589.258 201.446 588.671 201.179C588.098 200.899 587.691 200.553 587.451 200.139C587.211 199.726 587.091 199.233 587.091 198.659C587.091 198.046 587.244 197.499 587.551 197.019C587.858 196.539 588.311 196.159 588.911 195.879C589.511 195.599 590.244 195.459 591.111 195.459C591.991 195.459 592.724 195.619 593.311 195.939C593.911 196.246 594.384 196.659 594.731 197.179C595.078 197.686 595.304 198.246 595.411 198.859L593.651 198.979C593.571 198.606 593.418 198.279 593.191 197.999C592.978 197.706 592.691 197.479 592.331 197.319C591.984 197.146 591.571 197.059 591.091 197.059C590.318 197.059 589.744 197.213 589.371 197.519C588.998 197.826 588.811 198.206 588.811 198.659C588.811 199.019 588.898 199.306 589.071 199.519C589.244 199.733 589.524 199.906 589.911 200.039C590.298 200.159 590.811 200.273 591.451 200.379C592.544 200.553 593.391 200.779 593.991 201.059C594.591 201.326 595.011 201.659 595.251 202.059C595.491 202.459 595.611 202.953 595.611 203.539C595.611 204.166 595.424 204.706 595.051 205.159C594.691 205.599 594.191 205.939 593.551 206.179C592.924 206.419 592.211 206.539 591.411 206.539Z" fill="#0D76F2"/>
<path id="NEW_2" d="M690.1 206.299V192.099H692.54L697.58 204.339V192.099H699.3V206.299H696.86L691.82 194.059V206.299H690.1ZM702.492 206.299V192.099H711.132V193.779H704.212V198.359H710.892V199.999H704.212V204.619H711.292V206.299H702.492ZM714.845 206.299L713.285 192.099H715.085L716.405 205.299H716.205L717.765 193.699H719.605L721.165 205.299H720.965L722.285 192.099H724.085L722.525 206.299H719.925L718.445 195.099H718.925L717.445 206.299H714.845Z" fill="#0F63C7"/>
</g>
<g id="Frame 2147260342_2">
<g id="Frame_11" clipPath="url(#clip15_928_111777)">
<path id="Vector_32" d="M494.549 240.383H500.382C500.382 239.848 500.17 239.338 499.794 238.961L495.969 235.136C495.592 234.759 495.082 234.548 494.55 234.548V240.381L494.549 240.383Z" fill="#8F8F8F"/>
<path id="Vector_33" d="M494.549 234.549V240.383H500.382" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_34" d="M495.97 235.138L499.794 238.961C500.17 239.338 500.382 239.848 500.382 240.381V248.716C500.382 250.558 498.89 252.049 497.049 252.049H489.549C487.707 252.049 486.215 250.558 486.215 248.716V237.883C486.215 236.041 487.707 234.549 489.549 234.549H494.55C495.084 234.549 495.594 234.761 495.97 235.138Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="utils.ts_2" d="M518.518 250.539C517.464 250.539 516.624 250.186 515.998 249.479C515.371 248.759 515.058 247.773 515.058 246.519V239.699H516.738V246.059C516.738 247.086 516.918 247.846 517.278 248.339C517.651 248.819 518.218 249.059 518.978 249.059C519.804 249.059 520.458 248.793 520.938 248.259C521.418 247.713 521.658 246.966 521.658 246.019V239.699H523.338V250.299H521.738V247.679L521.998 247.819C521.784 248.686 521.378 249.359 520.778 249.839C520.178 250.306 519.424 250.539 518.518 250.539ZM532.81 250.299C531.783 250.299 531.017 250.059 530.51 249.579C530.003 249.099 529.75 248.366 529.75 247.379V237.219H531.43V247.379C531.43 247.873 531.543 248.239 531.77 248.479C531.997 248.706 532.343 248.819 532.81 248.819H535.65V250.299H532.81ZM526.25 241.179V239.699H535.65V241.179H526.25ZM543.102 250.299V239.699H544.782V250.299H543.102ZM538.842 250.299V248.819H548.442V250.299H538.842ZM539.042 241.179V239.699H544.782V241.179H539.042ZM542.942 238.039V236.079H544.702V238.039H542.942ZM554.694 250.299V238.939C554.694 238.513 554.574 238.179 554.334 237.939C554.094 237.699 553.761 237.579 553.334 237.579H550.834V236.099H553.414C554.388 236.099 555.121 236.353 555.614 236.859C556.121 237.353 556.374 238.086 556.374 239.059V250.299H554.694ZM550.434 250.299V248.819H560.034V250.299H550.434ZM567.427 250.539C566.507 250.539 565.713 250.379 565.047 250.059C564.38 249.739 563.853 249.313 563.467 248.779C563.093 248.233 562.88 247.626 562.827 246.959L564.587 246.839C564.693 247.493 564.98 248.006 565.447 248.379C565.927 248.753 566.587 248.939 567.427 248.939C568.213 248.939 568.82 248.826 569.247 248.599C569.687 248.373 569.907 248.019 569.907 247.539C569.907 247.233 569.833 246.979 569.687 246.779C569.54 246.579 569.267 246.413 568.867 246.279C568.467 246.133 567.88 245.993 567.107 245.859C566.08 245.673 565.273 245.446 564.687 245.179C564.113 244.899 563.707 244.553 563.467 244.139C563.227 243.726 563.107 243.233 563.107 242.659C563.107 242.046 563.26 241.499 563.567 241.019C563.873 240.539 564.327 240.159 564.927 239.879C565.527 239.599 566.26 239.459 567.127 239.459C568.007 239.459 568.74 239.619 569.327 239.939C569.927 240.246 570.4 240.659 570.747 241.179C571.093 241.686 571.32 242.246 571.427 242.859L569.667 242.979C569.587 242.606 569.433 242.279 569.207 241.999C568.993 241.706 568.707 241.479 568.347 241.319C568 241.146 567.587 241.059 567.107 241.059C566.333 241.059 565.76 241.213 565.387 241.519C565.013 241.826 564.827 242.206 564.827 242.659C564.827 243.019 564.913 243.306 565.087 243.519C565.26 243.733 565.54 243.906 565.927 244.039C566.313 244.159 566.827 244.273 567.467 244.379C568.56 244.553 569.407 244.779 570.007 245.059C570.607 245.326 571.027 245.659 571.267 246.059C571.507 246.459 571.627 246.953 571.627 247.539C571.627 248.166 571.44 248.706 571.067 249.159C570.707 249.599 570.207 249.939 569.567 250.179C568.94 250.419 568.227 250.539 567.427 250.539ZM577.979 250.299V247.859H580.459V250.299H577.979ZM592.771 250.299C591.744 250.299 590.978 250.059 590.471 249.579C589.964 249.099 589.711 248.366 589.711 247.379V237.219H591.391V247.379C591.391 247.873 591.504 248.239 591.731 248.479C591.958 248.706 592.304 248.819 592.771 248.819H595.611V250.299H592.771ZM586.211 241.179V239.699H595.611V241.179H586.211ZM603.403 250.539C602.483 250.539 601.69 250.379 601.023 250.059C600.356 249.739 599.83 249.313 599.443 248.779C599.07 248.233 598.856 247.626 598.803 246.959L600.563 246.839C600.67 247.493 600.956 248.006 601.423 248.379C601.903 248.753 602.563 248.939 603.403 248.939C604.19 248.939 604.796 248.826 605.223 248.599C605.663 248.373 605.883 248.019 605.883 247.539C605.883 247.233 605.81 246.979 605.663 246.779C605.516 246.579 605.243 246.413 604.843 246.279C604.443 246.133 603.856 245.993 603.083 245.859C602.056 245.673 601.25 245.446 600.663 245.179C600.09 244.899 599.683 244.553 599.443 244.139C599.203 243.726 599.083 243.233 599.083 242.659C599.083 242.046 599.236 241.499 599.543 241.019C599.85 240.539 600.303 240.159 600.903 239.879C601.503 239.599 602.236 239.459 603.103 239.459C603.983 239.459 604.716 239.619 605.303 239.939C605.903 240.246 606.376 240.659 606.723 241.179C607.07 241.686 607.296 242.246 607.403 242.859L605.643 242.979C605.563 242.606 605.41 242.279 605.183 241.999C604.97 241.706 604.683 241.479 604.323 241.319C603.976 241.146 603.563 241.059 603.083 241.059C602.31 241.059 601.736 241.213 601.363 241.519C600.99 241.826 600.803 242.206 600.803 242.659C600.803 243.019 600.89 243.306 601.063 243.519C601.236 243.733 601.516 243.906 601.903 244.039C602.29 244.159 602.803 244.273 603.443 244.379C604.536 244.553 605.383 244.779 605.983 245.059C606.583 245.326 607.003 245.659 607.243 246.059C607.483 246.459 607.603 246.953 607.603 247.539C607.603 248.166 607.416 248.706 607.043 249.159C606.683 249.599 606.183 249.939 605.543 250.179C604.916 250.419 604.203 250.539 603.403 250.539Z" fill="#0A0A0A"/>
</g>
<g id="Frame 2147260343_2">
<g id="Frame_12" clipPath="url(#clip16_928_111777)">
<path id="Vector_35" d="M494.549 284.383H500.382C500.382 283.848 500.17 283.338 499.794 282.961L495.969 279.136C495.592 278.759 495.082 278.548 494.55 278.548V284.381L494.549 284.383Z" fill="#8F8F8F"/>
<path id="Vector_36" d="M494.549 278.549V284.383H500.382" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_37" d="M495.97 279.138L499.794 282.961C500.17 283.338 500.382 283.848 500.382 284.381V292.716C500.382 294.558 498.89 296.049 497.049 296.049H489.549C487.707 296.049 486.215 294.558 486.215 292.716V281.883C486.215 280.041 487.707 278.549 489.549 278.549H494.55C495.084 278.549 495.594 278.761 495.97 279.138Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id=".env_2" d="M518.018 294.299V291.859H520.498V294.299H518.018ZM531.43 294.539C530.43 294.539 529.563 294.313 528.83 293.859C528.11 293.406 527.55 292.766 527.15 291.939C526.763 291.099 526.57 290.119 526.57 288.999C526.57 287.879 526.763 286.906 527.15 286.079C527.55 285.253 528.103 284.613 528.81 284.159C529.53 283.693 530.377 283.459 531.35 283.459C532.27 283.459 533.083 283.679 533.79 284.119C534.497 284.546 535.05 285.173 535.45 285.999C535.85 286.826 536.05 287.833 536.05 289.019V289.519H528.33C528.397 290.653 528.697 291.506 529.23 292.079C529.777 292.653 530.51 292.939 531.43 292.939C532.123 292.939 532.69 292.779 533.13 292.459C533.583 292.126 533.897 291.693 534.07 291.159L535.87 291.299C535.59 292.246 535.057 293.026 534.27 293.639C533.497 294.239 532.55 294.539 531.43 294.539ZM528.33 288.039H534.21C534.13 287.013 533.83 286.259 533.31 285.779C532.79 285.299 532.137 285.059 531.35 285.059C530.537 285.059 529.863 285.313 529.33 285.819C528.81 286.313 528.477 287.053 528.33 288.039ZM538.922 294.299V283.699H540.462L540.522 286.399L540.322 286.219C540.456 285.593 540.696 285.079 541.042 284.679C541.402 284.266 541.829 283.959 542.322 283.759C542.816 283.559 543.336 283.459 543.882 283.459C544.696 283.459 545.369 283.639 545.902 283.999C546.449 284.359 546.862 284.846 547.142 285.459C547.422 286.059 547.562 286.733 547.562 287.479V294.299H545.882V287.959C545.882 286.973 545.689 286.226 545.302 285.719C544.916 285.199 544.322 284.939 543.522 284.939C542.976 284.939 542.482 285.059 542.042 285.299C541.602 285.526 541.249 285.866 540.982 286.319C540.729 286.759 540.602 287.306 540.602 287.959V294.299H538.922ZM554.174 294.299L550.234 283.699H552.074L555.234 292.579L558.394 283.699H560.234L556.294 294.299H554.174Z" fill="#0A0A0A"/>
<g id="Frame 2147260345_2">
<g id="Frame_13" clipPath="url(#clip17_928_111777)">
<path id="Vector_38" d="M714.7 289.799V291.466" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_39" d="M710.95 285.216V282.299C710.95 280.228 712.629 278.549 714.7 278.549C716.772 278.549 718.45 280.228 718.45 282.299V285.216" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_40" d="M720.117 285.216H709.284C707.903 285.216 706.784 286.335 706.784 287.716V293.549C706.784 294.93 707.903 296.049 709.284 296.049H720.117C721.498 296.049 722.617 294.93 722.617 293.549V287.716C722.617 286.335 721.498 285.216 720.117 285.216Z" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
</g>
</g>
</g>
</g>
<rect x="466.884" y="28.8842" width="274.232" height="290.83" rx="2.90471" stroke="#C4C4C4" strokeWidth="0.829918"/>
</g>
</g>
<rect x="459.415" y="21.415" width="289.17" height="305.768" rx="9.54406" fill="none" stroke="black" strokeOpacity="0.1" strokeWidth="0.829918"/>
</g>
<g id="Frame 2147260431">
<g filter="url(#filter6_ddddii_928_111777)">
<rect x="459" y="363.701" width="290" height="306.598" rx="9.959" fill="white"/>
</g>
<g clipPath="url(#clip18_928_111777)">
<g id="Dialog_3" filter="url(#filter7_ddi_928_111777)">
<g clipPath="url(#clip19_928_111777)">
<rect x="466.469" y="371.17" width="275.061" height="291.66" rx="3.31967" fill="#F5F5F5"/>
<g id="Header_3">
<g id="Heading 2_3">
<g id="Frame_14" clipPath="url(#clip20_928_111777)">
<path id="Vector_41" d="M488.716 405.25C487.336 405.25 486.216 404.13 486.216 402.75V394.417C486.216 393.037 487.336 391.917 488.716 391.917H497.882C499.262 391.917 500.382 393.037 500.382 394.417V402.75C500.382 404.13 499.262 405.25 497.882 405.25" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_42" d="M484.549 405.25H502.049" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="MacBook Pro" d="M515.018 406V391.9H518.178L521.898 404.7H521.978L525.698 391.9H528.858V406H527.178V392.9H527.118L523.158 406H520.718L516.758 392.9H516.698V406H515.018ZM535.162 406.24C534.122 406.24 533.282 405.966 532.642 405.42C532.002 404.873 531.682 404.146 531.682 403.24C531.682 402.373 531.988 401.66 532.602 401.1C533.228 400.54 534.108 400.18 535.242 400.02L539.242 399.42V400.68L535.762 401.18C534.975 401.3 534.388 401.526 534.002 401.86C533.615 402.193 533.422 402.633 533.422 403.18C533.422 403.713 533.602 404.133 533.962 404.44C534.335 404.733 534.848 404.88 535.502 404.88C536.075 404.88 536.575 404.753 537.002 404.5C537.428 404.233 537.755 403.866 537.982 403.4C538.222 402.92 538.342 402.36 538.342 401.72V398.9C538.342 398.22 538.148 397.68 537.762 397.28C537.388 396.866 536.822 396.66 536.062 396.66C535.395 396.66 534.855 396.806 534.442 397.1C534.028 397.393 533.742 397.846 533.582 398.46L531.982 398.02C532.208 397.166 532.688 396.493 533.422 396C534.155 395.493 535.048 395.24 536.102 395.24C537.422 395.24 538.408 395.566 539.062 396.22C539.715 396.873 540.042 397.78 540.042 398.94V403.86L540.822 406H539.022L538.442 404.38H538.362C538.055 404.94 537.622 405.393 537.062 405.74C536.515 406.073 535.882 406.24 535.162 406.24ZM547.556 406.24C546.65 406.24 545.83 406.026 545.096 405.6C544.363 405.16 543.776 404.533 543.336 403.72C542.91 402.893 542.696 401.9 542.696 400.74C542.696 399.566 542.91 398.573 543.336 397.76C543.763 396.933 544.336 396.306 545.056 395.88C545.79 395.453 546.61 395.24 547.516 395.24C548.543 395.24 549.403 395.46 550.096 395.9C550.803 396.326 551.336 397.006 551.696 397.94L550.196 398.54C549.93 397.9 549.57 397.433 549.116 397.14C548.676 396.846 548.13 396.7 547.476 396.7C546.97 396.7 546.483 396.84 546.016 397.12C545.55 397.386 545.17 397.82 544.876 398.42C544.583 399.006 544.436 399.78 544.436 400.74C544.436 401.686 544.583 402.46 544.876 403.06C545.17 403.66 545.55 404.1 546.016 404.38C546.496 404.66 546.996 404.8 547.516 404.8C548.183 404.8 548.736 404.646 549.176 404.34C549.616 404.033 549.97 403.56 550.236 402.92L551.716 403.5C551.37 404.42 550.85 405.106 550.156 405.56C549.463 406.013 548.596 406.24 547.556 406.24ZM554.1 406V391.9H559.24C560.573 391.9 561.607 392.206 562.34 392.82C563.073 393.433 563.44 394.286 563.44 395.38C563.44 395.9 563.333 396.373 563.12 396.8C562.907 397.213 562.6 397.56 562.2 397.84C561.8 398.106 561.32 398.286 560.76 398.38V398.44C561.427 398.506 562.02 398.686 562.54 398.98C563.073 399.273 563.487 399.68 563.78 400.2C564.087 400.706 564.24 401.32 564.24 402.04C564.24 403.266 563.8 404.233 562.92 404.94C562.053 405.646 560.847 406 559.3 406H554.1ZM555.88 405.4L555.08 404.6H559.2C560.28 404.6 561.08 404.38 561.6 403.94C562.133 403.5 562.4 402.833 562.4 401.94C562.4 401.06 562.127 400.393 561.58 399.94C561.047 399.473 560.233 399.24 559.14 399.24H555.54V397.88H558.86C559.74 397.88 560.427 397.68 560.92 397.28C561.413 396.88 561.66 396.306 561.66 395.56C561.66 394.84 561.433 394.286 560.98 393.9C560.54 393.5 559.92 393.3 559.12 393.3H555.08L555.88 392.5V405.4ZM571.407 406.24C570.461 406.24 569.607 406.02 568.847 405.58C568.087 405.126 567.487 404.493 567.047 403.68C566.621 402.853 566.407 401.88 566.407 400.76C566.407 399.626 566.627 398.653 567.067 397.84C567.507 397.013 568.107 396.373 568.867 395.92C569.627 395.466 570.474 395.24 571.407 395.24C572.367 395.24 573.227 395.466 573.987 395.92C574.747 396.36 575.341 396.993 575.767 397.82C576.207 398.633 576.427 399.613 576.427 400.76C576.427 401.88 576.207 402.853 575.767 403.68C575.341 404.493 574.747 405.126 573.987 405.58C573.227 406.02 572.367 406.24 571.407 406.24ZM571.427 404.8C572.014 404.8 572.554 404.653 573.047 404.36C573.541 404.066 573.934 403.626 574.227 403.04C574.521 402.44 574.667 401.68 574.667 400.76C574.667 399.826 574.521 399.06 574.227 398.46C573.934 397.86 573.541 397.42 573.047 397.14C572.554 396.846 572.014 396.7 571.427 396.7C570.827 396.7 570.281 396.846 569.787 397.14C569.294 397.42 568.901 397.86 568.607 398.46C568.314 399.06 568.167 399.826 568.167 400.76C568.167 401.68 568.314 402.44 568.607 403.04C568.901 403.626 569.294 404.066 569.787 404.36C570.281 404.653 570.827 404.8 571.427 404.8ZM583.556 406.24C582.609 406.24 581.756 406.02 580.996 405.58C580.236 405.126 579.636 404.493 579.196 403.68C578.769 402.853 578.556 401.88 578.556 400.76C578.556 399.626 578.776 398.653 579.216 397.84C579.656 397.013 580.256 396.373 581.016 395.92C581.776 395.466 582.622 395.24 583.556 395.24C584.516 395.24 585.376 395.466 586.136 395.92C586.896 396.36 587.489 396.993 587.916 397.82C588.356 398.633 588.576 399.613 588.576 400.76C588.576 401.88 588.356 402.853 587.916 403.68C587.489 404.493 586.896 405.126 586.136 405.58C585.376 406.02 584.516 406.24 583.556 406.24ZM583.576 404.8C584.162 404.8 584.702 404.653 585.196 404.36C585.689 404.066 586.082 403.626 586.376 403.04C586.669 402.44 586.816 401.68 586.816 400.76C586.816 399.826 586.669 399.06 586.376 398.46C586.082 397.86 585.689 397.42 585.196 397.14C584.702 396.846 584.162 396.7 583.576 396.7C582.976 396.7 582.429 396.846 581.936 397.14C581.442 397.42 581.049 397.86 580.756 398.46C580.462 399.06 580.316 399.826 580.316 400.76C580.316 401.68 580.462 402.44 580.756 403.04C581.049 403.626 581.442 404.066 581.936 404.36C582.429 404.653 582.976 404.8 583.576 404.8ZM592.106 403.14V400.5H592.926L597.726 395.48H599.766L595.306 400.1L594.906 400.34L592.106 403.14ZM591.166 406V391.42H592.866V406H591.166ZM598.026 406L594.246 400.32L595.266 398.98L599.966 406H598.026ZM607.655 406V391.9H612.815C613.788 391.9 614.635 392.066 615.355 392.4C616.088 392.733 616.655 393.213 617.055 393.84C617.468 394.453 617.675 395.193 617.675 396.06C617.675 396.926 617.468 397.673 617.055 398.3C616.655 398.926 616.088 399.406 615.355 399.74C614.635 400.073 613.788 400.24 612.815 400.24H609.035V398.74H612.555C613.595 398.74 614.408 398.526 614.995 398.1C615.581 397.66 615.875 396.98 615.875 396.06C615.875 395.14 615.581 394.466 614.995 394.04C614.408 393.6 613.595 393.38 612.555 393.38H608.715L609.435 392.64V406H607.655ZM619.936 406V395.48H621.496V397.4H621.556C621.743 396.746 622.083 396.226 622.576 395.84C623.069 395.44 623.636 395.24 624.276 395.24C624.409 395.24 624.536 395.253 624.656 395.28C624.789 395.293 624.896 395.313 624.976 395.34V396.9C624.883 396.873 624.776 396.853 624.656 396.84C624.536 396.826 624.396 396.82 624.236 396.82C623.743 396.82 623.296 396.94 622.896 397.18C622.509 397.42 622.203 397.753 621.976 398.18C621.749 398.606 621.636 399.106 621.636 399.68V406H619.936ZM630.899 406.24C629.953 406.24 629.099 406.02 628.339 405.58C627.579 405.126 626.979 404.493 626.539 403.68C626.113 402.853 625.899 401.88 625.899 400.76C625.899 399.626 626.119 398.653 626.559 397.84C626.999 397.013 627.599 396.373 628.359 395.92C629.119 395.466 629.966 395.24 630.899 395.24C631.859 395.24 632.719 395.466 633.479 395.92C634.239 396.36 634.833 396.993 635.259 397.82C635.699 398.633 635.919 399.613 635.919 400.76C635.919 401.88 635.699 402.853 635.259 403.68C634.833 404.493 634.239 405.126 633.479 405.58C632.719 406.02 631.859 406.24 630.899 406.24ZM630.919 404.8C631.506 404.8 632.046 404.653 632.539 404.36C633.033 404.066 633.426 403.626 633.719 403.04C634.013 402.44 634.159 401.68 634.159 400.76C634.159 399.826 634.013 399.06 633.719 398.46C633.426 397.86 633.033 397.42 632.539 397.14C632.046 396.846 631.506 396.7 630.919 396.7C630.319 396.7 629.773 396.846 629.279 397.14C628.786 397.42 628.393 397.86 628.099 398.46C627.806 399.06 627.659 399.826 627.659 400.76C627.659 401.68 627.806 402.44 628.099 403.04C628.393 403.626 628.786 404.066 629.279 404.36C629.773 404.653 630.319 404.8 630.919 404.8Z" fill="#0A0A0A"/>
</g>
</g>
<g id="Frame 2147260221_3" filter="url(#filter8_i_928_111777)">
<rect x="467.299" y="426" width="273.401" height="236" rx="3.31967" fill="white"/>
<rect x="466.884" y="425.585" width="274.231" height="236.83" rx="3.73463" fill="none" stroke="#C4C4C4" strokeWidth="0.829918"/>
<path id="~/project_3" d="M491.119 456.28C490.652 456.28 490.272 456.193 489.979 456.02C489.699 455.833 489.359 455.5 488.959 455.02C488.692 454.686 488.479 454.446 488.319 454.3C488.172 454.14 488.039 454.04 487.919 454C487.812 453.96 487.685 453.94 487.539 453.94C487.192 453.94 486.925 454.12 486.739 454.48C486.552 454.84 486.459 455.373 486.459 456.08H484.879C484.879 454.986 485.119 454.1 485.599 453.42C486.079 452.74 486.705 452.4 487.479 452.4C487.985 452.4 488.385 452.5 488.679 452.7C488.985 452.9 489.312 453.226 489.659 453.68C490.005 454.133 490.265 454.426 490.439 454.56C490.625 454.68 490.845 454.74 491.099 454.74C491.445 454.74 491.705 454.56 491.879 454.2C492.065 453.826 492.159 453.293 492.159 452.6H493.739C493.739 453.693 493.499 454.58 493.019 455.26C492.539 455.94 491.905 456.28 491.119 456.28ZM497.451 463.2L503.531 446H505.131L499.051 463.2H497.451ZM508.883 464V450.4H510.443L510.483 452.8L510.243 452.68C510.51 451.853 510.95 451.226 511.563 450.8C512.19 450.373 512.91 450.16 513.723 450.16C514.777 450.16 515.637 450.42 516.303 450.94C516.983 451.46 517.483 452.14 517.803 452.98C518.123 453.82 518.283 454.726 518.283 455.7C518.283 456.673 518.123 457.58 517.803 458.42C517.483 459.26 516.983 459.94 516.303 460.46C515.637 460.98 514.777 461.24 513.723 461.24C513.177 461.24 512.663 461.146 512.183 460.96C511.717 460.773 511.317 460.513 510.983 460.18C510.663 459.846 510.443 459.453 510.323 459L510.563 458.72V464H508.883ZM513.563 459.64C514.483 459.64 515.203 459.293 515.723 458.6C516.257 457.906 516.523 456.94 516.523 455.7C516.523 454.46 516.257 453.493 515.723 452.8C515.203 452.106 514.483 451.76 513.563 451.76C512.95 451.76 512.417 451.906 511.963 452.2C511.523 452.493 511.177 452.933 510.923 453.52C510.683 454.106 510.563 454.833 510.563 455.7C510.563 456.566 510.683 457.293 510.923 457.88C511.163 458.466 511.51 458.906 511.963 459.2C512.417 459.493 512.95 459.64 513.563 459.64ZM523.835 461V450.4H525.235L525.395 453.08L525.235 453.04C525.369 452.133 525.655 451.466 526.095 451.04C526.549 450.613 527.149 450.4 527.895 450.4H530.075V451.92H527.915C527.395 451.92 526.955 452.026 526.595 452.24C526.249 452.44 525.982 452.74 525.795 453.14C525.609 453.526 525.515 454.013 525.515 454.6V461H523.835ZM521.075 461V459.52H528.875V461H521.075ZM521.075 451.88V450.4H524.755V451.88H521.075ZM537.268 461.24C536.294 461.24 535.441 461.013 534.708 460.56C533.988 460.106 533.428 459.466 533.028 458.64C532.628 457.8 532.428 456.82 532.428 455.7C532.428 454.566 532.628 453.586 533.028 452.76C533.428 451.933 533.988 451.293 534.708 450.84C535.441 450.386 536.294 450.16 537.268 450.16C538.241 450.16 539.088 450.386 539.808 450.84C540.541 451.293 541.108 451.933 541.508 452.76C541.908 453.586 542.108 454.566 542.108 455.7C542.108 456.82 541.908 457.8 541.508 458.64C541.108 459.466 540.541 460.106 539.808 460.56C539.088 461.013 538.241 461.24 537.268 461.24ZM537.268 459.64C538.241 459.64 538.994 459.293 539.528 458.6C540.074 457.893 540.348 456.926 540.348 455.7C540.348 454.473 540.074 453.513 539.528 452.82C538.994 452.113 538.241 451.76 537.268 451.76C536.294 451.76 535.534 452.113 534.988 452.82C534.454 453.513 534.188 454.473 534.188 455.7C534.188 456.926 534.454 457.893 534.988 458.6C535.534 459.293 536.294 459.64 537.268 459.64ZM545.46 464V462.52H548.82C549.34 462.52 549.726 462.406 549.98 462.18C550.246 461.953 550.38 461.52 550.38 460.88V450.4H552.06V461C552.06 461.973 551.82 462.713 551.34 463.22C550.86 463.74 550.086 464 549.02 464H545.46ZM545.66 451.88V450.4H551.34V451.88H545.66ZM550.28 448.74V446.78H552.04V448.74H550.28ZM561.432 461.24C560.432 461.24 559.565 461.013 558.832 460.56C558.112 460.106 557.552 459.466 557.152 458.64C556.765 457.8 556.572 456.82 556.572 455.7C556.572 454.58 556.765 453.606 557.152 452.78C557.552 451.953 558.105 451.313 558.812 450.86C559.532 450.393 560.379 450.16 561.352 450.16C562.272 450.16 563.085 450.38 563.792 450.82C564.499 451.246 565.052 451.873 565.452 452.7C565.852 453.526 566.052 454.533 566.052 455.72V456.22H558.332C558.399 457.353 558.699 458.206 559.232 458.78C559.779 459.353 560.512 459.64 561.432 459.64C562.125 459.64 562.692 459.48 563.132 459.16C563.585 458.826 563.899 458.393 564.072 457.86L565.872 458C565.592 458.946 565.059 459.726 564.272 460.34C563.499 460.94 562.552 461.24 561.432 461.24ZM558.332 454.74H564.212C564.132 453.713 563.832 452.96 563.312 452.48C562.792 452 562.139 451.76 561.352 451.76C560.539 451.76 559.865 452.013 559.332 452.52C558.812 453.013 558.479 453.753 558.332 454.74ZM573.524 461.24C572.537 461.24 571.677 461.013 570.944 460.56C570.211 460.106 569.644 459.466 569.244 458.64C568.844 457.8 568.644 456.82 568.644 455.7C568.644 454.58 568.844 453.606 569.244 452.78C569.644 451.953 570.211 451.313 570.944 450.86C571.677 450.393 572.537 450.16 573.524 450.16C574.311 450.16 575.011 450.306 575.624 450.6C576.237 450.88 576.744 451.293 577.144 451.84C577.544 452.386 577.817 453.053 577.964 453.84L576.204 453.96C576.044 453.253 575.724 452.713 575.244 452.34C574.777 451.953 574.204 451.76 573.524 451.76C572.551 451.76 571.784 452.113 571.224 452.82C570.677 453.513 570.404 454.473 570.404 455.7C570.404 456.926 570.677 457.893 571.224 458.6C571.784 459.293 572.551 459.64 573.524 459.64C574.204 459.64 574.791 459.44 575.284 459.04C575.791 458.64 576.124 458.04 576.284 457.24L578.044 457.36C577.897 458.146 577.617 458.833 577.204 459.42C576.791 459.993 576.271 460.44 575.644 460.76C575.017 461.08 574.311 461.24 573.524 461.24ZM586.796 461C585.77 461 585.003 460.76 584.496 460.28C583.99 459.8 583.736 459.066 583.736 458.08V447.92H585.416V458.08C585.416 458.573 585.53 458.94 585.756 459.18C585.983 459.406 586.33 459.52 586.796 459.52H589.636V461H586.796ZM580.236 451.88V450.4H589.636V451.88H580.236Z" fill="black" fillOpacity="0.5"/>
<g id="Frame 2147260340_3">
<g id="Frame_15" clipPath="url(#clip21_928_111777)">
<path id="Vector_43" d="M494.549 495.083H500.382C500.382 494.548 500.17 494.038 499.794 493.661L495.969 489.836C495.592 489.46 495.082 489.248 494.55 489.248V495.081L494.549 495.083Z" fill="#8F8F8F"/>
<path id="Vector_44" d="M494.549 489.25V495.083H500.382" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_45" d="M495.97 489.838L499.794 493.661C500.17 494.038 500.382 494.548 500.382 495.081V503.416C500.382 505.258 498.89 506.75 497.049 506.75H489.549C487.707 506.75 486.215 505.258 486.215 503.416V492.583C486.215 490.741 487.707 489.25 489.549 489.25H494.55C495.084 489.25 495.594 489.461 495.97 489.838Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="README.md_3" d="M514.658 505V490.8H518.978C520.471 490.8 521.651 491.18 522.518 491.94C523.384 492.686 523.818 493.72 523.818 495.04C523.818 495.706 523.664 496.3 523.358 496.82C523.051 497.326 522.658 497.726 522.178 498.02C521.698 498.313 521.204 498.48 520.698 498.52L520.618 498.28C521.564 498.333 522.271 498.56 522.738 498.96C523.218 499.36 523.498 500.013 523.578 500.92L523.938 505H522.218L521.878 501.14C521.838 500.7 521.731 500.346 521.558 500.08C521.398 499.8 521.138 499.6 520.778 499.48C520.431 499.346 519.951 499.28 519.338 499.28H516.378V505H514.658ZM516.378 497.6H518.978C519.964 497.6 520.718 497.38 521.238 496.94C521.758 496.486 522.018 495.853 522.018 495.04C522.018 494.213 521.758 493.58 521.238 493.14C520.718 492.7 519.964 492.48 518.978 492.48H516.378V497.6ZM527.05 505V490.8H535.69V492.48H528.77V497.06H535.45V498.7H528.77V503.32H535.85V505H527.05ZM537.762 505L542.082 490.8H544.402L548.722 505H546.882L543.242 492.36L539.602 505H537.762ZM539.942 500.96L540.542 499.28H545.942L546.542 500.96H539.942ZM551.034 505V490.8H554.394C555.621 490.8 556.688 491.08 557.594 491.64C558.514 492.186 559.221 492.993 559.714 494.06C560.221 495.113 560.474 496.4 560.474 497.92C560.474 499.44 560.221 500.726 559.714 501.78C559.221 502.833 558.514 503.633 557.594 504.18C556.688 504.726 555.621 505 554.394 505H551.034ZM552.754 503.32H554.294C555.681 503.32 556.754 502.873 557.514 501.98C558.288 501.073 558.674 499.72 558.674 497.92C558.674 496.12 558.288 494.766 557.514 493.86C556.754 492.94 555.681 492.48 554.294 492.48H552.754V503.32ZM566.467 503.4L563.787 492.4H563.947V505H562.227V490.8H564.827L567.627 502.48H566.827L569.627 490.8H572.227V505H570.507V492.4H570.667L567.987 503.4H566.467ZM575.019 505V490.8H583.659V492.48H576.739V497.06H583.419V498.7H576.739V503.32H583.819V505H575.019ZM589.971 505V502.56H592.451V505H589.971ZM598.003 505V494.4H599.543L599.603 496.76L599.403 496.72C599.523 495.933 599.776 495.313 600.163 494.86C600.563 494.393 601.07 494.16 601.683 494.16C602.31 494.16 602.79 494.386 603.123 494.84C603.47 495.293 603.683 495.96 603.763 496.84H603.563C603.683 496.013 603.95 495.36 604.363 494.88C604.79 494.4 605.323 494.16 605.963 494.16C606.816 494.16 607.436 494.453 607.823 495.04C608.21 495.626 608.403 496.6 608.403 497.96V505H606.723V498.2C606.723 497.253 606.623 496.593 606.423 496.22C606.223 495.833 605.91 495.64 605.483 495.64C605.203 495.64 604.956 495.733 604.743 495.92C604.53 496.093 604.356 496.373 604.223 496.76C604.103 497.146 604.043 497.64 604.043 498.24V505H602.363V498.2C602.363 497.293 602.263 496.64 602.063 496.24C601.876 495.84 601.563 495.64 601.123 495.64C600.843 495.64 600.596 495.733 600.383 495.92C600.17 496.093 599.996 496.373 599.863 496.76C599.743 497.146 599.683 497.64 599.683 498.24V505H598.003ZM614.535 505.24C613.602 505.24 612.795 505.013 612.115 504.56C611.435 504.106 610.909 503.466 610.535 502.64C610.175 501.813 609.995 500.833 609.995 499.7C609.995 498.566 610.175 497.586 610.535 496.76C610.909 495.933 611.435 495.293 612.115 494.84C612.795 494.386 613.602 494.16 614.535 494.16C615.282 494.16 615.935 494.34 616.495 494.7C617.055 495.046 617.462 495.44 617.715 495.88V490.8H619.395V505H617.875L617.815 503.4C617.522 503.973 617.089 504.426 616.515 504.76C615.942 505.08 615.282 505.24 614.535 505.24ZM614.635 503.64C615.275 503.64 615.822 503.48 616.275 503.16C616.742 502.84 617.095 502.386 617.335 501.8C617.589 501.2 617.715 500.5 617.715 499.7C617.715 498.873 617.589 498.166 617.335 497.58C617.095 496.993 616.742 496.546 616.275 496.24C615.809 495.92 615.249 495.76 614.595 495.76C613.729 495.76 613.035 496.113 612.515 496.82C612.009 497.513 611.755 498.473 611.755 499.7C611.755 500.913 612.009 501.873 612.515 502.58C613.035 503.286 613.742 503.64 614.635 503.64Z" fill="#0A0A0A"/>
</g>
<g id="Frame 2147260341_3">
<g id="Frame_16" clipPath="url(#clip22_928_111777)">
<path id="Vector_46" d="M494.549 539.083H500.382C500.382 538.548 500.17 538.038 499.794 537.661L495.969 533.836C495.592 533.46 495.082 533.248 494.55 533.248V539.081L494.549 539.083Z" fill="#0D76F2"/>
<path id="Vector_47" d="M494.549 533.25V539.083H500.382" stroke="#0D76F2" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_48" d="M495.97 533.838L499.794 537.661C500.17 538.038 500.382 538.548 500.382 539.081V547.416C500.382 549.258 498.89 550.75 497.049 550.75H489.549C487.707 550.75 486.215 549.258 486.215 547.416V536.583C486.215 534.741 487.707 533.25 489.549 533.25H494.55C495.084 533.25 495.594 533.461 495.97 533.838Z" stroke="#0D76F2" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="auth.ts_3" d="M517.858 549.24C517.191 549.24 516.591 549.12 516.058 548.88C515.524 548.64 515.104 548.306 514.798 547.88C514.491 547.44 514.338 546.933 514.338 546.36C514.338 545.453 514.604 544.753 515.138 544.26C515.684 543.753 516.538 543.386 517.698 543.16L521.258 542.44C521.258 541.533 521.051 540.86 520.638 540.42C520.238 539.98 519.658 539.76 518.898 539.76C518.164 539.76 517.591 539.926 517.178 540.26C516.764 540.58 516.478 541.046 516.318 541.66L514.538 541.52C514.738 540.52 515.211 539.713 515.958 539.1C516.718 538.473 517.698 538.16 518.898 538.16C520.178 538.16 521.171 538.546 521.878 539.32C522.584 540.08 522.938 541.133 522.938 542.48V546.88C522.938 547.12 522.991 547.286 523.098 547.38C523.204 547.473 523.364 547.52 523.578 547.52H524.258V549C524.178 549.013 524.051 549.02 523.878 549.02C523.704 549.033 523.538 549.04 523.378 549.04C522.924 549.04 522.538 548.966 522.218 548.82C521.911 548.673 521.678 548.44 521.518 548.12C521.358 547.786 521.271 547.36 521.258 546.84H521.578C521.484 547.293 521.258 547.706 520.898 548.08C520.551 548.44 520.111 548.726 519.578 548.94C519.044 549.14 518.471 549.24 517.858 549.24ZM518.018 547.76C518.738 547.76 519.338 547.64 519.818 547.4C520.298 547.146 520.658 546.8 520.898 546.36C521.138 545.906 521.258 545.386 521.258 544.8V543.88L518.018 544.52C517.298 544.653 516.798 544.86 516.518 545.14C516.238 545.406 516.098 545.76 516.098 546.2C516.098 546.693 516.264 547.08 516.598 547.36C516.944 547.626 517.418 547.76 518.018 547.76ZM530.51 549.24C529.457 549.24 528.617 548.886 527.99 548.18C527.363 547.46 527.05 546.473 527.05 545.22V538.4H528.73V544.76C528.73 545.786 528.91 546.546 529.27 547.04C529.643 547.52 530.21 547.76 530.97 547.76C531.797 547.76 532.45 547.493 532.93 546.96C533.41 546.413 533.65 545.666 533.65 544.72V538.4H535.33V549H533.73V546.38L533.99 546.52C533.777 547.386 533.37 548.06 532.77 548.54C532.17 549.006 531.417 549.24 530.51 549.24ZM544.802 549C543.776 549 543.009 548.76 542.502 548.28C541.996 547.8 541.742 547.066 541.742 546.08V535.92H543.422V546.08C543.422 546.573 543.536 546.94 543.762 547.18C543.989 547.406 544.336 547.52 544.802 547.52H547.642V549H544.802ZM538.242 539.88V538.4H547.642V539.88H538.242ZM551.234 549V534.8H552.914V540.74L552.714 540.7C552.848 540.113 553.074 539.633 553.394 539.26C553.714 538.886 554.108 538.613 554.574 538.44C555.041 538.253 555.548 538.16 556.094 538.16C556.854 538.16 557.494 538.333 558.014 538.68C558.548 539.013 558.948 539.486 559.214 540.1C559.494 540.7 559.634 541.393 559.634 542.18V549H557.954V542.66C557.954 541.633 557.768 540.873 557.394 540.38C557.034 539.886 556.481 539.64 555.734 539.64C554.881 539.64 554.194 539.9 553.674 540.42C553.168 540.94 552.914 541.693 552.914 542.68V549H551.234ZM565.987 549V546.56H568.467V549H565.987ZM580.779 549C579.752 549 578.985 548.76 578.479 548.28C577.972 547.8 577.719 547.066 577.719 546.08V535.92H579.399V546.08C579.399 546.573 579.512 546.94 579.739 547.18C579.965 547.406 580.312 547.52 580.779 547.52H583.619V549H580.779ZM574.219 539.88V538.4H583.619V539.88H574.219ZM591.411 549.24C590.491 549.24 589.698 549.08 589.031 548.76C588.364 548.44 587.838 548.013 587.451 547.48C587.078 546.933 586.864 546.326 586.811 545.66L588.571 545.54C588.678 546.193 588.964 546.706 589.431 547.08C589.911 547.453 590.571 547.64 591.411 547.64C592.198 547.64 592.804 547.526 593.231 547.3C593.671 547.073 593.891 546.72 593.891 546.24C593.891 545.933 593.818 545.68 593.671 545.48C593.524 545.28 593.251 545.113 592.851 544.98C592.451 544.833 591.864 544.693 591.091 544.56C590.064 544.373 589.258 544.146 588.671 543.88C588.098 543.6 587.691 543.253 587.451 542.84C587.211 542.426 587.091 541.933 587.091 541.36C587.091 540.746 587.244 540.2 587.551 539.72C587.858 539.24 588.311 538.86 588.911 538.58C589.511 538.3 590.244 538.16 591.111 538.16C591.991 538.16 592.724 538.32 593.311 538.64C593.911 538.946 594.384 539.36 594.731 539.88C595.078 540.386 595.304 540.946 595.411 541.56L593.651 541.68C593.571 541.306 593.418 540.98 593.191 540.7C592.978 540.406 592.691 540.18 592.331 540.02C591.984 539.846 591.571 539.76 591.091 539.76C590.318 539.76 589.744 539.913 589.371 540.22C588.998 540.526 588.811 540.906 588.811 541.36C588.811 541.72 588.898 542.006 589.071 542.22C589.244 542.433 589.524 542.606 589.911 542.74C590.298 542.86 590.811 542.973 591.451 543.08C592.544 543.253 593.391 543.48 593.991 543.76C594.591 544.026 595.011 544.36 595.251 544.76C595.491 545.16 595.611 545.653 595.611 546.24C595.611 546.866 595.424 547.406 595.051 547.86C594.691 548.3 594.191 548.64 593.551 548.88C592.924 549.12 592.211 549.24 591.411 549.24Z" fill="#0D76F2"/>
<path id="NEW_3" d="M690.1 549V534.8H692.54L697.58 547.04V534.8H699.3V549H696.86L691.82 536.76V549H690.1ZM702.492 549V534.8H711.132V536.48H704.212V541.06H710.892V542.7H704.212V547.32H711.292V549H702.492ZM714.845 549L713.285 534.8H715.085L716.405 548H716.205L717.765 536.4H719.605L721.165 548H720.965L722.285 534.8H724.085L722.525 549H719.925L718.445 537.8H718.925L717.445 549H714.845Z" fill="#0F63C7"/>
</g>
<g id="Frame 2147260342_3">
<g id="Frame_17" clipPath="url(#clip23_928_111777)">
<path id="Vector_49" d="M494.549 583.083H500.382C500.382 582.548 500.17 582.038 499.794 581.661L495.969 577.836C495.592 577.46 495.082 577.248 494.55 577.248V583.081L494.549 583.083Z" fill="#8F8F8F"/>
<path id="Vector_50" d="M494.549 577.25V583.083H500.382" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_51" d="M495.97 577.838L499.794 581.661C500.17 582.038 500.382 582.548 500.382 583.081V591.416C500.382 593.258 498.89 594.75 497.049 594.75H489.549C487.707 594.75 486.215 593.258 486.215 591.416V580.583C486.215 578.741 487.707 577.25 489.549 577.25H494.55C495.084 577.25 495.594 577.461 495.97 577.838Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id="utils.ts_3" d="M518.518 593.24C517.464 593.24 516.624 592.886 515.998 592.18C515.371 591.46 515.058 590.473 515.058 589.22V582.4H516.738V588.76C516.738 589.786 516.918 590.546 517.278 591.04C517.651 591.52 518.218 591.76 518.978 591.76C519.804 591.76 520.458 591.493 520.938 590.96C521.418 590.413 521.658 589.666 521.658 588.72V582.4H523.338V593H521.738V590.38L521.998 590.52C521.784 591.386 521.378 592.06 520.778 592.54C520.178 593.006 519.424 593.24 518.518 593.24ZM532.81 593C531.783 593 531.017 592.76 530.51 592.28C530.003 591.8 529.75 591.066 529.75 590.08V579.92H531.43V590.08C531.43 590.573 531.543 590.94 531.77 591.18C531.997 591.406 532.343 591.52 532.81 591.52H535.65V593H532.81ZM526.25 583.88V582.4H535.65V583.88H526.25ZM543.102 593V582.4H544.782V593H543.102ZM538.842 593V591.52H548.442V593H538.842ZM539.042 583.88V582.4H544.782V583.88H539.042ZM542.942 580.74V578.78H544.702V580.74H542.942ZM554.694 593V581.64C554.694 581.213 554.574 580.88 554.334 580.64C554.094 580.4 553.761 580.28 553.334 580.28H550.834V578.8H553.414C554.388 578.8 555.121 579.053 555.614 579.56C556.121 580.053 556.374 580.786 556.374 581.76V593H554.694ZM550.434 593V591.52H560.034V593H550.434ZM567.427 593.24C566.507 593.24 565.713 593.08 565.047 592.76C564.38 592.44 563.853 592.013 563.467 591.48C563.093 590.933 562.88 590.326 562.827 589.66L564.587 589.54C564.693 590.193 564.98 590.706 565.447 591.08C565.927 591.453 566.587 591.64 567.427 591.64C568.213 591.64 568.82 591.526 569.247 591.3C569.687 591.073 569.907 590.72 569.907 590.24C569.907 589.933 569.833 589.68 569.687 589.48C569.54 589.28 569.267 589.113 568.867 588.98C568.467 588.833 567.88 588.693 567.107 588.56C566.08 588.373 565.273 588.146 564.687 587.88C564.113 587.6 563.707 587.253 563.467 586.84C563.227 586.426 563.107 585.933 563.107 585.36C563.107 584.746 563.26 584.2 563.567 583.72C563.873 583.24 564.327 582.86 564.927 582.58C565.527 582.3 566.26 582.16 567.127 582.16C568.007 582.16 568.74 582.32 569.327 582.64C569.927 582.946 570.4 583.36 570.747 583.88C571.093 584.386 571.32 584.946 571.427 585.56L569.667 585.68C569.587 585.306 569.433 584.98 569.207 584.7C568.993 584.406 568.707 584.18 568.347 584.02C568 583.846 567.587 583.76 567.107 583.76C566.333 583.76 565.76 583.913 565.387 584.22C565.013 584.526 564.827 584.906 564.827 585.36C564.827 585.72 564.913 586.006 565.087 586.22C565.26 586.433 565.54 586.606 565.927 586.74C566.313 586.86 566.827 586.973 567.467 587.08C568.56 587.253 569.407 587.48 570.007 587.76C570.607 588.026 571.027 588.36 571.267 588.76C571.507 589.16 571.627 589.653 571.627 590.24C571.627 590.866 571.44 591.406 571.067 591.86C570.707 592.3 570.207 592.64 569.567 592.88C568.94 593.12 568.227 593.24 567.427 593.24ZM577.979 593V590.56H580.459V593H577.979ZM592.771 593C591.744 593 590.978 592.76 590.471 592.28C589.964 591.8 589.711 591.066 589.711 590.08V579.92H591.391V590.08C591.391 590.573 591.504 590.94 591.731 591.18C591.958 591.406 592.304 591.52 592.771 591.52H595.611V593H592.771ZM586.211 583.88V582.4H595.611V583.88H586.211ZM603.403 593.24C602.483 593.24 601.69 593.08 601.023 592.76C600.356 592.44 599.83 592.013 599.443 591.48C599.07 590.933 598.856 590.326 598.803 589.66L600.563 589.54C600.67 590.193 600.956 590.706 601.423 591.08C601.903 591.453 602.563 591.64 603.403 591.64C604.19 591.64 604.796 591.526 605.223 591.3C605.663 591.073 605.883 590.72 605.883 590.24C605.883 589.933 605.81 589.68 605.663 589.48C605.516 589.28 605.243 589.113 604.843 588.98C604.443 588.833 603.856 588.693 603.083 588.56C602.056 588.373 601.25 588.146 600.663 587.88C600.09 587.6 599.683 587.253 599.443 586.84C599.203 586.426 599.083 585.933 599.083 585.36C599.083 584.746 599.236 584.2 599.543 583.72C599.85 583.24 600.303 582.86 600.903 582.58C601.503 582.3 602.236 582.16 603.103 582.16C603.983 582.16 604.716 582.32 605.303 582.64C605.903 582.946 606.376 583.36 606.723 583.88C607.07 584.386 607.296 584.946 607.403 585.56L605.643 585.68C605.563 585.306 605.41 584.98 605.183 584.7C604.97 584.406 604.683 584.18 604.323 584.02C603.976 583.846 603.563 583.76 603.083 583.76C602.31 583.76 601.736 583.913 601.363 584.22C600.99 584.526 600.803 584.906 600.803 585.36C600.803 585.72 600.89 586.006 601.063 586.22C601.236 586.433 601.516 586.606 601.903 586.74C602.29 586.86 602.803 586.973 603.443 587.08C604.536 587.253 605.383 587.48 605.983 587.76C606.583 588.026 607.003 588.36 607.243 588.76C607.483 589.16 607.603 589.653 607.603 590.24C607.603 590.866 607.416 591.406 607.043 591.86C606.683 592.3 606.183 592.64 605.543 592.88C604.916 593.12 604.203 593.24 603.403 593.24Z" fill="#0A0A0A"/>
</g>
<g id="Frame 2147260343_3">
<g id="Frame_18">
<path id="Vector_52" d="M494.549 627.084H500.382C500.382 626.549 500.17 626.039 499.794 625.662L495.969 621.837C495.592 621.46 495.082 621.249 494.55 621.249V627.082L494.549 627.084Z" fill="#8F8F8F"/>
<path id="Vector_53" d="M494.549 621.25V627.083H500.382" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_54" d="M495.97 621.838L499.794 625.662C500.17 626.038 500.382 626.548 500.382 627.082V635.417C500.382 637.258 498.89 638.75 497.049 638.75H489.549C487.707 638.75 486.215 637.258 486.215 635.417V624.583C486.215 622.742 487.707 621.25 489.549 621.25H494.55C495.084 621.25 495.594 621.462 495.97 621.838Z" stroke="#8F8F8F" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<path id=".env_3" d="M518.018 637V634.56H520.498V637H518.018ZM531.43 637.24C530.43 637.24 529.563 637.013 528.83 636.56C528.11 636.107 527.55 635.467 527.15 634.64C526.763 633.8 526.57 632.82 526.57 631.7C526.57 630.58 526.763 629.607 527.15 628.78C527.55 627.953 528.103 627.313 528.81 626.86C529.53 626.393 530.377 626.16 531.35 626.16C532.27 626.16 533.083 626.38 533.79 626.82C534.497 627.247 535.05 627.873 535.45 628.7C535.85 629.527 536.05 630.533 536.05 631.72V632.22H528.33C528.397 633.353 528.697 634.207 529.23 634.78C529.777 635.353 530.51 635.64 531.43 635.64C532.123 635.64 532.69 635.48 533.13 635.16C533.583 634.827 533.897 634.393 534.07 633.86L535.87 634C535.59 634.947 535.057 635.727 534.27 636.34C533.497 636.94 532.55 637.24 531.43 637.24ZM528.33 630.74H534.21C534.13 629.713 533.83 628.96 533.31 628.48C532.79 628 532.137 627.76 531.35 627.76C530.537 627.76 529.863 628.013 529.33 628.52C528.81 629.013 528.477 629.753 528.33 630.74ZM538.922 637V626.4H540.462L540.522 629.1L540.322 628.92C540.456 628.293 540.696 627.78 541.042 627.38C541.402 626.967 541.829 626.66 542.322 626.46C542.816 626.26 543.336 626.16 543.882 626.16C544.696 626.16 545.369 626.34 545.902 626.7C546.449 627.06 546.862 627.547 547.142 628.16C547.422 628.76 547.562 629.433 547.562 630.18V637H545.882V630.66C545.882 629.673 545.689 628.927 545.302 628.42C544.916 627.9 544.322 627.64 543.522 627.64C542.976 627.64 542.482 627.76 542.042 628C541.602 628.227 541.249 628.567 540.982 629.02C540.729 629.46 540.602 630.007 540.602 630.66V637H538.922ZM554.174 637L550.234 626.4H552.074L555.234 635.28L558.394 626.4H560.234L556.294 637H554.174Z" fill="#0A0A0A"/>
<g id="Frame 2147260345_3">
<g id="Frame_19">
<path id="Vector_55" d="M714.7 632.5V634.167" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_56" d="M710.95 627.917V625C710.95 622.928 712.629 621.25 714.7 621.25C716.772 621.25 718.45 622.928 718.45 625V627.917" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path id="Vector_57" d="M720.117 627.917H709.284C707.903 627.917 706.784 629.036 706.784 630.417V636.25C706.784 637.631 707.903 638.75 709.284 638.75H720.117C721.498 638.75 722.617 637.631 722.617 636.25V630.417C722.617 629.036 721.498 627.917 720.117 627.917Z" stroke="#129457" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
</g>
</g>
</g>
</g>
<rect x="466.884" y="371.585" width="274.232" height="290.83" rx="2.90471" stroke="#C4C4C4" strokeWidth="0.829918"/>
</g>
</g>
<rect x="459.415" y="364.116" width="289.17" height="305.768" rx="9.54406" fill="none" stroke="black" strokeOpacity="0.1" strokeWidth="0.829918"/>
</g>
<rect id="Rectangle 60911" width="289" height="795" transform="matrix(-1 0 0 1 289 -36)" fill="url(#paint7_linear_928_111777)"/>
<g id="Rectangle 60912" filter="url(#filter9_f_928_111777)">
<rect x="358.014" y="139.051" width="200" height="328.307" transform="rotate(-111.412 358.014 139.051)" fill="url(#paint8_linear_928_111777)"/>
</g>
</g>
</g>
</g>
</g>
<defs>
{/*
  Micro-bloom for the trail's leading particles only. Applied to a blurred
  underlay behind each sharp core, never to the group, so the particle keeps a
  crisp edge and gains a rim of light rather than turning to fog.
*/}
<filter id="syncTrailGlow" x="-120%" y="-120%" width="340%" height="340%">
<feGaussianBlur stdDeviation={trailGlow.blur}/>
</filter>
<filter id="filter0_ddddii_928_111777" x="49" y="179.701" width="310" height="328.598" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="6" operator="erode" in="SourceAlpha" result="effect1_dropShadow_928_111777"/>
<feOffset dy="8"/>
<feGaussianBlur stdDeviation="8"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="6" operator="erode" in="SourceAlpha" result="effect2_dropShadow_928_111777"/>
<feOffset dy="6"/>
<feGaussianBlur stdDeviation="6"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_928_111777" result="effect2_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="4" operator="erode" in="SourceAlpha" result="effect3_dropShadow_928_111777"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="6"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="effect2_dropShadow_928_111777" result="effect3_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="0.5" operator="erode" in="SourceAlpha" result="effect4_dropShadow_928_111777"/>
<feOffset dy="1"/>
<feGaussianBlur stdDeviation="1"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="effect3_dropShadow_928_111777" result="effect4_dropShadow_928_111777"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect4_dropShadow_928_111777" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.5"/>
<feGaussianBlur stdDeviation="0.25"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect5_innerShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="0.5"/>
<feGaussianBlur stdDeviation="0.25"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="effect5_innerShadow_928_111777" result="effect6_innerShadow_928_111777"/>
</filter>
<filter id="filter1_ddi_928_111777" x="49.8709" y="187.85" width="308.258" height="324.857" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="9.95902" operator="erode" in="SourceAlpha" result="effect1_dropShadow_928_111777"/>
<feOffset dy="13.2787"/>
<feGaussianBlur stdDeviation="13.2787"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="1.65984" operator="erode" in="SourceAlpha" result="effect2_dropShadow_928_111777"/>
<feOffset dy="1.65984"/>
<feGaussianBlur stdDeviation="1.65984"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_928_111777" result="effect2_dropShadow_928_111777"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_928_111777" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.829918"/>
<feGaussianBlur stdDeviation="0.414959"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect3_innerShadow_928_111777"/>
</filter>
<filter id="filter2_i_928_111777" x="66.4692" y="244.34" width="275.062" height="238.49" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.829918"/>
<feGaussianBlur stdDeviation="0.414959"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_928_111777"/>
</filter>
<filter id="filter3_ddddii_928_111777" x="449" y="17" width="310" height="328.598" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="6" operator="erode" in="SourceAlpha" result="effect1_dropShadow_928_111777"/>
<feOffset dy="8"/>
<feGaussianBlur stdDeviation="8"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="6" operator="erode" in="SourceAlpha" result="effect2_dropShadow_928_111777"/>
<feOffset dy="6"/>
<feGaussianBlur stdDeviation="6"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_928_111777" result="effect2_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="4" operator="erode" in="SourceAlpha" result="effect3_dropShadow_928_111777"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="6"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="effect2_dropShadow_928_111777" result="effect3_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="0.5" operator="erode" in="SourceAlpha" result="effect4_dropShadow_928_111777"/>
<feOffset dy="1"/>
<feGaussianBlur stdDeviation="1"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="effect3_dropShadow_928_111777" result="effect4_dropShadow_928_111777"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect4_dropShadow_928_111777" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.5"/>
<feGaussianBlur stdDeviation="0.25"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect5_innerShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="0.5"/>
<feGaussianBlur stdDeviation="0.25"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="effect5_innerShadow_928_111777" result="effect6_innerShadow_928_111777"/>
</filter>
<filter id="filter4_ddi_928_111777" x="449.871" y="25.1496" width="308.258" height="324.857" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="9.95902" operator="erode" in="SourceAlpha" result="effect1_dropShadow_928_111777"/>
<feOffset dy="13.2787"/>
<feGaussianBlur stdDeviation="13.2787"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="1.65984" operator="erode" in="SourceAlpha" result="effect2_dropShadow_928_111777"/>
<feOffset dy="1.65984"/>
<feGaussianBlur stdDeviation="1.65984"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_928_111777" result="effect2_dropShadow_928_111777"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_928_111777" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.829918"/>
<feGaussianBlur stdDeviation="0.414959"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect3_innerShadow_928_111777"/>
</filter>
<filter id="filter5_i_928_111777" x="466.469" y="81.6396" width="275.062" height="238.49" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.829918"/>
<feGaussianBlur stdDeviation="0.414959"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_928_111777"/>
</filter>
<filter id="filter6_ddddii_928_111777" x="449" y="359.701" width="310" height="328.598" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="6" operator="erode" in="SourceAlpha" result="effect1_dropShadow_928_111777"/>
<feOffset dy="8"/>
<feGaussianBlur stdDeviation="8"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="6" operator="erode" in="SourceAlpha" result="effect2_dropShadow_928_111777"/>
<feOffset dy="6"/>
<feGaussianBlur stdDeviation="6"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_928_111777" result="effect2_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="4" operator="erode" in="SourceAlpha" result="effect3_dropShadow_928_111777"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="6"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="effect2_dropShadow_928_111777" result="effect3_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="0.5" operator="erode" in="SourceAlpha" result="effect4_dropShadow_928_111777"/>
<feOffset dy="1"/>
<feGaussianBlur stdDeviation="1"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="effect3_dropShadow_928_111777" result="effect4_dropShadow_928_111777"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect4_dropShadow_928_111777" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.5"/>
<feGaussianBlur stdDeviation="0.25"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect5_innerShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="0.5"/>
<feGaussianBlur stdDeviation="0.25"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="effect5_innerShadow_928_111777" result="effect6_innerShadow_928_111777"/>
</filter>
<filter id="filter7_ddi_928_111777" x="449.871" y="367.85" width="308.258" height="324.856" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="9.95902" operator="erode" in="SourceAlpha" result="effect1_dropShadow_928_111777"/>
<feOffset dy="13.2787"/>
<feGaussianBlur stdDeviation="13.2787"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_928_111777"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="1.65984" operator="erode" in="SourceAlpha" result="effect2_dropShadow_928_111777"/>
<feOffset dy="1.65984"/>
<feGaussianBlur stdDeviation="1.65984"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_928_111777" result="effect2_dropShadow_928_111777"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_928_111777" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.829918"/>
<feGaussianBlur stdDeviation="0.414959"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect3_innerShadow_928_111777"/>
</filter>
<filter id="filter8_i_928_111777" x="466.469" y="424.34" width="275.062" height="238.49" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.829918"/>
<feGaussianBlur stdDeviation="0.414959"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_928_111777"/>
</filter>
<filter id="filter9_f_928_111777" x="185" y="-267" width="578.661" height="506.051" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="50" result="effect1_foregroundBlur_928_111777"/>
</filter>
<linearGradient id="paint0_linear_928_111777" x1="438.5" y1="269.799" x2="422.5" y2="270.299" gradientUnits="userSpaceOnUse">
<stop stopColor="#292929" stopOpacity="0"/>
<stop offset="0.01" stopColor="#292929"/>
<stop offset="1" stopColor="#8F8F8F" stopOpacity="0"/>
</linearGradient>
<linearGradient id="paint1_linear_928_111777" x1="496" y1="270.299" x2="467.5" y2="270.299" gradientUnits="userSpaceOnUse">
<stop stopColor="#292929" stopOpacity="0"/>
<stop offset="0.01" stopColor="#292929"/>
<stop offset="1" stopColor="#8F8F8F" stopOpacity="0"/>
</linearGradient>
<linearGradient id="paint2_linear_928_111777" x1="401.5" y1="343.799" x2="369.204" y2="343.799" gradientUnits="userSpaceOnUse">
<stop stopColor="#292929" stopOpacity="0"/>
<stop offset="0.01" stopColor="#292929"/>
<stop offset="1" stopColor="#8F8F8F" stopOpacity="0"/>
</linearGradient>
<linearGradient id="paint3_linear_928_111777" x1="438.5" y1="269.799" x2="422.5" y2="270.299" gradientUnits="userSpaceOnUse">
<stop stopColor="#292929" stopOpacity="0"/>
<stop offset="0.01" stopColor="#292929"/>
<stop offset="1" stopColor="#8F8F8F" stopOpacity="0"/>
</linearGradient>
<linearGradient id="paint4_linear_928_111777" x1="496" y1="270.299" x2="467.5" y2="270.299" gradientUnits="userSpaceOnUse">
<stop stopColor="#292929" stopOpacity="0"/>
<stop offset="0.01" stopColor="#292929"/>
<stop offset="1" stopColor="#8F8F8F" stopOpacity="0"/>
</linearGradient>
<linearGradient id="paint5_linear_928_111777" x1="401.5" y1="343.799" x2="369.204" y2="343.799" gradientUnits="userSpaceOnUse">
<stop stopColor="#292929" stopOpacity="0"/>
<stop offset="0.01" stopColor="#292929"/>
<stop offset="1" stopColor="#8F8F8F" stopOpacity="0"/>
</linearGradient>
<linearGradient id="paint6_linear_928_111777" x1="345.553" y1="343.799" x2="305.385" y2="343.799" gradientUnits="userSpaceOnUse">
<stop stopColor="#292929" stopOpacity="0"/>
<stop offset="0.01" stopColor="#292929"/>
<stop offset="1" stopColor="#8F8F8F" stopOpacity="0"/>
</linearGradient>
<linearGradient id="paint7_linear_928_111777" x1="0" y1="397.5" x2="289" y2="397.5" gradientUnits="userSpaceOnUse">
<stop stopColor="#FAFAFA" stopOpacity="0"/>
<stop offset="0.660644" stopColor="#FAFAFA"/>
</linearGradient>
<linearGradient id="paint8_linear_928_111777" x1="358.014" y1="303.204" x2="558.014" y2="303.204" gradientUnits="userSpaceOnUse">
<stop stopColor="#FAFAFA" stopOpacity="0.8"/>
<stop offset="0.660644" stopColor="#FAFAFA"/>
</linearGradient>
<clipPath id="clip0_928_111777">
<rect width="809" height="692" fill="white"/>
</clipPath>
<clipPath id="clip1_928_111777">
<rect width="20" height="20" fill="white" transform="translate(70 537.799)"/>
</clipPath>
<clipPath id="clip2_928_111777">
<rect x="59" y="183.701" width="290" height="306.598" rx="9.95902" fill="white"/>
</clipPath>
<clipPath id="clip3_928_111777">
<rect x="66.4692" y="191.17" width="275.061" height="291.66" rx="3.31967" fill="white"/>
</clipPath>
<clipPath id="clip4_928_111777">
<rect width="20" height="20" fill="white" transform="translate(83.2993 209)"/>
</clipPath>
<clipPath id="clip5_928_111777">
<rect width="20" height="20" fill="white" transform="translate(83.2993 308)"/>
</clipPath>
<clipPath id="clip6_928_111777">
<rect width="20" height="20" fill="white" transform="translate(83.2993 352)"/>
</clipPath>
<clipPath id="clip7_928_111777">
<rect width="20" height="20" fill="white" transform="translate(83.2993 396)"/>
</clipPath>
<clipPath id="clip8_928_111777">
<rect width="20" height="20" fill="white" transform="translate(83.2993 440)"/>
</clipPath>
<clipPath id="clip9_928_111777">
<rect width="20" height="20" fill="white" transform="translate(304.701 440)"/>
</clipPath>
<clipPath id="clip10_928_111777">
<path d="M459 30.959C459 25.4588 463.459 21 468.959 21H739.041C744.541 21 749 25.4588 749 30.959V317.639C749 323.14 744.541 327.598 739.041 327.598H468.959C463.459 327.598 459 323.14 459 317.639V30.959Z" fill="white"/>
</clipPath>
<clipPath id="clip11_928_111777">
<rect x="466.469" y="28.4692" width="275.061" height="291.66" rx="3.31967" fill="white"/>
</clipPath>
<clipPath id="clip12_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 46.2991)"/>
</clipPath>
<clipPath id="clip13_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 145.299)"/>
</clipPath>
<clipPath id="clip14_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 189.299)"/>
</clipPath>
<clipPath id="clip15_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 233.299)"/>
</clipPath>
<clipPath id="clip16_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 277.299)"/>
</clipPath>
<clipPath id="clip17_928_111777">
<rect width="20" height="20" fill="white" transform="translate(704.7 277.299)"/>
</clipPath>
<clipPath id="clip18_928_111777">
<path d="M459 373.66C459 368.159 463.459 363.701 468.959 363.701H739.041C744.541 363.701 749 368.159 749 373.66V660.34C749 665.84 744.541 670.299 739.041 670.299H468.959C463.459 670.299 459 665.84 459 660.34V373.66Z" fill="white"/>
</clipPath>
<clipPath id="clip19_928_111777">
<rect x="466.469" y="371.17" width="275.061" height="291.66" rx="3.31967" fill="white"/>
</clipPath>
<clipPath id="clip20_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 389)"/>
</clipPath>
<clipPath id="clip21_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 488)"/>
</clipPath>
<clipPath id="clip22_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 532)"/>
</clipPath>
<clipPath id="clip23_928_111777">
<rect width="20" height="20" fill="white" transform="translate(483.299 576)"/>
</clipPath>
</defs>
</svg>
  );
}
