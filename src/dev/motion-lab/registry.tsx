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

export type HarnessKind = 'isolated' | 'scroll';
export type StageTheme = 'light' | 'dark';

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
  /** CSS aspect-ratio for the stage box, matching the homepage usage. */
  aspect?: string;
  /** Whether this entry drives a production `progress` prop. */
  hasProgress?: boolean;
  notes?: string;
  render: (args: EntryRenderArgs) => ReactNode;
};

export type LabGroup = {
  section: string;
  entries: LabEntry[];
};

const entries: LabEntry[] = [
  {
    id: 'problem-solution-visual',
    section: 'Problem / Solution',
    label: 'Solution visual (isolated)',
    componentName: 'SolutionVisual',
    path: 'src/components/visuals/solution/SolutionVisual.tsx',
    kind: 'isolated',
    aspect: '1178 / 350',
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
    notes:
      'The real production section, including its GSAP ScrollTrigger pin, scrub and snap. Driven by real window scroll.',
    render: () => <ProblemSolution />,
  },
  {
    id: 'sync',
    section: 'Sync',
    label: 'Sync visual',
    componentName: 'SyncVisual',
    path: 'src/components/visuals/sync/SyncVisual.tsx',
    kind: 'isolated',
    aspect: '809 / 692',
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
