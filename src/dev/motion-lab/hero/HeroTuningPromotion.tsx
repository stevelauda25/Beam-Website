/**
 * Hero reveal — tuning promotion panel. DEV ONLY.
 *
 * Shows the tuning the lab currently holds next to the CHECKED-IN production
 * defaults, per band, and offers three ways to hand it on for review:
 *
 *   Copy snapshot JSON   the full tuning, for pasting into a review
 *   Copy diff            only what differs, grouped by the file it lives in
 *   Save snapshot        writes the JSON into the repo through the dev server
 *                        (src/dev/motion-lab/tuning/snapshots/…)
 *
 * NOTHING HERE WRITES PRODUCTION DEFAULTS. Baking approved values into
 * heroRevealTimeline.ts / heroRevealComposition.ts is a deliberate source edit
 * that follows review of the snapshot. The panel exists so that edit is made
 * from an exact, reviewed record rather than from numbers read off a screen.
 *
 * It is also a READER: it never touches localStorage, DialKit, or the store.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HeroBreakpoint } from '../../../components/visuals/hero/reveal/heroRevealComposition';
import type { HeroTuningSnapshot } from '../tuning/heroRevealTuningStore';
import {
  HERO_SNAPSHOT_FILE,
  HERO_SNAPSHOT_ROUTE,
  buildHeroSnapshotFile,
  compareHeroTuning,
  formatHeroTuningDiff,
  sameHeroSnapshot,
  snapshotFromFile,
  type HeroTuningRow,
  type HeroTuningSnapshotFile,
} from '../tuning/heroRevealPromotion';
import labStyles from '../MotionLab.module.css';
import styles from './HeroTuningPromotion.module.css';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea path */
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

type RepoState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'unavailable'; error: string }
  | { kind: 'saved'; file: HeroTuningSnapshotFile; snapshot: HeroTuningSnapshot };

const fmt = (v: number | string) => (typeof v === 'number' ? String(v) : v);

function Group({
  title,
  rows,
  showAll,
}: {
  title: string;
  rows: HeroTuningRow[];
  showAll: boolean;
}) {
  const changed = rows.filter((r) => r.changed);
  const visible = showAll ? rows : changed;
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>
        <span>{title}</span>
        <span>
          {changed.length} / {rows.length} changed
        </span>
      </div>
      {visible.length === 0 ? (
        <span className={styles.same}>matches checked-in defaults</span>
      ) : (
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '25%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>dial</th>
              <th>shipped</th>
              <th>live</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.key} data-changed={r.changed ? '' : undefined}>
                <td className={labStyles.mono}>{r.key}</td>
                <td className={labStyles.mono}>{fmt(r.shipped)}</td>
                <td className={labStyles.mono}>{fmt(r.live)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const BANDS: { id: HeroBreakpoint; title: string }[] = [
  { id: 'desktop', title: 'desktop (≥1200)' },
  { id: 'tablet', title: 'tablet (640–1199)' },
  { id: 'mobile', title: 'mobile (<640)' },
];

export function HeroTuningPromotion({ snapshot }: { snapshot: HeroTuningSnapshot }) {
  const comparison = useMemo(() => compareHeroTuning(snapshot), [snapshot]);
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [repo, setRepo] = useState<RepoState>({ kind: 'loading' });

  const loadRepo = useCallback(async () => {
    try {
      const res = await fetch(HERO_SNAPSHOT_ROUTE, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as HeroTuningSnapshotFile | { ok: true; exists: false };
      if ('exists' in body && body.exists === false) {
        setRepo({ kind: 'missing' });
        return;
      }
      const file = body as HeroTuningSnapshotFile;
      const parsed = snapshotFromFile(file);
      if (!parsed) throw new Error('Snapshot file is not a tuning snapshot');
      setRepo({ kind: 'saved', file, snapshot: parsed });
    } catch (error) {
      setRepo({
        kind: 'unavailable',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void loadRepo();
  }, [loadRepo]);

  const snapshotJson = () => JSON.stringify(buildHeroSnapshotFile(snapshot), null, 2);

  const onCopyJson = async () => {
    const ok = await copyText(snapshotJson());
    setNotice(ok ? { text: 'Snapshot JSON copied.' } : { text: 'Copy failed.', error: true });
  };

  const onCopyDiff = async () => {
    const ok = await copyText(formatHeroTuningDiff(comparison));
    setNotice(ok ? { text: 'Diff copied.' } : { text: 'Copy failed.', error: true });
  };

  const onSave = async () => {
    try {
      const res = await fetch(HERO_SNAPSHOT_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: snapshotJson(),
      });
      const result = (await res.json()) as { ok: boolean; path?: string; error?: string };
      if (!res.ok || !result.ok) throw new Error(result.error ?? `HTTP ${res.status}`);
      setNotice({ text: `Saved to ${result.path}. Review it, then bake into the defaults.` });
      await loadRepo();
    } catch (error) {
      setNotice({
        text: `Save failed: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      });
    }
  };

  const clean = comparison.changes === 0;
  const repoMatchesLive = repo.kind === 'saved' && sameHeroSnapshot(repo.snapshot, snapshot);

  return (
    <section className={styles.panel} aria-label="Hero reveal tuning promotion">
      <div className={styles.head}>
        <span className={styles.title}>Promotion · live tuning vs checked-in defaults</span>
        <span className={`${styles.badge} ${clean ? styles.badgeClean : styles.badgeDirty}`}>
          {clean
            ? 'matches production defaults'
            : `${comparison.changes} ${comparison.changes === 1 ? 'value' : 'values'} differ`}
        </span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={labStyles.chip} onClick={onCopyJson}>
          Copy snapshot JSON
        </button>
        <button type="button" className={labStyles.chip} onClick={onCopyDiff}>
          Copy diff
        </button>
        <button type="button" className={labStyles.chip} onClick={onSave}>
          Save snapshot to repo
        </button>
        <button type="button" className={labStyles.chip} onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Only differences' : 'Show all values'}
        </button>
      </div>

      <div className={`${styles.notice} ${notice?.error ? styles.noticeError : ''}`}>
        {notice?.text ?? ''}
      </div>

      <div className={styles.repo}>
        <strong>Repo snapshot</strong>{' '}
        <span className={labStyles.mono}>{HERO_SNAPSHOT_FILE}</span>
        <br />
        {repo.kind === 'loading' && 'checking…'}
        {repo.kind === 'missing' && 'none saved yet.'}
        {repo.kind === 'unavailable' && `not reachable (${repo.error}) — is this the Vite dev server?`}
        {repo.kind === 'saved' && (
          <>
            saved {new Date(repo.file.savedAt).toLocaleString()} ·{' '}
            {repo.file.changedKeys.length} changed key
            {repo.file.changedKeys.length === 1 ? '' : 's'} vs defaults at save time ·{' '}
            {repoMatchesLive ? (
              <span>matches the live tuning</span>
            ) : (
              <span>
                <strong>differs from the live tuning</strong> — save again to refresh it
              </span>
            )}
          </>
        )}
      </div>

      <div className={styles.groups}>
        <Group title="base timeline" rows={comparison.base} showAll={showAll} />
        {BANDS.map((band) => (
          <Group
            key={band.id}
            title={band.title}
            rows={comparison.bands[band.id]}
            showAll={showAll}
          />
        ))}
      </div>

      <div className={styles.foot}>
        Nothing here writes production defaults. To promote: save or copy the snapshot, review it,
        then bake the approved values into{' '}
        <span className={labStyles.mono}>HERO_REVEAL_DEFAULTS</span> (heroRevealTimeline.ts) and{' '}
        <span className={labStyles.mono}>HERO_RESPONSIVE_DEFAULTS</span> (heroRevealComposition.ts)
        and commit. Production only ever runs those two constants.
      </div>
    </section>
  );
}
