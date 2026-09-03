import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import { SyncVisual } from '../visuals/sync/SyncVisual';
import syncCheck from '../../assets/icons/sync/sync-check.svg';
import syncDotenv from '../../assets/icons/sync/sync-dotenv.svg';
import syncFast from '../../assets/icons/sync/sync-fast.svg';

export default function Sync() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-12 sm:px-8 sm:py-16 lg:px-0 lg:py-[100px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center min-[744px]:w-[680px] lg:w-full lg:flex-row lg:items-stretch">
        <FadeIn className="w-full sm:max-w-[640px] min-[744px]:w-[520px] lg:w-[809px] lg:max-w-none">
          <SyncVisual />
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="flex w-full items-center pt-12 sm:max-w-[640px] sm:pt-8 min-[744px]:w-[500px] lg:w-[621px] lg:max-w-none lg:pr-[131px] lg:pl-0 lg:pt-0"
        >
          <div className="flex w-full flex-col gap-6 lg:gap-[130px]">
            <div className="flex max-w-[490px] flex-col gap-[10px]">
              <SectionLabel label="Sync" />
              <h2 className="text-section font-normal text-text-primary">
                One directory, every machine
              </h2>
              <p className="text-[14px] leading-[20px] text-text-primary">
                Edit on your laptop and pick up on another machine in seconds.
                <br />
                Beam keeps your workspace live and in sync without commits,
                <br />
                pushes, or manual copies.
              </p>
            </div>

            <div className="flex max-w-[490px] flex-col gap-3">
              <FeatureItem
                icon={syncCheck}
                title="Changes converge automatically"
                description="No push, pull, or manual save."
              />
              <FeatureItem
                icon={syncDotenv}
                title="Secrets sync securely"
              >
                <span className="inline-flex items-center gap-1">
                  <span className="rounded bg-[#ebebeb] px-1 py-0 text-[10px] text-text-secondary">
                    .env
                  </span>
                  <span>files just work on new machines.</span>
                </span>
              </FeatureItem>
              <FeatureItem
                icon={syncFast}
                title="Ready in under 5 seconds"
                description="Get a usable workspace fast, regardless of repo size."
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
