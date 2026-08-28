import Button from '../ui/Button';
import FadeIn from '../ui/FadeIn';
import HeroKeyVisual from './HeroKeyVisual';
import arrowRight from '../../assets/icons/arrow-right.svg';

export default function Hero() {
  return (
    <section className="relative w-full bg-canvas">
      <div className="relative mx-auto flex max-w-[1176px] flex-col px-8 pb-10 pt-16 lg:h-[266px] lg:block lg:px-0 lg:py-0">
        <FadeIn>
          <div className="flex w-full max-w-[748px] flex-col gap-2 lg:absolute lg:left-0 lg:top-[103px]">
            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="rounded-full bg-[#141414] px-1.5 py-0.5 text-[10px] font-normal text-white">
                SALE
              </span>
              <span className="flex items-center gap-1 text-[14px] font-normal leading-[14px] text-text-primary">
                Launch offer Get Pro for $10/month
                <img
                  src={arrowRight}
                  alt=""
                  className="h-3 w-3"
                  width={12}
                  height={12}
                />
              </span>
            </div>
            <h1 className="text-3xl font-normal leading-[44px] tracking-[-0.64px] text-text-primary">
              One workspace. Everywhere.
            </h1>
            <p className="max-w-[564px] text-[16px] leading-[24px] text-[#3d3d3d]">
              Beam keeps your files available across local machines, cloud
              environments, CI, and agent workflows without rebuilding context.
            </p>
          </div>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="mt-8 flex gap-3 lg:absolute lg:right-0 lg:top-[200px] lg:mt-0"
        >
          <Button variant="secondary" href="#">
            Read docs
          </Button>
          <Button variant="primary" href="#">
            Start free
          </Button>
        </FadeIn>

      </div>

      <FadeIn delay={0.15} className="relative w-full">
        <div className="mx-auto w-full max-w-[1440px]">
          <HeroKeyVisual />
        </div>
      </FadeIn>
    </section>
  );
}
