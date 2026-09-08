/**
 * Hero reveal tuning promotion — DEV ONLY.
 *
 * Pure helpers behind the Motion Lab's promotion panel: compare the tuning the
 * lab currently holds against the CHECKED-IN production defaults, and
 * serialise a snapshot for review.
 *
 * Nothing in this module writes anywhere. Promotion is a three-step workflow
 * and only the first two are automated:
 *
 *   1. Motion Lab holds the live tuning (localStorage, this browser only).
 *   2. The panel diffs it against `HERO_REVEAL_DEFAULTS` and
 *      `HERO_RESPONSIVE_DEFAULTS`, and can copy the snapshot or save it to
 *      the repo as src/dev/motion-lab/tuning/snapshots/hero-reveal.snapshot.json
 *      through the dev server (see vite-plugins/heroRevealSnapshot.mjs).
 *   3. After review, the approved values are BAKED by editing the defaults in
 *      heroRevealTimeline.ts / heroRevealComposition.ts and committing. That
 *      is deliberately a source edit — production never reads a snapshot,
 *      localStorage, or anything under src/dev.
 */
import {
  HERO_REVEAL_DEFAULTS,
  type HeroRevealTuning,
} from '../../../components/visuals/hero/reveal/heroRevealTimeline';
import {
  HERO_BREAKPOINT_KEYS,
  HERO_RESPONSIVE_DEFAULTS,
  type HeroBreakpoint,
  type HeroResponsiveTuning,
} from '../../../components/visuals/hero/reveal/heroRevealComposition';
import {
  heroBreakpointKeys,
  sameHeroResponsive,
  sameHeroTuning,
  sanitizeHeroResponsive,
  sanitizeHeroTuning,
  type HeroTuningSnapshot,
} from './heroRevealTuningStore';

export type HeroTuningValue = number | string;

export type HeroTuningRow = {
  key: string;
  /** The value production ships today — the checked-in default. */
  shipped: HeroTuningValue;
  /** The value the lab currently holds. */
  live: HeroTuningValue;
  changed: boolean;
};

export type HeroTuningComparison = {
  base: HeroTuningRow[];
  bands: Record<HeroBreakpoint, HeroTuningRow[]>;
  /** Total number of values that differ from the checked-in defaults. */
  changes: number;
};

const row = (key: string, shipped: HeroTuningValue, live: HeroTuningValue): HeroTuningRow => ({
  key,
  shipped,
  live,
  changed: shipped !== live,
});

/** Every tunable value, shipped next to live, in panel order. */
export function compareHeroTuning(snapshot: HeroTuningSnapshot): HeroTuningComparison {
  const shippedBase = HERO_REVEAL_DEFAULTS as unknown as Record<string, HeroTuningValue>;
  const liveBase = snapshot.base as unknown as Record<string, HeroTuningValue>;
  const base = Object.keys(HERO_REVEAL_DEFAULTS).map((key) =>
    row(key, shippedBase[key], liveBase[key]),
  );

  const bands = {} as Record<HeroBreakpoint, HeroTuningRow[]>;
  for (const bp of HERO_BREAKPOINT_KEYS) {
    const shipped = HERO_RESPONSIVE_DEFAULTS[bp] as unknown as Record<string, number>;
    const live = snapshot.responsive[bp] as unknown as Record<string, number>;
    bands[bp] = heroBreakpointKeys(bp).map((key) => row(key, shipped[key], live[key]));
  }

  const changes =
    base.filter((r) => r.changed).length +
    HERO_BREAKPOINT_KEYS.reduce((n, bp) => n + bands[bp].filter((r) => r.changed).length, 0);

  return { base, bands, changes };
}

/** "desktop.stackTargetX"-style keys for every changed value. */
export function changedHeroKeys(comparison: HeroTuningComparison): string[] {
  const keys = comparison.base.filter((r) => r.changed).map((r) => `base.${r.key}`);
  for (const bp of HERO_BREAKPOINT_KEYS) {
    keys.push(...comparison.bands[bp].filter((r) => r.changed).map((r) => `${bp}.${r.key}`));
  }
  return keys;
}

export const HERO_SNAPSHOT_VERSION = 1 as const;
/** Mirrors vite-plugins/heroRevealSnapshot.mjs; restated so the lab has no server import. */
export const HERO_SNAPSHOT_ROUTE = '/__beam/hero-reveal-snapshot';
export const HERO_SNAPSHOT_FILE = 'src/dev/motion-lab/tuning/snapshots/hero-reveal.snapshot.json';

export type HeroTuningSnapshotFile = {
  version: typeof HERO_SNAPSHOT_VERSION;
  savedAt: string;
  source: 'motion-lab';
  /** Which values differed from the checked-in defaults WHEN SAVED. */
  changedKeys: string[];
  base: HeroRevealTuning;
  responsive: HeroResponsiveTuning;
};

/** The reviewable artefact: the full tuning plus what it changes. */
export function buildHeroSnapshotFile(
  snapshot: HeroTuningSnapshot,
  now: Date = new Date(),
): HeroTuningSnapshotFile {
  return {
    version: HERO_SNAPSHOT_VERSION,
    savedAt: now.toISOString(),
    source: 'motion-lab',
    changedKeys: changedHeroKeys(compareHeroTuning(snapshot)),
    base: { ...snapshot.base },
    responsive: {
      desktop: { ...snapshot.responsive.desktop },
      tablet: { ...snapshot.responsive.tablet },
      mobile: { ...snapshot.responsive.mobile },
    },
  };
}

/**
 * Coerce a saved file back into a snapshot. Goes through the same sanitisers
 * as storage, so a hand-edited or stale file can never carry an illegal value.
 */
export function snapshotFromFile(file: unknown): HeroTuningSnapshot | null {
  if (!file || typeof file !== 'object') return null;
  const src = file as Record<string, unknown>;
  if (!src.base || !src.responsive) return null;
  return {
    base: sanitizeHeroTuning(src.base).state,
    responsive: sanitizeHeroResponsive(src.responsive).state,
  };
}

export function sameHeroSnapshot(a: HeroTuningSnapshot, b: HeroTuningSnapshot) {
  return sameHeroTuning(a.base, b.base) && sameHeroResponsive(a.responsive, b.responsive);
}

const fmt = (v: HeroTuningValue) => (typeof v === 'string' ? `'${v}'` : String(v));

/**
 * Plain-text diff, one line per changed value: `key: shipped -> live`.
 * Grouped the way the defaults are grouped in source, so each line says
 * where the bake has to happen.
 */
export function formatHeroTuningDiff(comparison: HeroTuningComparison): string {
  const lines: string[] = [];
  lines.push(
    `Hero reveal tuning — live vs checked-in defaults (${comparison.changes} ${
      comparison.changes === 1 ? 'difference' : 'differences'
    })`,
  );
  const section = (title: string, where: string, rows: HeroTuningRow[]) => {
    const changed = rows.filter((r) => r.changed);
    lines.push('', `${title}  [${where}]`);
    if (!changed.length) {
      lines.push('  matches checked-in defaults');
      return;
    }
    for (const r of changed) lines.push(`  ${r.key}: ${fmt(r.shipped)} -> ${fmt(r.live)}`);
  };
  section('base timeline', 'HERO_REVEAL_DEFAULTS · heroRevealTimeline.ts', comparison.base);
  section('desktop', 'HERO_RESPONSIVE_DEFAULTS.desktop · heroRevealComposition.ts', comparison.bands.desktop);
  section('tablet', 'HERO_RESPONSIVE_DEFAULTS.tablet · heroRevealComposition.ts', comparison.bands.tablet);
  section('mobile', 'HERO_RESPONSIVE_DEFAULTS.mobile · heroRevealComposition.ts', comparison.bands.mobile);
  return lines.join('\n');
}
