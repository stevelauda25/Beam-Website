import FadeIn from '../ui/FadeIn';
import keyVisualSolution from '../../assets/hero/key-visual-solution.svg';

export default function Solution() {
  return (
    <section className="w-full bg-canvas px-8 py-[100px] lg:px-[131px]">
      <div className="mx-auto flex max-w-[1178px] flex-col items-center gap-12">
        <FadeIn>
          <h2 className="text-center text-section font-normal text-text-primary">
            One workspace. Every environment.
          </h2>
        </FadeIn>

        <FadeIn delay={0.05} className="w-full">
          <img
            src={keyVisualSolution}
            alt="Beam connecting the same ready workspace across two environments"
            className="h-auto w-full"
            width={1178}
            height={350}
          />
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="max-w-[387px] text-center text-[12px] leading-[18px] text-text-primary">
            One unified directory, mirrored everywhere. Attach it to any machine
            and your workspace is just there. Files on demand, secrets included,
            and the same view for agents through CLI and MCP.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
