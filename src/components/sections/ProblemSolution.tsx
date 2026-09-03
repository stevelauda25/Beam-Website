import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FeatureItem from '../ui/FeatureItem';
import {
  setSolutionVisualProgress,
  SolutionVisual,
} from '../visuals/solution/SolutionVisual';
import featureGit from '../../assets/icons/features/feature-git.svg';
import featureSecrets from '../../assets/icons/features/feature-secrets.svg';
import featureColdstart from '../../assets/icons/features/feature-coldstart.svg';
import featureAgents from '../../assets/icons/features/feature-agents.svg';

gsap.registerPlugin(ScrollTrigger);

const MOBILE_PROBLEM_CAROUSEL_PADDING = 20;

const problemFeatures = [
  {
    icon: featureGit,
    title: 'Git isn’t sync',
    description: 'You need temporary commits just to move unfinished work.',
  },
  {
    icon: featureSecrets,
    title: 'Secrets don’t travel',
    description: 'Your code arrives, but the environment it needs often doesn’t.',
  },
  {
    icon: featureColdstart,
    title: 'Cold starts are slow',
    description:
      'Repositories and dependencies must be rebuilt before real work can begin.',
  },
  {
    icon: featureAgents,
    title: 'Agents repeat the cycle',
    description:
      'Ephemeral environments repeat setup for every agent.',
  },
];

function ProblemDetails() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeFeature, setActiveFeature] = useState(0);

  const getSlides = () => {
    if (!carouselRef.current) return [];
    return Array.from(
      carouselRef.current.querySelectorAll<HTMLElement>('[data-problem-slide]'),
    );
  };

  const updateActiveFeature = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const targetLeft =
      carousel.getBoundingClientRect().left + MOBILE_PROBLEM_CAROUSEL_PADDING;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    getSlides().forEach((slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - targetLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveFeature(nearestIndex);
  };

  const scrollToFeature = (index: number) => {
    const carousel = carouselRef.current;
    const slides = getSlides();
    const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
    const slide = slides[nextIndex];
    if (!carousel || !slide) return;

    carousel.scrollTo({
      left:
        carousel.scrollLeft +
        slide.getBoundingClientRect().left -
        carousel.getBoundingClientRect().left -
        MOBILE_PROBLEM_CAROUSEL_PADDING,
      behavior: 'smooth',
    });
    setActiveFeature(nextIndex);
  };

  return (
    <div className="w-full">
      <div
        ref={carouselRef}
        onScroll={updateActiveFeature}
        role="region"
        aria-label="Workflow problems"
        aria-roledescription="carousel"
        className="-mx-5 flex w-[calc(100%+40px)] snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 [scroll-padding-inline:20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:w-full sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
      >
        {problemFeatures.map((feature) => (
          <div
            key={feature.title}
            data-problem-slide
            className="w-[calc(100vw-40px)] shrink-0 snap-start sm:w-auto sm:shrink"
          >
            <FeatureItem
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => scrollToFeature(activeFeature - 1)}
          disabled={activeFeature === 0}
          aria-label="Show previous workflow problem"
          className="flex h-8 w-8 items-center justify-center text-text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft aria-hidden="true" size={14} strokeWidth={1.5} />
        </button>
        <div className="flex min-w-10 items-center justify-center gap-1.5" role="group" aria-label="Choose workflow problem">
          {problemFeatures.map((feature, index) => (
            <button
              key={feature.title}
              type="button"
              onClick={() => scrollToFeature(index)}
              aria-label={`Show workflow problem ${index + 1}`}
              aria-current={activeFeature === index ? 'true' : undefined}
              className={`h-1.5 w-1.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                activeFeature === index ? 'bg-text-primary' : 'bg-black/15'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollToFeature(activeFeature + 1)}
          disabled={activeFeature === problemFeatures.length - 1}
          aria-label="Show next workflow problem"
          className="flex h-8 w-8 items-center justify-center text-text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight aria-hidden="true" size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

export default function ProblemSolution() {
  const sectionRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const context = gsap.context(() => {
      const problemElements = gsap.utils.toArray<HTMLElement>(
        '[data-problem-state]',
        section,
      );
      const solutionElements = gsap.utils.toArray<HTMLElement>(
        '[data-solution-state]',
        section,
      );
      const offset = reducedMotion ? 0 : 8;
      const blurred = reducedMotion ? 'blur(0px)' : 'blur(4px)';
      let showingSolution = false;

      gsap.set(problemElements, {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
      });
      gsap.set(solutionElements, {
        autoAlpha: 0,
        y: offset,
        filter: blurred,
      });
      if (visualRef.current) {
        setSolutionVisualProgress(visualRef.current, 0, Boolean(reducedMotion));
      }

      const setAccessibleState = (solutionIsVisible: boolean) => {
        if (showingSolution === solutionIsVisible) return;
        showingSolution = solutionIsVisible;
        problemElements.forEach((element) =>
          element.setAttribute('aria-hidden', String(solutionIsVisible)),
        );
        solutionElements.forEach((element) =>
          element.setAttribute('aria-hidden', String(!solutionIsVisible)),
        );
      };

      /*
       * Scroll owns ONLY the State 1 -> State 2 transformation. State 1's three
       * failed attempts run on their own autoplay clock inside the visual, so no
       * scroll distance has to be reserved for them and this mapping stays the
       * one that was already approved.
       */
      const syncScrollProgress = (progress: number) => {
        setAccessibleState(progress >= 0.45);
        if (visualRef.current) {
          const visualProgress = Math.min(
            1,
            Math.max(0, (progress - 0.25) / 0.4),
          );
          setSolutionVisualProgress(
            visualRef.current,
            visualProgress,
            Boolean(reducedMotion),
          );
        }
      };

      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => (window.innerWidth < 1024 ? '+=125%' : '+=150%'),
          pin: true,
          pinSpacing: true,
          // Scroll position IS transformation position. `scrub` follows the
          // pointer and lands exactly where scrolling stopped; there is
          // deliberately no `snap`, because snapping animates the scroll
          // position itself to fixed points and takes control away from the
          // user. Every intermediate progress value is a valid composition, so
          // the incomplete-rest-state that snapping used to guard against can
          // no longer occur.
          scrub: 0.18,
          anticipatePin: 1,
          fastScrollEnd: true,
          invalidateOnRefresh: true,
          onUpdate: ({ progress }) => syncScrollProgress(progress),
          onRefresh: ({ progress }) => syncScrollProgress(progress),
        },
      });

      // 0–25% holds Problem while its failure loop autoplays. The overlapping
      // transition keeps the scene continuous, then 65–100% holds Solution
      // before the pin releases.
      timeline
        .to(
          problemElements,
          {
            autoAlpha: 0,
            y: -offset,
            filter: blurred,
            duration: 0.25,
          },
          0.25,
        )
        .to(
          solutionElements,
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.25,
          },
          0.4,
        )
        .to({}, { duration: 0.35 }, 0.65);
    }, section);

    return () => context.revert();
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

  return (
    <section ref={sectionRef} className="relative h-[100svh] w-full bg-canvas">
      <div className="flex h-full w-full items-center justify-center overflow-hidden px-5 sm:px-8 md:px-16 min-[744px]:px-0 lg:px-[131px]">
        <div className="flex w-full max-w-[1178px] flex-col items-center gap-[clamp(16px,2svh,24px)] min-[744px]:absolute min-[744px]:left-[50vw] min-[744px]:top-1/2 min-[744px]:w-[680px] min-[744px]:-translate-x-1/2 min-[744px]:-translate-y-1/2 min-[744px]:gap-8 lg:static lg:w-full lg:translate-x-0 lg:translate-y-0 lg:gap-[clamp(20px,4svh,48px)]">
          <div className="relative h-[clamp(58px,8svh,84px)] w-full">
            <h2
              data-problem-state
              className="absolute inset-0 flex items-center justify-center text-center text-section font-normal text-text-primary will-change-[transform,filter,opacity]"
            >
              Your workflow breaks between environments.
            </h2>
            <h2
              data-solution-state
              aria-hidden="true"
              className="invisible absolute inset-0 flex items-center justify-center text-center text-section font-normal text-text-primary will-change-[transform,filter,opacity]"
            >
              One workspace. Every environment.
            </h2>
          </div>

          <div className="flex h-[min(260px,34svh)] w-full items-center min-[744px]:h-[320px] lg:h-[min(350px,40svh)]">
            <div className="w-full origin-center scale-[1.2] md:scale-100">
              <SolutionVisual
                ref={visualRef}
                reducedMotion={Boolean(reducedMotion)}
              />
            </div>
          </div>

          <div className="relative min-h-[110px] w-full md:min-h-[132px] lg:min-h-[78px]">
            <div
              data-problem-state
              className="absolute inset-x-0 top-0 will-change-[transform,filter,opacity]"
            >
              <ProblemDetails />
            </div>
            <div
              data-solution-state
              aria-hidden="true"
              className="invisible absolute inset-x-0 top-0 flex justify-center will-change-[transform,filter,opacity]"
            >
              <p className="max-w-[387px] text-center text-[14px] leading-[20px] text-text-primary">
                <span className="block whitespace-nowrap">
                  One unified directory, mirrored everywhere.
                </span>
                <span className="block whitespace-nowrap">
                  Attach it to any machine and your workspace is just there.
                </span>
                <span className="block whitespace-nowrap">
                  Files on demand, secrets included, and the same
                </span>
                <span className="block whitespace-nowrap">
                  view for agents through CLI and MCP.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
