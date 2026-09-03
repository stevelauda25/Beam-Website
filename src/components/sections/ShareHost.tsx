import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import { ShareVisual } from '../visuals/share/ShareVisual';
import toggleActive from '../../assets/icons/common/toggle-active.svg';

export default function ShareHost() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-12 sm:px-8 sm:py-16 lg:px-0 lg:py-[100px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center min-[744px]:w-[680px] lg:w-full lg:flex-row-reverse lg:items-stretch">
        <FadeIn className="w-full sm:max-w-[640px] min-[744px]:w-[520px] lg:w-[809px] lg:max-w-none">
          <div className="aspect-[809/692] w-full [&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full">
            <ShareVisual />
          </div>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="flex w-full items-center pt-12 sm:max-w-[640px] sm:pt-8 min-[744px]:w-[680px] lg:w-[631px] lg:max-w-none lg:pl-[131px] lg:pr-0 lg:pt-0"
        >
          <div className="flex w-full flex-col gap-6 min-[744px]:gap-8 lg:gap-[130px]">
            <div className="flex max-w-[500px] flex-col gap-[10px] min-[744px]:mx-auto min-[744px]:items-center min-[744px]:text-center lg:mx-0 lg:items-start lg:text-left">
              <SectionLabel label="Share & Host" />
              <h2 className="text-section font-normal text-text-primary">
                From drop to deploy
              </h2>
              <p className="text-[14px] leading-[20px] text-text-primary">
                <span className="sm:hidden">
                  <span className="block">
                    Every file in Beam is one step from being live
                  </span>
                  <span className="block">
                    on the internet: a share link for a teammate, or a full
                  </span>
                  <span className="block">deploy on your own domain.</span>
                </span>
                <span className="hidden sm:inline">
                  Every file in Beam is one step from being live on the internet: a
                  share link for a teammate, or a full deploy on your own domain.
                </span>
              </p>
            </div>

            <div className="flex max-w-[500px] flex-col gap-3 min-[744px]:grid min-[744px]:max-w-none min-[744px]:grid-cols-3 min-[744px]:gap-4 lg:flex lg:max-w-[500px] lg:gap-3">
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
