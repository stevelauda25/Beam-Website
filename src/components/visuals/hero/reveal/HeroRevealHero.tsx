/**
 * The Hero key visual that SHIPS: the drag-and-drop reveal, autoplaying on
 * load and resolving into the real interactive workspace.
 *
 * PRODUCTION TUNING IS FROZEN HERE BY OMISSION. `HeroRevealSequence` and
 * `useHeroRevealPlayer` are called with no tuning props, so they run on
 * `HERO_REVEAL_DEFAULTS` and `HERO_RESPONSIVE_DEFAULTS` — the reviewed values,
 * checked into the repo. Nothing in this file, or below it, reads localStorage,
 * DialKit, Motion Lab state, or a URL flag: those live under src/dev and are
 * reached only through `import.meta.env.DEV` seams that the production build
 * removes. Motion Lab's "Shipping" mode renders this exact component, so what
 * the lab calls shipping and what visitors see are the same code path.
 *
 * The column below is the Hero's own flex column WITHOUT `overflow-hidden`: on
 * tablet and mobile the reveal is drawn larger than the column and spills into
 * the margins, cut only by <main class="overflow-x-clip"> at the viewport.
 *
 * Under prefers-reduced-motion the player steps through representative frames
 * on a timer and rests on the settled, interactive workspace.
 */
import { useEffect, useRef, useState } from 'react';
import { HeroRevealSequence } from './HeroRevealSequence';
import { useHeroRevealPlayer } from './useHeroRevealPlayer';

/*
 * How far outside the viewport the sequence still counts as worth drawing.
 *
 * Deliberately generous. The margin is what makes the resume invisible: the
 * observer re-opens a whole viewport-height of scrolling before the hero could
 * be seen, so the banked time is applied and committed while the sequence is
 * still off screen, and the first frame that reaches the visitor is already the
 * correct one. It also means a small scroll — a nudge, a rubber-band, reading
 * the headline with the visual half out of frame — never crosses the boundary.
 */
const KEEP_DRAWING_MARGIN = '100% 0px';

export function HeroRevealHero() {
  const frame = useRef<HTMLDivElement>(null);
  /*
   * Start true. The sequence is at the top of the page, so it is on screen for
   * every visitor at load; assuming otherwise would skip the opening frames
   * while the observer's first callback is still pending.
   */
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const node = frame.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: KEEP_DRAWING_MARGIN, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /*
   * The clock runs regardless; `onScreen` only decides whether each tick is
   * published to React. Scrolling past the hero mid-sequence therefore costs
   * nothing to draw, and scrolling back shows the time that really elapsed.
   */
  const player = useHeroRevealPlayer(true, undefined, onScreen);

  return (
    <div ref={frame} className="flex w-full justify-center">
      <HeroRevealSequence time={player.time} />
    </div>
  );
}
