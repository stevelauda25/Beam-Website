/**
 * The Hero's key visual.
 *
 * Production renders `<HeroVisual />` and nothing else. The branch below is a
 * DEV-ONLY seam — the same arrangement `App.tsx` uses for the Motion Lab — that
 * lets the local homepage swap this slot for the Hero reveal so it can be
 * reviewed in the real Hero container, at real breakpoints, inside the real
 * page. `import.meta.env.DEV` is statically replaced with `false` in a
 * production build, so Rollup drops the branch, the dynamic import and the
 * whole dev chunk: the shipped file is `<div><HeroVisual /></div>`.
 *
 * The shipping hero is passed INTO the switch rather than re-created by it, so
 * there is exactly one `HeroVisual` in the tree and the production path stays
 * the default in every state, including while the dev chunk is still loading.
 */
import { lazy, Suspense } from 'react';
import { HeroVisual } from '../visuals/hero/HeroVisual';

const HeroPreviewSwitch = import.meta.env.DEV
  ? lazy(() => import('../../dev/hero-preview/HeroPreviewSwitch'))
  : null;

export default function HeroKeyVisual() {
  /*
   * The column clip is part of the SHIPPING element, not of the slot: the
   * production output is this exact markup, and the dev switch renders it
   * untouched in shipping mode. Only the reveal preview opts out of it, so a
   * band drawn larger than the column is cut at <main>'s viewport clip rather
   * than at the column edge.
   */
  const shipping = (
    <div className="flex w-full justify-center overflow-hidden">
      <HeroVisual />
    </div>
  );

  if (!HeroPreviewSwitch) return shipping;
  return (
    <Suspense fallback={shipping}>
      <HeroPreviewSwitch shipping={shipping} />
    </Suspense>
  );
}
