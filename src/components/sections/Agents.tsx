import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import keyVisualAgents from '../../assets/hero/key-visual-agents.svg';
import featureAgents from '../../assets/icons/feature-agents.svg';
import toggleActive from '../../assets/icons/toggle-active.svg';

export default function Agents() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-8 py-[100px] lg:px-0">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center lg:flex-row lg:items-stretch">
        <FadeIn className="w-full lg:w-[809px]">
          <img
            src={keyVisualAgents}
            alt="An agent connected to a Beam workspace with audited file access"
            className="h-auto w-full"
            width={809}
            height={692}
          />
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="flex w-full items-center px-8 pt-12 lg:w-[631px] lg:pr-[131px] lg:pl-0 lg:pt-0"
        >
          <div className="flex flex-col gap-[130px]">
            <div className="flex max-w-[500px] flex-col gap-[10px]">
              <SectionLabel icon={featureAgents} label="Agents" />
              <h2 className="text-section font-normal text-text-primary">
                Built for agents, not just humans
              </h2>
              <p className="text-[12px] leading-[18px] text-text-primary">
                Agents get the same view of your files as you do, through the CLI
                and an MCP server, authenticated with scoped tokens you can revoke
                at any time.
              </p>
            </div>

            <div className="flex max-w-[500px] flex-col gap-3">
              <FeatureItem
                icon={toggleActive}
                title="MCP server: list, read, write, glob, and grep workspaces"
              />
              <FeatureItem
                icon={toggleActive}
                title="Per-workspace agent tokens with an audit trail"
              />
              <FeatureItem
                icon={toggleActive}
                title="Fresh agent sandboxes start with your working tree already there"
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
