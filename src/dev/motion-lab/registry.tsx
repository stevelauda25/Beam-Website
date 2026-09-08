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
import { OnDemandVisual } from '../../components/visuals/on-demand/OnDemandVisual';
import { OnDemandVisual2 } from '../../components/visuals/on-demand/OnDemandVisual2';
import { OnDemandVisual3 } from '../../components/visuals/on-demand/OnDemandVisual3';
import { ShareVisual } from '../../components/visuals/share/ShareVisual';
import { SecretVisual } from '../../components/visuals/secrets/SecretVisual';
import { FooterVisual } from '../../components/visuals/footer/FooterVisual';

// Lab-only harness UI. The scenes it shows are production components.
import { HeroRealCondition } from './hero/HeroRealCondition';
import { HeroSceneReview } from './hero/HeroSceneReview';

// Lab-only. Not a production component.
import { DialKitProof } from './proof/DialKitProof';
import { SyncTrailTuning } from './tuning/SyncTrailTuning';
import { AgentsHoverTuning } from './tuning/AgentsHoverTuning';

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
  /**
   * The LOGICAL viewport width the preview is standing in for — the selected
   * preset, or the real window on "Fluid".
   *
   * Viewport presets only resize the preview container; `window.innerWidth`,
   * media queries and `matchMedia` all still report the real browser window.
   * Any entry whose behaviour is chosen by viewport width (rather than by its
   * own container) must therefore be told the logical width explicitly, or it
   * silently renders its desktop behaviour inside a 390px-wide stage.
   */
  viewportWidth: number;
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
    id: 'hero-scene-review',
    section: 'Hero',
    label: 'Hero — Scene Review',
    componentName: 'HeroRevealScene',
    path: 'src/components/visuals/hero/reveal/HeroRevealScene.tsx',
    kind: 'isolated',
    sizing: 'intrinsic',
    intrinsicWidth: 1440,
    notes:
      "Four states of ONE hero panel: files approach -> drop target armed -> upload in progress -> interactive workspace resolved. The panel is the shipping hero's own geometry (x=132, 1176 x 680.661, inner 1164.56) in every state, so switching states must never move or resize it — the readout under the stage measures the rendered panel per state and flags any drift. Fahmi's frames (Figma section 1008:9872) are the visual source of truth for states 1-3, but their frame widths (1727.731 / 954 / 954) are deliberately NOT carried over; only state 4 was authored at the shipping geometry. Each state lists exactly how it was adapted. State 4 mounts the real HeroWorkspaceDemo. No motion is authored here.",
    render: () => <HeroSceneReview />,
  },
  {
    id: 'hero-real-condition',
    section: 'Hero',
    label: 'Hero — Real Condition',
    componentName: 'HeroRevealSequence',
    path: 'src/components/visuals/hero/reveal/HeroRevealSequence.tsx',
    kind: 'isolated',
    sizing: 'intrinsic',
    intrinsicWidth: 1454,
    notes:
      "The reveal running in the hero's real container, with review controls: Replay, Play/Pause, Restart, a millisecond scrubber and jump-to-beat markers. The sequence is a pure function of time (heroRevealTimeline.sampleHeroReveal), so scrubbing and playback render the identical frame and the sequence is deterministic and repeatable. Sizing comes from the production HeroVisual.module.css and the wrapper mirrors Hero.tsx's key-visual container, so the panel sits where it sits on the homepage. The workspace is mounted throughout and revealed by opacity — no remount, no geometry change at the handoff, and production drag-and-drop is live once visible. Under prefers-reduced-motion the player steps through representative frames and rests on the settled workspace. SHIPPING: since 8a0c8d4 the homepage renders this exact sequence (HeroRevealHero -> HeroRevealSequence) on the checked-in defaults; the lab and the homepage's `?hero=reveal` preview drive the same component from live tuning instead. The Promotion panel under the readout diffs live tuning against those defaults and saves a reviewable snapshot — baking approved values into source is a separate, deliberate edit.",
    render: ({ viewportWidth }) => <HeroRealCondition viewportWidth={viewportWidth} />,
  },
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
      'Intro plays once on first intersection, then parks. Hover (mouse) loops. Four trail dials are wired live: Trail Length, Dot Scale, Glow Intensity and Glow Radius. All four are multipliers over the baked production profile, so 1.00x is what the homepage renders, and Reset to production returns there. Tuning and the Lock Tuning switch persist in localStorage across entry switches, remounts and refreshes; locking removes the four dials from the panel so they cannot be edited. Timing, the 1.8s transaction, connector and direction are fixed and out of reach from the panel.',
    render: () => <SyncTrailTuning />,
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
      'Production intro is unchanged and NOT tunable: a single forward 2300ms story on first intersection, held on the connected result (readable at 1840ms), no teardown half and no loop. Hover (non-touch) rewinds that same timeline, pauses on frame 1, then replays it: Reverse Duration, Start Hold and Replay Duration are tunable live in the DialKit panel. Both directions are scrubbed on ONE master progress (ease-in-out .42, 0, .58, 1) mapped to a single authored time written to all 21 animations; the two durations set how long that traversal takes and the hold is a controller pause, so beats, easings, connector, travel distance and artwork are all out of reach from the panel. Tuning and the Lock Tuning switch persist in localStorage. Beat times are the BEATS map in the component, in ms.',
    render: () => <AgentsHoverTuning />,
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
 * Hero storage caveat.
 *
 * Hero used to be excluded from the lab on the grounds that HeroWorkspaceDemo
 * shares localStorage AND IndexedDB with the homepage demo. Half of that was
 * wrong: the demo uses no localStorage at all (verified — there is not a single
 * reference in src/components/visuals/hero/**). It persists only uploaded file
 * blobs, to the `beam-website-hero-demo-storage` IndexedDB database.
 *
 * So the real caveat is narrow: seeded content is in-memory and cannot be
 * disturbed, and a file a reviewer drops in the lab will also appear in the
 * homepage demo in that same browser. That is a dev-only side effect of a
 * deliberate action, not passive leakage, so Hero is now in the lab.
 */
export const HERO_STORAGE_NOTE =
  'Hero is live in the lab. HeroWorkspaceDemo keeps uploaded files in the shared beam-website-hero-demo-storage IndexedDB database, so a file dropped here also shows up in the homepage demo in this browser. Seeded content is in-memory and is never written.';
