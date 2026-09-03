import { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionLabel from '../ui/SectionLabel';
import ondemandInstant from '../../assets/icons/on-demand/ondemand-instant.svg';
import ondemandLoad from '../../assets/icons/on-demand/ondemand-load.svg';
import ondemandRepos from '../../assets/icons/on-demand/ondemand-repos.svg';
import { OnDemandVisual } from '../visuals/on-demand/OnDemandVisual';
import { OnDemandVisual2 } from '../visuals/on-demand/OnDemandVisual2';
import { OnDemandVisual3 } from '../visuals/on-demand/OnDemandVisual3';

gsap.registerPlugin(ScrollTrigger);

const items = [
  {
    title: 'Everything appears instantly',
    description: 'See the full directory without downloading every file first.',
    icon: ondemandInstant,
    component: OnDemandVisual,
  },
  {
    title: 'Contents load on demand',
    description: 'Open a file and Beam fetches its contents when needed.',
    icon: ondemandLoad,
    component: OnDemandVisual2,
  },
  {
    title: 'Built for huge repos',
    description: 'Mount large monorepos without filling your local disk.',
    icon: ondemandRepos,
    component: OnDemandVisual3,
  },
];

export default function OnDemand() {
  const containerRef = useRef<HTMLElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1200;
  });
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 744 && window.innerWidth < 1200;
  });

  useEffect(() => {
    const desktopMq = window.matchMedia('(min-width: 1200px)');
    const tabletMq = window.matchMedia('(min-width: 744px) and (max-width: 1199px)');
    const syncLayout = () => {
      setIsDesktop(desktopMq.matches);
      setIsTablet(tabletMq.matches);
    };

    desktopMq.addEventListener('change', syncLayout);
    tabletMq.addEventListener('change', syncLayout);
    return () => {
      desktopMq.removeEventListener('change', syncLayout);
      tabletMq.removeEventListener('change', syncLayout);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const syncActiveIndex = (progress: number) => {
        if (progress < 0.33) setActiveIndex(0);
        else if (progress < 0.66) setActiveIndex(1);
        else setActiveIndex(2);
      };

      scrollTriggerRef.current = ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: () => {
          if (window.innerWidth < 640) return '+=140%';
          if (window.innerWidth < 1200) return '+=160%';
          return '+=200%';
        },
        pin: true,
        pinSpacing: true,
        scrub: 0.5,
        anticipatePin: 1,
        fastScrollEnd: true,
        invalidateOnRefresh: true,
        onUpdate: ({ progress }) => syncActiveIndex(progress),
        onRefresh: ({ progress }) => syncActiveIndex(progress),
      });
    }, containerRef);

    return () => {
      scrollTriggerRef.current = null;
      ctx.revert();
    };
  }, [reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToItem = (index: number) => {
    setActiveIndex(index);

    if (reducedMotion) return;

    if (scrollTriggerRef.current) {
      const st = scrollTriggerRef.current;
      const progress = [0.17, 0.5, 0.83][index];
      const targetY = st.start + progress * (st.end - st.start);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const descVariants = {
    initial: reducedMotion
      ? { height: 0, opacity: 0 }
      : { height: 0, opacity: 0, y: 8, filter: 'blur(4px)' },
    animate: reducedMotion
      ? { height: 'auto', opacity: 1 }
      : { height: 'auto', opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: reducedMotion
      ? { height: 0, opacity: 0 }
      : { height: 0, opacity: 0, y: -8, filter: 'blur(4px)' },
  };

  const visualVariants = {
    initial: reducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 10, filter: 'blur(6px)' },
    animate: reducedMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: reducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: -10, filter: 'blur(6px)' },
  };

  const transition = {
    duration: reducedMotion ? 0 : 0.5,
    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  };

  const textHeader = (
    <div className="flex w-full max-w-[500px] flex-col gap-[10px]">
      <SectionLabel label="On demand files" />
      <h2 className="text-section font-normal text-text-primary">
        The whole tree, a fraction of the disk
      </h2>
      <p className="text-[14px] leading-[20px] text-text-primary">
        Beam keeps lightweight refs to every file and downloads contents only when
        something actually reads them. You conserve disk space on laptops and small
        sandboxes, while the full file system stays browsable and searchable.
      </p>
    </div>
  );

  const renderItem = (index: number, isActive: boolean) => {
    const item = items[index];
    const isLast = index === items.length - 1;
    return (
      <div
        key={item.title}
        id={`ondemand-item-${index}`}
        className="relative flex items-start gap-[6px]"
      >
        {!isLast && (
          <div
            className="pointer-events-none absolute -bottom-4 left-[5.5px] top-4 w-px overflow-hidden rounded-full bg-black/[0.08]"
            aria-hidden="true"
          >
            <motion.span
              className="block h-full w-full origin-top bg-text-primary"
              initial={false}
              animate={{ scaleY: activeIndex > index ? 1 : 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.35,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          </div>
        )}

        <div className="relative z-10 flex h-5 w-3 shrink-0 items-center justify-center">
          <img
            src={item.icon}
            alt=""
            className={`h-3 w-3 shrink-0 bg-canvas transition-all duration-500 ${
              index <= activeIndex ? 'opacity-100' : 'opacity-[0.55]'
            }`}
            width={12}
            height={12}
          />
        </div>
        <div className="flex flex-col text-[14px] leading-[20px]">
          <button
            type="button"
            onClick={() => scrollToItem(index)}
            aria-pressed={isActive}
            className={`rounded-sm text-left font-normal transition-colors duration-500 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 ${
              index <= activeIndex ? 'text-text-primary' : 'text-text-muted'
            }`}
          >
            {item.title}
          </button>
          <div className="relative overflow-hidden">
            <AnimatePresence mode="sync" initial={false}>
              {isActive && (
                <motion.div
                  key={`desc-${index}`}
                  variants={descVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="block text-text-secondary"
                >
                  {item.description}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

  const keyVisual = (
    <div
      className="relative aspect-[809/692] max-w-full"
      style={{
        width: isDesktop
          ? 'min(809px, 56vw, 116svh)'
          : isTablet
            ? '520px'
            : 'min(400px, 90vw, 42svh)',
      }}
    >
      <AnimatePresence mode="sync" initial={false}>
        {items.map((item, index) => {
          if (index !== activeIndex) return null;
          const Component = item.component;

          return (
            <motion.div
              key={`visual-${index}`}
              variants={visualVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              className="pointer-events-auto absolute inset-0 flex items-center justify-center"
            >
              <div className="h-full w-full [&>div]:h-full [&>div]:w-full [&_svg]:h-full [&_svg]:w-full">
                <Component />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  const subheaderList = (
    <div className="flex w-full max-w-[500px] flex-col gap-3">
      {items.map((_, index) => renderItem(index, index === activeIndex))}
    </div>
  );

  const desktopContent = (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-row items-center justify-center gap-0 px-0 py-0">
      <div className="flex w-[631px] flex-col justify-center pl-[131px]">
        <div className="flex max-w-[500px] flex-col gap-[130px]">
          {textHeader}
          {subheaderList}
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 items-center justify-center">
        {keyVisual}
      </div>
    </div>
  );

  const mobileContent = (
    <div className="mx-auto flex h-full w-full max-w-[500px] flex-col items-start justify-start gap-6 overflow-x-hidden px-5 pt-12 sm:max-w-[640px] sm:px-8 sm:pt-16 min-[744px]:w-[680px] min-[744px]:max-w-none min-[744px]:items-center min-[744px]:justify-center min-[744px]:gap-8 min-[744px]:px-0 min-[744px]:pt-0 lg:justify-start">
      {keyVisual}
      {textHeader}
      {subheaderList}
    </div>
  );

  return (
    <section
      ref={containerRef}
      className="relative h-[100svh] w-full overflow-x-hidden bg-canvas lg:h-[100dvh]"
    >
      {isDesktop ? desktopContent : mobileContent}
    </section>
  );
}
