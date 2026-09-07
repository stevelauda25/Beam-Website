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
import { HeroRevealSequence } from './HeroRevealSequence';
import { useHeroRevealPlayer } from './useHeroRevealPlayer';

export function HeroRevealHero() {
  const player = useHeroRevealPlayer(true);
  return (
    <div className="flex w-full justify-center">
      <HeroRevealSequence time={player.time} />
    </div>
  );
}
