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
import { useState } from 'react';
// DialKit is DEV-ONLY authoring tooling. It is imported here, inside src/dev,
// and never from any production component. Styles come in through this path
// only, so nothing DialKit-related reaches the production bundle.
import { DialRoot, DialTimeline } from 'dialkit';
import 'dialkit/styles.css';
import styles from './MotionLab.module.css';
import { IsolatedHarness } from './harnesses/IsolatedHarness';
import { ScrollHarness } from './harnesses/ScrollHarness';
import { ReducedMotionStatus } from './components/ReducedMotionStatus';
import { HERO_EXCLUSION_REASON, findEntry, labGroups } from './registry';

type ViewportPreset = 'desktop' | 'tablet' | 'mobile' | 'fluid';

const VIEWPORTS: { id: ViewportPreset; label: string; width: number | null }[] = [
  { id: 'desktop', label: 'Desktop 1280', width: 1280 },
  { id: 'tablet', label: 'Tablet 834', width: 834 },
  { id: 'mobile', label: 'Mobile 390', width: 390 },
  { id: 'fluid', label: 'Fluid', width: null },
];

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
  const widthPresetIsMisleading = isScroll && viewport !== 'fluid';

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
              : ''}
          </p>
        )}

        {widthPresetIsMisleading && (
          <p className={styles.warning}>
            Width preset is cosmetic here. This section reads{' '}
            <span className={styles.mono}>window.innerWidth</span> and matchMedia, so its real
            breakpoint behaviour follows the browser window — not this container. Resize the actual
            browser window (or use device emulation) to test breakpoints.
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
              <ScrollHarness replayKey={replayKey}>{entry.render({ progress })}</ScrollHarness>
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
