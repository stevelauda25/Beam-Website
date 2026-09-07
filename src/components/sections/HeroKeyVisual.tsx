/**
 * The Hero's key visual.
 *
 * Production renders `<HeroRevealHero />` — the drag-and-drop reveal resolving
 * into the interactive workspace — and nothing else. The branch below is a
 * DEV-ONLY seam, the same arrangement `App.tsx` uses for the Motion Lab: it
 * hands the shipping element to a switch that can overlay live DialKit tuning
 * for review. `import.meta.env.DEV` is statically replaced with `false` in a
 * production build, so Rollup drops the branch, the dynamic import and the
 * whole dev chunk: the shipped file is `<HeroRevealHero />`.
 *
 * The shipping element is passed INTO the switch rather than re-created by it,
 * so there is exactly one production code path and it stays the default in
 * every state, including while the dev chunk is still loading.
 */
import { lazy, Suspense } from 'react';
import { HeroRevealHero } from '../visuals/hero/reveal/HeroRevealHero';

const HeroPreviewSwitch = import.meta.env.DEV
  ? lazy(() => import('../../dev/hero-preview/HeroPreviewSwitch'))
  : null;

export default function HeroKeyVisual() {
  const shipping = <HeroRevealHero />;

  if (!HeroPreviewSwitch) return shipping;
  return (
    <Suspense fallback={shipping}>
      <HeroPreviewSwitch shipping={shipping} />
    </Suspense>
  );
}
