/**
 * Motion Lab registry — DEV ONLY.
 *
 * Every entry renders a REAL production component. Nothing here is a copy,
 * fork, or approximation of a production visual. If a production visual
 * changes, this lab changes with it.
 *
 * Dependency direction is one-way:
 *   src/dev/**  ->  src/components/**   (allowed)
 *   src/components/**  ->  src/dev/**   (never)
 */
import type { ReactNode } from 'react';

// Production components — imported directly, never duplicated.
import ProblemSolution from '../../components/sections/ProblemSolution';
import OnDemand from '../../components/sections/OnDemand';
import { SolutionVisual } from '../../components/visuals/solution/SolutionVisual';
import { SyncVisual } from '../../components/visuals/sync/SyncVisual';
import { OnDemandVisual } from '../../components/visuals/on-demand/OnDemandVisual';
import { OnDemandVisual2 } from '../../components/visuals/on-demand/OnDemandVisual2';
import { OnDemandVisual3 } from '../../components/visuals/on-demand/OnDemandVisual3';
import { AgentVisual } from '../../components/visuals/agents/AgentVisual';
import { ShareVisual } from '../../components/visuals/share/ShareVisual';
import { SecretVisual } from '../../components/visuals/secrets/SecretVisual';
import { FooterVisual } from '../../components/visuals/footer/FooterVisual';

// Lab-only. Not a production component.
import { DialKitProof } from './proof/DialKitProof';

export type HarnessKind = 'isolated' | 'scroll' | 'proof';
export type StageTheme = 'light' | 'dark';

/**
 * How the production homepage sizes this visual — mirrored, not invented.
 *
 * 'fill'      — production wraps it in an aspect box with
 *               `[&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full`
 *               (Agents, Share & Host, Secrets, On-Demand). The harness applies
 *               the same fill rules so the lab matches.
 * 'intrinsic' — production gives it no wrapper; the component sizes itself
 *               (SolutionVisual via container-type + aspect-ratio, SyncVisual
 *               via its own viewBox). The harness must NOT force width/height,
 *               or nested icon SVGs get stretched and card text clips.
 */
export type SizingMode = 'fill' | 'intrinsic';

export type EntryRenderArgs = {
  /** 0..1 — only used by entries that expose a production progress prop. */
  progress: number;
};

export type LabEntry = {
  id: string;
  /** Beam section this belongs to, as named in ANIMATION_RULES.md. */
  section: string;
  /** Short label for the nav. */
  label: string;
  /** The production component being rendered. */
  componentName: string;
  /** Path to the production source file. */
  path: string;
  kind: HarnessKind;
  stage?: StageTheme;
  /** Mirrors how production sizes this visual. Defaults to 'intrinsic'. */
  sizing?: SizingMode;
  /**
   * The width of this visual's parent in the production homepage, so the
   * desktop preview reproduces the real composition rather than whatever width
   * happens to be left over beside the DialKit panel.
   */
  intrinsicWidth?: number;
  /** CSS aspect-ratio for the stage box — only meaningful for 'fill' sizing. */
  aspect?: string;
  /** Whether this entry drives a production `progress` prop. */
  hasProgress?: boolean;
  /**
   * Per-section DialKit timeline id.
   *
   * Architecture note: each visual/section gets its OWN timeline — there is
   * deliberately no single global Beam timeline. When a section's motion brief
   * is agreed, its timeline is authored in its own lab-side component and
   * registered here. None exist yet; only the DialKit proof uses a timeline.
   */
  timelineId?: string;
  notes?: string;
  render: (args: EntryRenderArgs) => ReactNode;
};

export type LabGroup = {
  section: string;
  entries: LabEntry[];
};

const entries: LabEntry[] = [
  {
    id: 'dialkit-proof',
    section: 'Dev · DialKit',
    label: 'DialKit proof (lab only)',
    componentName: 'DialKitProof',
    path: 'src/dev/motion-lab/proof/DialKitProof.tsx',
    kind: 'proof',
    timelineId: 'beam-motion-lab-proof-v1',
    notes:
      'Lab-only test shape verifying DialKit wiring. Panel: slider, folder, spring. Timeline: 3 named clips (enter / settle / exit). Touches no production component.',
    render: () => <DialKitProof />,
  },
  {
    id: 'problem-solution-visual',
    section: 'Problem / Solution',
    label: 'Solution visual (isolated)',
    componentName: 'SolutionVisual',
    path: 'src/components/visuals/solution/SolutionVisual.tsx',
    kind: 'isolated',
    sizing: 'intrinsic',
    intrinsicWidth: 1178,
    hasProgress: true,
    notes:
      'Driven by the production `progress` prop (0..1), the same API ProblemSolution drives from ScrollTrigger. Includes the connectorFlow connector.',
    render: ({ progress }) => <SolutionVisual progress={progress} />,
  },
  {
    id: 'problem-solution-scroll',
    section: 'Problem / Solution',
    label: 'Full section (real scroll)',
    componentName: 'ProblemSolution',
    path: 'src/components/sections/ProblemSolution.tsx',
    kind: 'scroll',
    /*
     * Scroll entries run inside an iframe sized to the preset's logical viewport
     * and the iframe is scaled to fit the centre column. Desktop 1440×900 gives
     * the 1178px content column that SolutionVisual's `@container (min-width:
     * 900px)` desktop geometry needs. Transform-scaling the pinned section in
     * place would break the ScrollTrigger pin — see ScrollHarness.
     */
    notes:
      'The real production section, including its GSAP ScrollTrigger pin and scrub, driven by real window scroll inside a logical desktop viewport. The viewport is scaled to fit the stage; the section itself is never transformed. Scroll with the pointer over the stage.',
    render: () => <ProblemSolution />,
  },
  {
    id: 'sync',
    section: 'Sync',
    label: 'Sync visual',
    componentName: 'SyncVisual',
    path: 'src/components/visuals/sync/SyncVisual.tsx',
    kind: 'isolated',
    sizing: 'intrinsic',
    intrinsicWidth: 809,
    notes:
      'Intro plays once on first intersection, then parks. Hover (mouse) loops; Enter/Space replays. Use Replay to remount and re-watch the intro.',
    render: () => <SyncVisual />,
  },
  {
    id: 'on-demand-1',
    section: 'On-Demand',
    label: '1 — Everything appears instantly',
    componentName: 'OnDemandVisual',
    path: 'src/components/visuals/on-demand/OnDemandVisual.tsx',
    kind: 'isolated',
    sizing: 'fill',
    intrinsicWidth: 809,
    aspect: '809 / 692',
    render: () => <OnDemandVisual />,
  },
  {
    id: 'on-demand-2',
    section: 'On-Demand',
    label: '2 — Contents load on demand',
    componentName: 'OnDemandVisual2',
    path: 'src/components/visuals/on-demand/OnDemandVisual2.tsx',
    kind: 'isolated',
    sizing: 'fill',
    intrinsicWidth: 809,
    aspect: '809 / 692',
    render: () => <OnDemandVisual2 />,
  },
  {
    id: 'on-demand-3',
    section: 'On-Demand',
    label: '3 — Built for huge repos',
    componentName: 'OnDemandVisual3',
    path: 'src/components/visuals/on-demand/OnDemandVisual3.tsx',
    kind: 'isolated',
    sizing: 'fill',
    intrinsicWidth: 809,
    aspect: '809 / 692',
    notes:
      'The count/ready sequence Steve flagged. Count completes ~2.02s, ready group enters at 2.9s.',
    render: () => <OnDemandVisual3 />,
  },
  {
    id: 'on-demand-scroll',
    section: 'On-Demand',
    label: 'Full section (real scroll)',
    componentName: 'OnDemand',
    path: 'src/components/sections/OnDemand.tsx',
    kind: 'scroll',
    notes:
      'The real production section, including its ScrollTrigger pin and the AnimatePresence swap between the three visuals.',
    render: () => <OnDemand />,
  },
  {
    id: 'agents',
    section: 'Agents',
    label: 'Agent visual',
    componentName: 'AgentVisual',
    path: 'src/components/visuals/agents/AgentVisual.tsx',
    kind: 'isolated',
    sizing: 'fill',
    intrinsicWidth: 809,
    aspect: '809 / 692',
    notes:
      'Plays a half cycle (5200ms) on first intersection, then parks. Hover (non-touch) plays one full 10400ms replay.',
    render: () => <AgentVisual />,
  },
  {
    id: 'share',
    section: 'Share & Host',
    label: 'Share visual',
    componentName: 'ShareVisual',
    path: 'src/components/visuals/share/ShareVisual.tsx',
    kind: 'isolated',
    sizing: 'fill',
    intrinsicWidth: 809,
    aspect: '809 / 692',
    notes: '12s cycle. Hover replay aligns to cycle boundaries.',
    render: () => <ShareVisual />,
  },
  {
    id: 'secrets',
    section: 'Secrets',
    label: 'Secret visual',
    componentName: 'SecretVisual',
    path: 'src/components/visuals/secrets/SecretVisual.tsx',
    kind: 'isolated',
    sizing: 'fill',
    intrinsicWidth: 1178,
    aspect: '1178 / 484',
    notes: '10s cycle, including the steps() terminal typing.',
    render: () => <SecretVisual />,
  },
  {
    id: 'footer',
    section: 'Footer',
    label: 'Footer visual',
    componentName: 'FooterVisual',
    path: 'src/components/visuals/footer/FooterVisual.tsx',
    kind: 'isolated',
    sizing: 'intrinsic',
    stage: 'dark',
    notes:
      'Rendered on the production footer background (#292929). Hover the centre to trigger the pulse; touch uses pointerup with a ~2600ms auto-reset.',
    render: () => <FooterVisual />,
  },
];

export const labEntries = entries;

export const labGroups: LabGroup[] = entries.reduce<LabGroup[]>((groups, entry) => {
  const existing = groups.find((group) => group.section === entry.section);
  if (existing) existing.entries.push(entry);
  else groups.push({ section: entry.section, entries: [entry] });
  return groups;
}, []);

export function findEntry(id: string | null): LabEntry {
  return entries.find((entry) => entry.id === id) ?? entries[0];
}

/**
 * Hero is deliberately absent.
 *
 * HeroVisual mounts HeroWorkspaceDemo, which persists to the shared
 * `beam-website-hero-demo-metadata-v1` localStorage key and to the
 * `beam-website-hero-demo-storage` IndexedDB database. Rendering it here would
 * read and write the same records the homepage demo uses, so lab activity would
 * leak into the real Hero state. That fails the "isolated cleanly without
 * disturbing its product-state/storage logic" bar, so it is left out until we
 * decide how to namespace that storage.
 */
export const HERO_EXCLUSION_REASON =
  'Hero is excluded: HeroWorkspaceDemo shares localStorage + IndexedDB with the homepage demo, so it cannot be isolated without leaking state.';
