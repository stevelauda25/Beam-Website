/**
 * Hero — Scene Review. DEV ONLY.
 *
 * Steps through the four hero states one at a time so each can be checked
 * against the Figma frame it came from, and so the sequence can be checked for
 * STRUCTURAL continuity: all four are states of one container, and switching
 * between them must not move or resize the panel.
 *
 * The live panel-bounds readout below is the proof of that, measured from the
 * DOM on every switch rather than asserted in a comment. There is deliberately
 * no play button and no panel-geometry toggle: this section reviews states of
 * a single container. Motion is a later pass.
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { HeroRevealScene } from '../../../components/visuals/hero/reveal/HeroRevealScene';
import {
  HERO_PANEL,
  HERO_REVEAL_SCENES,
} from '../../../components/visuals/hero/reveal/heroRevealScenes';
import labStyles from '../MotionLab.module.css';
import styles from './HeroSceneReview.module.css';

type Bounds = { left: number; top: number; width: number; height: number };

const round = (n: number) => Math.round(n * 100) / 100;

export function HeroSceneReview() {
  const [sceneId, setSceneId] = useState(HERO_REVEAL_SCENES[0].id);
  const [bounds, setBounds] = useState<Record<string, Bounds>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const scene = HERO_REVEAL_SCENES.find((entry) => entry.id === sceneId) ?? HERO_REVEAL_SCENES[0];

  /** Measure the rendered panel for the active state, unscaling the harness. */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    const canvas = stage?.querySelector<HTMLElement>('[data-hero-canvas]');
    const frame = stage?.querySelector<HTMLElement>('[data-hero-panel="frame"]');
    if (!canvas || !frame) return;
    const c = canvas.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const k = c.width / 1440 || 1;
    setBounds((prev) => ({
      ...prev,
      [sceneId]: {
        left: round((f.left - c.left) / k),
        top: round((f.top - c.top) / k),
        width: round(f.width / k),
        height: round(f.height / k),
      },
    }));
  }, [sceneId]);

  /*
   * useLayoutEffect, not requestAnimationFrame: getBoundingClientRect forces
   * layout anyway, so this reads settled geometry, and it still records when
   * rAF is throttled (a background tab, or a hidden preview pane).
   */
  useLayoutEffect(measure, [measure]);

  const seen = HERO_REVEAL_SCENES.map((entry) => bounds[entry.id]).filter(Boolean) as Bounds[];
  const identical =
    seen.length > 1 &&
    seen.every(
      (b) =>
        b.left === seen[0].left &&
        b.top === seen[0].top &&
        b.width === seen[0].width &&
        b.height === seen[0].height,
    );

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span className={styles.barLabel}>State</span>
        {HERO_REVEAL_SCENES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setSceneId(entry.id)}
            className={`${labStyles.chip} ${entry.id === scene.id ? labStyles.chipActive : ''}`}
          >
            {entry.step}. {entry.label}
            {bounds[entry.id] && <span className={styles.tick}>measured</span>}
          </button>
        ))}
      </div>

      <div className={styles.stage} ref={stageRef}>
        <HeroRevealScene sceneId={scene.id} />
      </div>

      <div className={styles.readout}>
        <div className={styles.continuity} data-ok={identical || undefined}>
          <strong>One container.</strong> Panel is{' '}
          <span className={labStyles.mono}>
            left {HERO_PANEL.left} · {HERO_PANEL.width} × {HERO_PANEL.height}
          </span>{' '}
          (inner <span className={labStyles.mono}>{HERO_PANEL.innerWidth}</span>) in every state —
          the shipping hero&rsquo;s own geometry.{' '}
          {seen.length < 2 ? (
            <>Visit each state to measure it.</>
          ) : identical ? (
            <>
              Measured <span className={labStyles.mono}>{seen.length}/4</span> states so far: bounds
              identical, no resize between them.
            </>
          ) : (
            <strong>Bounds differ between measured states — that is a bug.</strong>
          )}
        </div>

        <ul className={styles.boundsList}>
          {HERO_REVEAL_SCENES.map((entry) => {
            const b = bounds[entry.id];
            return (
              <li key={entry.id}>
                <span className={styles.boundsName}>
                  {entry.step}. {entry.label}
                </span>
                <span className={labStyles.mono}>
                  {b ? `left ${b.left} · top ${b.top} · ${b.width} × ${b.height}` : 'not measured'}
                </span>
              </li>
            );
          })}
        </ul>

        <div>
          <strong>
            {scene.step}. {scene.label}
          </strong>{' '}
          — Figma <span className={labStyles.mono}>{scene.figmaNodeId}</span>{' '}
          <a className={styles.link} href={scene.figmaUrl} target="_blank" rel="noreferrer">
            open frame
          </a>
        </div>
        <div>{scene.intent}</div>
        <div className={styles.adaptTitle}>Adapted into the shared panel</div>
        <ul className={styles.caveats}>
          {scene.adaptation.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
