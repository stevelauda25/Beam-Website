import FadeIn from '../ui/FadeIn';
import Button from '../ui/Button';
import TerminalCard from '../ui/TerminalCard';
import { FooterVisual } from '../visuals/footer/FooterVisual';
import productIcon from '../../assets/icons/footer/footer-product.svg';
import docsIcon from '../../assets/icons/footer/footer-docs.svg';
import githubIcon from '../../assets/icons/footer/footer-github.svg';
import changelogIcon from '../../assets/icons/footer/footer-changelog.svg';

const links = [
  { label: 'Product', icon: productIcon },
  { label: 'Docs', icon: docsIcon },
  { label: 'GitHub', icon: githubIcon },
  { label: 'Changelog', icon: changelogIcon },
];

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-[#292929] text-white">
      <div className="relative z-10 w-full pt-20">
        <div className="relative mx-auto flex max-w-[1440px] flex-col items-center">
          <FadeIn className="relative z-0 w-full">
            <div className="flex w-full justify-center">
              <FooterVisual />
            </div>
          </FadeIn>

          <FadeIn
            delay={0.05}
            className="relative z-20 flex w-full flex-col items-center gap-2 px-5 pb-8 text-center"
          >
            <h2 className="text-section font-normal text-white">
              <span className="block md:inline">Your workspace.</span>{' '}
              <span className="block md:inline">Ready anywhere.</span>
            </h2>
            <p className="max-w-[382px] text-[12px] leading-[18px]">
              <span className="block">Mount your files in seconds and keep the same</span>
              <span className="block">workspace across your machines, tools, and agents.</span>
            </p>
          </FadeIn>

          <FadeIn
            delay={0.1}
            className="relative z-20 flex w-full flex-col items-center gap-12 px-5 pb-8"
          >
            <div>
              <Button
                variant="dark"
                icon
                href="#"
              >
                Get Started
              </Button>
            </div>
            <div className="flex w-full justify-center">
              <TerminalCard />
            </div>
          </FadeIn>

          <div className="h-[100px]" aria-hidden="true" />
        </div>
      </div>

      <FadeIn delay={0.2} className="relative z-10">
        <nav className="flex flex-wrap items-center justify-center gap-4 px-5 pb-20 pt-5">
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
