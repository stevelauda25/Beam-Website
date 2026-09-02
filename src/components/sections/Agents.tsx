import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import { AgentVisual } from '../visuals/agents/AgentVisual';
import toggleActive from '../../assets/icons/common/toggle-active.svg';

export default function Agents() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-12 sm:px-8 sm:py-20 lg:px-0 lg:py-[100px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center lg:flex-row lg:items-stretch">
        <FadeIn className="w-full lg:w-[809px]">
          <div className="aspect-[809/520] w-full overflow-hidden [&>div]:h-full [&>div]:w-full [&_svg]:h-auto [&_svg]:w-full lg:aspect-[809/692] lg:overflow-visible lg:[&_svg]:h-full">
            <AgentVisual />
          </div>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="flex w-full items-center pt-6 lg:w-[631px] lg:pr-[131px] lg:pl-0 lg:pt-0"
        >
          <div className="flex flex-col gap-6 lg:gap-[130px]">
            <div className="flex max-w-[500px] flex-col gap-[10px]">
              <SectionLabel label="Agents" />
              <h2 className="text-section font-normal text-text-primary">
                Built for agents, not just humans
              </h2>
              <p className="text-[12px] leading-[18px] text-text-primary">
                <span className="sm:hidden">
                  <span className="block">
                    Agents get the same view of your files as you do,
                  </span>
                  <span className="block">
                    through the CLI and an MCP server, authenticated
                  </span>
                  <span className="block">
                    with scoped tokens you can revoke at any time.
                  </span>
                </span>
                <span className="hidden sm:inline">
                  Agents get the same view of your files as you do, through the CLI
                  and an MCP server, authenticated with scoped tokens you can revoke
                  at any time.
                </span>
              </p>
            </div>

            <div className="flex max-w-[500px] flex-col gap-2">
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
                title={
                  <>
                    <span className="sm:hidden">
                      Fresh agent sandboxes start with your
                      <span className="block">working tree already there</span>
                    </span>
                    <span className="hidden sm:inline">
                      Fresh agent sandboxes start with your working tree already there
                    </span>
                  </>
                }
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
