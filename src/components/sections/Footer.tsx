import FadeIn from '../ui/FadeIn';
import Button from '../ui/Button';
import TerminalCard from '../ui/TerminalCard';
import footerKeyVisual from '../../assets/hero/key-visual-footer.svg';
import footerGridPattern from '../../assets/hero/key-visual-footer-grid.svg';
import productIcon from '../../assets/icons/footer-product.svg';
import docsIcon from '../../assets/icons/footer-docs.svg';
import githubIcon from '../../assets/icons/footer-github.svg';
import changelogIcon from '../../assets/icons/footer-changelog.svg';
import pricingIcon from '../../assets/icons/footer-pricing.svg';

const links = [
  { label: 'Product', icon: productIcon },
  { label: 'Docs', icon: docsIcon },
  { label: 'GitHub', icon: githubIcon },
  { label: 'Changelog', icon: changelogIcon },
  { label: 'Pricing', icon: pricingIcon },
];

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-[#292929] text-white">
      <img
        src={footerGridPattern}
        alt=""
        className="pointer-events-none absolute bottom-0 left-1/2 h-[200px] w-[800px] max-w-none -translate-x-1/2 md:top-[701px] md:h-[363px] md:w-[1440px] md:bottom-auto"
        width={1440}
        height={363}
      />

      <div className="relative w-full overflow-hidden pt-20">
        <div className="relative mx-auto flex max-w-[1440px] flex-col items-center">
          <FadeIn className="w-full">
            <div className="relative h-[292px] w-full overflow-hidden">
              <img
                src={footerKeyVisual}
                alt=""
                className="h-full w-full object-cover object-center"
                width={1440}
                height={292}
              />
            </div>
          </FadeIn>

          <FadeIn
            delay={0.05}
            className="flex w-full flex-col items-center gap-2 px-6 pb-8 text-center"
          >
            <h2 className="text-[24px] font-normal leading-[32px] tracking-[-0.48px] md:text-[32px] md:leading-[44px] md:tracking-[-0.64px]">
              Your workspace. Ready anywhere.
            </h2>
            <p className="max-w-[382px] text-[14px] leading-[1.6]">
              Mount your files in seconds and keep the same workspace across your
              machines, tools, and agents.
            </p>
          </FadeIn>

          <FadeIn
            delay={0.1}
            className="flex w-full flex-col items-center gap-12 px-5 pb-8"
          >
            <Button
              variant="dark"
              icon
              href="#"
            >
              Get Started
            </Button>
            <TerminalCard />
          </FadeIn>

          <div className="h-[100px]" aria-hidden="true" />
        </div>
      </div>

      <FadeIn delay={0.2}>
        <nav className="flex flex-wrap items-center justify-center gap-4 px-6 pb-20 pt-5">
          {links.map(({ label, icon }) => (
            <a
              key={label}
              href="#"
              className="flex items-center gap-1.5 text-[14px] font-normal tracking-[-0.28px] text-white transition hover:text-white/80"
            >
              <img
                src={icon}
                alt=""
                className="h-3.5 w-3.5 shrink-0"
                width={14}
                height={14}
              />
              {label}
            </a>
          ))}
        </nav>
      </FadeIn>
    </footer>
  );
}
