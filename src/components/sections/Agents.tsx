import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import { AgentVisual } from '../../assets/hero/agent-visual';
import featureAgents from '../../assets/icons/feature-agents.svg';
import toggleActive from '../../assets/icons/toggle-active.svg';

export default function Agents() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-16 sm:px-8 sm:py-20 lg:px-0 lg:py-[100px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center lg:flex-row lg:items-stretch">
        <FadeIn className="w-full lg:w-[809px]">
          <div className="aspect-[809/692] w-full [&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full">
            <AgentVisual />
          </div>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="flex w-full items-center pt-12 lg:w-[631px] lg:pr-[131px] lg:pl-0 lg:pt-0"
        >
          <div className="flex flex-col gap-10 lg:gap-[130px]">
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
