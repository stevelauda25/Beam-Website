import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import { SecretVisual } from '../visuals/secrets/SecretVisual';
import toggleActive from '../../assets/icons/common/toggle-active.svg';

const features = [
  {
    className: 'lg:w-[301px]',
    title:
      'Encrypted at rest with AES-256-GCM,\nnever stored in snapshots, chunks, or logs',
  },
  {
    className: 'lg:w-[358px]',
    title:
      'Scoped to org, workspace, and profile (dev,\nstaging, prod), so a token only unlocks what it needs',
  },
  {
    className: 'lg:w-[325px]',
    title:
      'Every read is audit-logged, and rotating a key\nreaches every live workspace in under 30 seconds',
  },
];

export default function Secrets() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-16 sm:px-8 sm:py-20 lg:px-[131px] lg:py-[100px]">
      <div className="mx-auto flex max-w-[1178px] flex-col items-center gap-6 lg:gap-8">
        <FadeIn className="order-2 flex flex-col items-center gap-3 text-center lg:order-1">
          <SectionLabel label="Secrets" />
          <h2 className="max-w-[460px] text-section font-normal text-text-primary">
            Env vars that travel,
            <span className="block">without leaving a trace</span>
          </h2>
          <p className="max-w-[490px] text-[12px] leading-[18px] text-text-primary">
            Keep environment variables with your workspace and make them available
            only where you explicitly mount them—without committing .env files or
            copying secrets between machines.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="order-1 mb-9 w-full lg:order-2 lg:mb-0">
          <div className="aspect-[1178/484] w-full scale-150 [&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full lg:scale-100">
            <SecretVisual />
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="order-3 w-full">
          <div className="flex w-full flex-col justify-center gap-3 lg:flex-row lg:gap-8">
            {features.map((feature) => (
              <FeatureItem
                key={feature.title.slice(0, 24)}
                icon={toggleActive}
                title={feature.title}
                className={`max-w-full ${feature.className}`}
              />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
