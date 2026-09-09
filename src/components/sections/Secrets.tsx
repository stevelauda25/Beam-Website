import { lazy, Suspense } from 'react';
import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import toggleActive from '../../assets/icons/common/toggle-active.svg';

/*
 * Split out of the main bundle (2026-09-09 performance pass).
 *
 * This visual is a large inline-SVG payload and is the single biggest module
 * in its section; keeping it in the entry chunk meant the browser had to
 * parse, compile and evaluate it before the hero could mount, which is where
 * the long tasks measured on Lighthouse actually live. It is below the fold
 * and nothing above the fold reads from it.
 *
 * NO LAYOUT CONSEQUENCE: the wrapper below carries a fixed `aspect-[1178/484]`,
 * so the box reserves its exact final height from the first paint whether or
 * not the chunk has arrived. The fallback is deliberately `null` rather than a
 * placeholder — a placeholder would be a visual change, an empty box of the
 * correct size is not, and the chunk resolves long before this section can be
 * scrolled to. Document height, and therefore every ScrollTrigger position,
 * is identical from the first frame.
 */
const SecretVisual = lazy(() =>
  import('../visuals/secrets/SecretVisual').then((m) => ({ default: m.SecretVisual })),
);

const features = [
  {
    className: 'lg:w-[340px]',
    title:
      'Encrypted at rest with AES-256-GCM,\nnever stored in snapshots, chunks, or logs',
  },
  {
    className: 'lg:w-[385px]',
    title:
      'Scoped to org, workspace, and profile (dev,\nstaging, prod), so a token only unlocks what it needs',
  },
  {
    className: 'lg:w-[385px]',
    title:
      'Every read is audit-logged, and rotating a key\nreaches every live workspace in under 30 seconds',
  },
];

export default function Secrets() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-12 sm:px-8 sm:py-16 lg:px-[131px] lg:py-[100px]">
      <div className="mx-auto flex max-w-[1178px] flex-col items-center gap-6 min-[744px]:w-[680px] min-[744px]:gap-8 lg:w-full">
        <FadeIn className="order-2 flex flex-col items-center gap-3 text-center min-[744px]:w-[500px] lg:order-1 lg:w-auto">
          <SectionLabel label="Secrets" />
          <h2 className="max-w-[460px] text-section font-normal text-text-primary">
            Env vars that travel,{' '}
            <span className="block">without leaving a trace</span>
          </h2>
          <p className="max-w-[490px] text-[14px] leading-[20px] text-text-primary">
            Keep environment variables with your workspace and make them available
            only where you explicitly mount them—without committing .env files or
            copying secrets between machines.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="order-1 mb-9 w-full sm:mb-0 min-[744px]:w-[520px] lg:order-2 lg:w-full">
          <div className="aspect-[1178/484] w-full scale-150 [&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full sm:scale-100">
            <Suspense fallback={null}>
              <SecretVisual />
            </Suspense>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="order-3 w-full min-[744px]:w-[680px] lg:w-full">
          <div className="flex w-full flex-col justify-center gap-3 min-[744px]:grid min-[744px]:grid-cols-3 min-[744px]:gap-4 lg:flex lg:flex-row lg:gap-8">
            {features.map((feature) => (
              <FeatureItem
                key={feature.title.slice(0, 24)}
                icon={toggleActive}
                title={
                  <>
                    <span className="min-[744px]:hidden lg:inline">
                      {feature.title}
                    </span>
                    <span className="hidden min-[744px]:inline lg:hidden">
                      {feature.title.replace(/\n/g, ' ')}
                    </span>
                  </>
                }
                className={`max-w-full ${feature.className}`}
              />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
