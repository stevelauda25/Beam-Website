/**
 * Hero Reveal preview switch — DEV ONLY.
 *
 * Swaps the homepage's key visual between the reveal AS IT SHIPS (frozen
 * defaults, exactly what production renders) and the reveal driven by LIVE
 * DialKit tuning, in place, inside the real Hero section. Nothing here is a simulation:
 * the surrounding markup, the width classes, the FadeIn, the section padding
 * and every breakpoint are the homepage's own, because this component is
 * mounted by the homepage's own `HeroKeyVisual`.
 *
 * ONE SOURCE OF TRUTH. The reveal rendered here is the same
 * `HeroRevealSequence`, driven by the same `sampleHeroReveal` timeline, the
 * same responsive composition resolver and the same persisted tuning that
 * Motion Lab writes. `useHeroRevealTuningValue` is a live READER — the Motion
 * Lab panel is the only writer — so moving a DialKit dial in the lab updates
 * this preview with no copying, in this tab and in any other tab open on the
 * same origin.
 *
 * The reveal mounts the production `HeroWorkspaceDemo` itself and reveals it by
 * opacity, so when the sequence resolves, the interactive drag-and-drop that
 * ships IS what is on screen — not a duplicate and not a mock.
 *
 * NEVER SHIPS. `HeroKeyVisual` reaches this module through a `lazy()` behind
 * `import.meta.env.DEV`, which Rollup replaces with `false` in a production
 * build and eliminates along with this whole chunk.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HeroRevealSequence } from '../../components/visuals/hero/reveal/HeroRevealSequence';
import { useHeroRevealPlayer } from '../../components/visuals/hero/reveal/useHeroRevealPlayer';
import { useHeroRevealTuningValue } from '../motion-lab/tuning/heroRevealTuningStore';
import styles from './HeroPreviewSwitch.module.css';

const MODE_KEY = 'beam.dev.heroPreview.v1';
const MODE_EVENT = 'beam:dev-hero-preview-mode';

type Mode = 'shipping' | 'reveal';

/**
 * URL wins over the stored choice, so a link can put someone straight into the
 * preview (`?hero=reveal`) and `?hero=shipping` gets them back out of it.
 */
function initialMode(): Mode {
  if (typeof window === 'undefined') return 'shipping';
  const param = new URLSearchParams(window.location.search).get('hero');
  if (param === 'reveal' || param === 'shipping') return param;
  try {
    return window.localStorage.getItem(MODE_KEY) === 'reveal' ? 'reveal' : 'shipping';
  } catch {
    return 'shipping';
  }
}

function useMode() {
  const [mode, setModeState] = useState<Mode>(initialMode);

  useEffect(() => {
    const sync = () => setModeState(initialMode());
    // Other tabs, and the second copy of the toggle if one ever mounts.
    window.addEventListener('storage', sync);
    window.addEventListener(MODE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(MODE_EVENT, sync);
    };
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* blocked site data — the choice just does not persist */
    }
    /*
     * Keep the URL honest so a reload, a copied link or a screenshot all show
     * the same thing. replaceState, so this never adds history entries.
     */
    const url = new URL(window.location.href);
    url.searchParams.set('hero', next);
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(MODE_EVENT));
  }, []);

  return [mode, setMode] as const;
}

/**
 * Dev chrome goes to document.body.
 *
 * The Hero's key visual sits inside a FadeIn (framer-motion) and an
 * `overflow-hidden` wrapper. A transformed ancestor makes `position: fixed`
 * resolve against that ancestor instead of the viewport, and the overflow rule
 * would clip it — so the controls are portalled out rather than fought with.
 * This also guarantees the dev UI contributes nothing to the Hero's layout,
 * which is the thing being reviewed.
 */
function DevChrome({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

/** The reveal, driven by whatever Motion Lab currently holds. */
function RevealPreview() {
  const { base, responsive } = useHeroRevealTuningValue();
  const player = useHeroRevealPlayer(true, base);

  return (
    <>
      {/*
        * Same flex column as the shipping hero, minus its `overflow-hidden`:
        * on tablet and mobile the reveal is drawn larger than the column and
        * must spill into the margins, cut only by <main class="overflow-x-clip">.
        */}
      <div className="flex w-full justify-center">
        <HeroRevealSequence time={player.time} tuning={base} responsive={responsive} />
      </div>
      <DevChrome>
        <div className={styles.playback}>
          <button type="button" className={styles.chip} onClick={player.replay}>
            Replay
          </button>
          <button
            type="button"
            className={styles.chip}
            onClick={player.toggle}
            disabled={player.reducedMotion}
          >
            {player.playing ? 'Pause' : 'Play'}
          </button>
          <span className={styles.time}>
            {Math.round(player.time)} / {player.duration} ms
          </span>
          {/*
            * Scrubbing in the real page, not just in the lab: the sequence is a
            * pure function of time, so dragging this renders exactly the frame
            * playback would. It is also the only way to inspect the resolved
            * interactive state once the reveal has already run.
            */}
          <input
            type="range"
            className={styles.scrub}
            min={0}
            max={player.duration}
            step={1}
            value={Math.round(player.time)}
            onChange={(event) => player.seek(Number(event.target.value))}
            aria-label="Scrub the hero reveal"
          />
        </div>
      </DevChrome>
    </>
  );
}

export default function HeroPreviewSwitch({ shipping }: { shipping: ReactNode }) {
  const [mode, setMode] = useMode();

  return (
    <>
      {mode === 'reveal' ? <RevealPreview /> : shipping}

      <DevChrome>
      <div className={styles.dock} data-hero-preview-dock="">
        <span className={styles.badge}>dev</span>
        <div className={styles.group} role="group" aria-label="Hero preview mode">
          <button
            type="button"
            className={styles.tab}
            data-active={mode === 'shipping'}
            onClick={() => setMode('shipping')}
          >
            Shipping (frozen)
          </button>
          <button
            type="button"
            className={styles.tab}
            data-active={mode === 'reveal'}
            onClick={() => setMode('reveal')}
          >
            Live DialKit tuning
          </button>
        </div>
        <a className={styles.link} href="/dev/motion-lab?entry=hero-real-condition">
          Motion Lab →
        </a>
      </div>
      </DevChrome>
    </>
  );
}
