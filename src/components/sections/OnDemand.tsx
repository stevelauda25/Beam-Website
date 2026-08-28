import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import keyVisualOnDemand from '../../assets/hero/key-visual-on-demand.svg';
import ondemandIcon from '../../assets/icons/ondemand.svg';
import ondemandInstant from '../../assets/icons/ondemand-instant.svg';
import ondemandLoad from '../../assets/icons/ondemand-load.svg';
import ondemandRepos from '../../assets/icons/ondemand-repos.svg';

export default function OnDemand() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-8 py-[100px] lg:px-0">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center lg:flex-row-reverse lg:items-stretch">
        <FadeIn className="w-full lg:w-[809px]">
          <img
            src={keyVisualOnDemand}
            alt="A large monorepo whose files are available on demand"
            className="h-auto w-full"
            width={809}
            height={692}
          />
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="flex w-full items-center px-8 pt-12 lg:w-[631px] lg:pl-[131px] lg:pr-0 lg:pt-0"
        >
          <div className="flex flex-col gap-10 lg:gap-[130px]">
            <div className="flex max-w-[500px] flex-col gap-[10px]">
              <SectionLabel icon={ondemandIcon} label="On demand files" />
              <h2 className="text-section font-normal text-text-primary">
                The whole tree, a fraction of the disk
              </h2>
              <p className="text-[12px] leading-[18px] text-text-primary">
                Beam keeps lightweight refs to every file and downloads contents
                only when something actually reads them. You conserve disk space on
                laptops and small sandboxes, while the full file system stays
                browsable and searchable.
              </p>
            </div>

            <div className="relative flex max-w-[500px] flex-col gap-5">
              <FeatureItem
                icon={ondemandInstant}
                title="Everything appears instantly"
                description="See the full directory without downloading every file first."
              />
              <FeatureItem
                icon={ondemandLoad}
                title="Contents load on demand"
                className="opacity-50"
              />
              <FeatureItem
                icon={ondemandRepos}
                title="Built for huge repos"
                className="opacity-50"
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
