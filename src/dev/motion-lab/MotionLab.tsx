/**
 * Beam Motion Lab — DEV ONLY.
 *
 * An isolated harness for inspecting Beam's production key visuals without
 * scrolling the whole homepage. It is a tool, not part of Beam's design; the UI
 * is intentionally plain.
 *
 * Rules this file exists to respect:
 *  - It imports REAL production components. Nothing is duplicated or forked.
 *  - Production code never imports anything from `src/dev`.
 *  - It changes no production choreography, timing, or easing.
 *  - It is unreachable in a production build (see src/App.tsx).
 *
 * Future DialKit: a tuning panel would mount alongside the toolbar here and
 * drive production animation parameters via props/CSS variables. It is not
 * installed and no tuning parameters exist yet.
 */
import { useEffect, useState } from 'react';
// DialKit is DEV-ONLY authoring tooling. It is imported here, inside src/dev,
// and never from any production component. Styles come in through this path
// only, so nothing DialKit-related reaches the production bundle.
import { DialRoot, DialTimeline } from 'dialkit';
import 'dialkit/styles.css';
import styles from './MotionLab.module.css';
import { IsolatedHarness } from './harnesses/IsolatedHarness';
import { ScrollFrame } from './harnesses/ScrollFrame';
import { ScrollHarness } from './harnesses/ScrollHarness';
import { ReducedMotionStatus } from './components/ReducedMotionStatus';
import { HERO_EXCLUSION_REASON, findEntry, labGroups } from './registry';

type ViewportPreset = 'desktop' | 'tablet' | 'mobile' | 'fluid';

/*
 * Presets carry a height as well as a width. Isolated visuals use only the width
 * (their production parent width caps it). Scroll entries use both: the pair is
 * the LOGICAL VIEWPORT of the iframe the real section runs in, so `innerWidth`,
 * matchMedia and `svh` inside it are real. Desktop is 1440×900 — the founder's
 * homepage reference: at lg padding that yields the 1178px content column.
 * Fluid = the actual browser window.
 */
const VIEWPORTS: {
  id: ViewportPreset;
  label: string;
  width: number | null;
  height: number | null;
}[] = [
  { id: 'desktop', label: 'Desktop 1440', width: 1440, height: 900 },
  { id: 'tablet', label: 'Tablet 834', width: 834, height: 1112 },
  { id: 'mobile', label: 'Mobile 390', width: 390, height: 844 },
  { id: 'fluid', label: 'Fluid', width: null, height: null },
];

/**
 * Problem / Solution content-column geometry, mirrored from the production
 * section (`px-5 sm:px-8 md:px-16 lg:px-[131px]`, `max-w-[1178px]`). Dev-only
 * readout so the founder can see at a glance whether the scroll preview's
 * logical viewport is in the same container-query state as the homepage. Numbers are
 * read from production classes, not invented.
 */
const SOLUTION_DESKTOP_QUERY_PX = 900;
const SOLUTION_CONTENT_MAX_PX = 1178;

function solutionContentWidth(windowWidth: number) {
  const padding =
    windowWidth >= 1024 ? 131 : windowWidth >= 768 ? 64 : windowWidth >= 640 ? 32 : 20;
  return Math.max(0, Math.min(SOLUTION_CONTENT_MAX_PX, windowWidth - padding * 2));
}

function useWindowSize() {
  const read = () =>
    typeof window === 'undefined'
      ? { width: 0, height: 0 }
      : { width: window.innerWidth, height: window.innerHeight };
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/** `?frame=1` — this document is the inner logical viewport of a scroll entry. */
function isFrameDocument() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('frame') === '1';
}

function initialEntryId() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('entry');
}

export default function MotionLab() {
  const [entryId, setEntryId] = useState<string | null>(initialEntryId);
  const [viewport, setViewport] = useState<ViewportPreset>('desktop');
  const [replayKey, setReplayKey] = useState(0);
  const [progress, setProgress] = useState(0);

  const entry = findEntry(entryId);
  const windowSize = useWindowSize();
  const width = VIEWPORTS.find((v) => v.id === viewport)?.width ?? null;

  const selectEntry = (id: string) => {
    setEntryId(id);
    setReplayKey((n) => n + 1);
    setProgress(0);
    const url = new URL(window.location.href);
    url.searchParams.set('entry', id);
    window.history.replaceState(null, '', url);
  };

  const isScroll = entry.kind === 'scroll';
  const preset = VIEWPORTS.find((v) => v.id === viewport);
  const logicalViewport = {
    width: preset?.width ?? windowSize.width,
    height: preset?.height ?? windowSize.height,
  };
  const scrollContentWidth = solutionContentWidth(logicalViewport.width);

  // Inner document of a scroll entry: only the real section, no lab chrome, so
  // the section's window IS the logical viewport. See ScrollHarness.
  if (isFrameDocument()) {
    return <ScrollFrame>{entry.render({ progress: 0 })}</ScrollFrame>;
  }

  return (
    <div className={styles.lab}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <strong>Beam Motion Lab</strong>
          <span className={styles.devBadge}>dev only</span>
        </div>

        <nav className={styles.nav}>
          {labGroups.map((group) => (
            <div key={group.section} className={styles.navGroup}>
              <div className={styles.navGroupTitle}>{group.section}</div>
              {group.entries.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectEntry(item.id)}
                  aria-current={item.id === entry.id}
                  className={`${styles.navItem} ${item.id === entry.id ? styles.navItemActive : ''}`}
                >
                  {item.label}
                  {item.kind === 'scroll' && <span className={styles.tag}>scroll</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <p className={styles.sidebarNote}>{HERO_EXCLUSION_REASON}</p>
      </aside>

      <main className={styles.main}>
        <header className={styles.toolbar}>
          <div className={styles.meta}>
            <div className={styles.metaTitle}>
              {entry.section} — <span className={styles.mono}>{entry.componentName}</span>
            </div>
            <div className={styles.metaPath}>{entry.path}</div>
          </div>

          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Viewport</span>
              {VIEWPORTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewport(v.id)}
                  className={`${styles.chip} ${viewport === v.id ? styles.chipActive : ''}`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={styles.replay}
              onClick={() => setReplayKey((n) => n + 1)}
            >
              Replay (remount)
            </button>
          </div>
        </header>

        {entry.notes && <p className={styles.notes}>{entry.notes}</p>}

        {!isScroll && (
          <p className={styles.presetNote}>
            Viewport presets are a <strong>visual container preview</strong> — they set the preview
            canvas width only. They are <strong>not</strong> true breakpoint behaviour: media
            queries, <span className={styles.mono}>matchMedia</span> and{' '}
            <span className={styles.mono}>svh</span> still follow the real browser window. Resize
            the browser to test breakpoints.
            {entry.intrinsicWidth
              ? ` Desktop preview is capped at ${entry.intrinsicWidth}px to match this visual's production parent width.`
              : ''}{' '}
            When the canvas is wider than this column it is <strong>visually scaled down</strong> to
            fit — the layout, container queries and <span className={styles.mono}>cqw</span> still
            resolve at the logical width shown under the stage. Nothing is cropped or scrolled
            sideways.
          </p>
        )}

        {isScroll && (
          <p className={styles.presetNote}>
            Viewport presets are <strong>real</strong> here: the section runs inside an iframe
            sized to the logical viewport, so <span className={styles.mono}>innerWidth</span>,
            matchMedia, <span className={styles.mono}>svh</span> and the ScrollTrigger pin all
            resolve at that size. The iframe element is then visually scaled to fit this column —
            the section itself is never transformed. Right now:{' '}
            <span className={styles.mono}>
              {logicalViewport.width}×{logicalViewport.height}px
            </span>{' '}
            viewport → <span className={styles.mono}>{scrollContentWidth}px</span> content column →{' '}
            {scrollContentWidth >= SOLUTION_DESKTOP_QUERY_PX ? (
              <strong>desktop composition</strong>
            ) : (
              <strong>
                narrow composition (desktop needs a ≥ {SOLUTION_DESKTOP_QUERY_PX + 262}px viewport)
              </strong>
            )}
            .
          </p>
        )}

        <ReducedMotionStatus />

        {entry.hasProgress && !isScroll && (
          <div className={styles.progressRow}>
            <label htmlFor="ml-progress" className={styles.controlLabel}>
              progress prop
            </label>
            <input
              id="ml-progress"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              className={styles.range}
            />
            <span className={styles.mono}>{progress.toFixed(2)}</span>
            <span className={styles.statusHint}>
              Drives the component's existing production prop. Not a tuning parameter.
            </span>
          </div>
        )}

        {/* Authoring workspace: preview centre, DialKit parameter panel right. */}
        <div className={styles.workspace}>
          <div className={styles.previewColumn}>
            {isScroll ? (
              <ScrollHarness
                replayKey={replayKey}
                entryId={entry.id}
                viewport={logicalViewport}
              />
            ) : (
              <IsolatedHarness
                replayKey={replayKey}
                width={width}
                intrinsicWidth={entry.intrinsicWidth}
                sizing={entry.sizing}
                stage={entry.stage}
                aspect={entry.aspect}
              >
                {entry.render({ progress })}
              </IsolatedHarness>
            )}
          </div>

          <aside className={styles.panelColumn}>
            <div className={styles.panelHeading}>DialKit parameters</div>
            {/* Inline mode renders the panel in place rather than as a popover. */}
            <DialRoot mode="inline" theme="light" />
            {!entry.timelineId && (
              <p className={styles.panelEmpty}>
                No timeline is wired for this section yet. Panels and timelines are authored
                per section after its motion brief — there is no global Beam timeline.
              </p>
            )}
          </aside>
        </div>
      </main>

      {/* Bottom scrubbable timeline dock. Mounted once for the whole lab. */}
      <DialTimeline theme="light" defaultVisible defaultOpen />
    </div>
  );
}
