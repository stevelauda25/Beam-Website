import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import { ShareVisual } from '../visuals/share/ShareVisual';
import toggleActive from '../../assets/icons/common/toggle-active.svg';

export default function ShareHost() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-16 sm:px-8 sm:py-20 lg:px-0 lg:py-[100px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center lg:flex-row-reverse lg:items-stretch">
        <FadeIn className="w-full lg:w-[809px]">
          <div className="aspect-[809/692] w-full [&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full">
            <ShareVisual />
          </div>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="flex w-full items-center pt-12 lg:w-[631px] lg:pl-[131px] lg:pr-0 lg:pt-0"
        >
          <div className="flex flex-col gap-6 lg:gap-[130px]">
            <div className="flex max-w-[500px] flex-col gap-[10px]">
              <SectionLabel label="Share & Host" />
              <h2 className="text-section font-normal text-text-primary">
                From drop to deploy
              </h2>
              <p className="text-[12px] leading-[18px] text-text-primary">
                Every file in Beam is one step from being live on the internet: a
                share link for a teammate, or a full deploy on your own domain.
              </p>
            </div>

            <div className="flex max-w-[500px] flex-col gap-3">
              <FeatureItem
                icon={toggleActive}
                title="Instant share links for any file"
                description="Share files instantly without requiring an account."
              />
              <FeatureItem
                icon={toggleActive}
                title="Persistent team storage"
                description="Keep files organized with folders and previews."
              />
              <FeatureItem
                icon={toggleActive}
                title="One-command deploys"
                description="Take a workspace from local files to a live site in under 30 seconds."
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
