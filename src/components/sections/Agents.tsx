import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import { AgentVisual } from '../visuals/agents/AgentVisual';
import toggleActive from '../../assets/icons/common/toggle-active.svg';

export default function Agents() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-5 py-12 sm:px-8 sm:py-16 lg:px-0 lg:py-[100px]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center min-[744px]:w-[680px] lg:w-full lg:flex-row lg:items-stretch">
        <FadeIn className="w-full sm:max-w-[640px] min-[744px]:-mb-16 min-[744px]:w-[520px] lg:mb-0 lg:w-[809px] lg:max-w-none">
          {/*
            MOBILE FRAMING.

            The crop window was 809/520, which cut the canvas at y=520. The
            confirmation block lives BELOW that line -- .agent-confirmation-cover
            sits at top:72.9% (y~505) and the four confirmation paths it reveals
            are at y~517-533, with that whole shape running down to y~672 -- so
            the entire payoff of the animation was clipped off on a phone.

            Widened to the artwork's own ratio rather than scaling the artwork
            down: the SVG is still w-full at exactly the same size, the window
            around it just no longer cuts it short. Tablet and desktop already
            used 809/692 and are unaffected.
          */}
          <div className="aspect-[809/692] w-full overflow-hidden [&>div]:h-full [&>div]:w-full [&_svg]:h-auto [&_svg]:w-full min-[744px]:overflow-visible min-[744px]:[&_svg]:h-full">
            <AgentVisual />
          </div>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="relative z-10 flex w-full items-center pt-6 sm:max-w-[640px] sm:pt-8 min-[744px]:w-[680px] lg:w-[631px] lg:max-w-none lg:pr-[131px] lg:pl-0 lg:pt-0"
        >
          <div className="flex w-full flex-col gap-6 min-[744px]:gap-8 lg:gap-[130px]">
            <div className="flex max-w-[500px] flex-col gap-[10px] min-[744px]:mx-auto min-[744px]:items-center min-[744px]:text-center lg:mx-0 lg:items-start lg:text-left">
              <SectionLabel label="Agents" />
              <h2 className="text-section font-normal text-text-primary">
                Built for agents,<br className="sm:hidden" />{' '}not just humans
              </h2>
              <p className="text-[14px] leading-[20px] text-text-primary">
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

            <div className="flex max-w-[500px] flex-col gap-2 min-[744px]:grid min-[744px]:max-w-none min-[744px]:grid-cols-3 min-[744px]:gap-4 lg:flex lg:max-w-[500px] lg:gap-2">
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
