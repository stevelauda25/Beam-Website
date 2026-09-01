import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
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
      'Repositories, dependencies, and context have to be rebuilt before real work can begin.',
  },
  {
    icon: featureAgents,
    title: 'Agents repeat the cycle',
    description:
      'Ephemeral environments repeat the same setup again and again for every agent.',
  },
];

const solutionCopy =
  'One unified directory, mirrored everywhere. Attach it to any machine and your workspace is just there. Files on demand, secrets included, and the same view for agents through CLI and MCP.';

function ProblemDetails() {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {problemFeatures.map((feature) => (
        <FeatureItem
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </div>
  );
}

function MobileContent({ solution = false }: { solution?: boolean }) {
  return (
    <div className="flex w-full max-w-[1178px] flex-col items-center gap-12">
      <h2 className="text-center text-section font-normal text-text-primary">
        {solution
          ? 'One workspace. Every environment.'
          : 'Your workflow breaks between environments.'}
      </h2>
      <SolutionVisual progress={solution ? 1 : 0} />
      {solution ? (
        <p className="max-w-[387px] text-center text-[12px] leading-[18px] text-text-primary">
          {solutionCopy}
        </p>
      ) : (
        <ProblemDetails />
      )}
    </div>
  );
}

export default function ProblemSolution() {
  const sectionRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [usePinnedScene, setUsePinnedScene] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) =>
      setUsePinnedScene(event.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!usePinnedScene || !section) return;

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
          scrub: 0.18,
          snap: reducedMotion
            ? undefined
            : {
                // Directional scene stops prevent the pinned section from
                // resting on an incomplete, blurred transformation.
                snapTo: [0, 0.25, 0.65, 1],
                directional: true,
                duration: { min: 0.12, max: 0.3 },
                delay: 0.04,
                ease: 'power2.out',
                inertia: false,
              },
          anticipatePin: 1,
          fastScrollEnd: true,
          invalidateOnRefresh: true,
          onUpdate: ({ progress }) => syncScrollProgress(progress),
          onRefresh: ({ progress }) => syncScrollProgress(progress),
        },
      });

      // 0–25% holds Problem. The overlapping transition keeps the scene
      // continuous, then 65–100% holds Solution before the pin releases.
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
  }, [reducedMotion, usePinnedScene]);

  useEffect(() => {
    if (!usePinnedScene) return;

    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
    };
  }, [usePinnedScene]);

  if (!usePinnedScene) {
    return (
      <section className="w-full overflow-hidden bg-canvas">
        <div className="flex justify-center px-5 py-16 sm:px-8 sm:py-20">
          <MobileContent />
        </div>
        <div className="flex justify-center px-5 py-16 sm:px-8 sm:py-20">
          <MobileContent solution />
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative h-[100svh] w-full bg-canvas">
      <div className="flex h-full w-full items-center justify-center overflow-hidden px-8 md:px-16 lg:px-[131px]">
        <div className="flex w-full max-w-[1178px] flex-col items-center gap-[clamp(20px,4svh,48px)]">
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

          <div className="flex h-[min(350px,40svh)] w-full items-center">
            <SolutionVisual
              ref={visualRef}
              reducedMotion={Boolean(reducedMotion)}
            />
          </div>

          <div className="relative min-h-[132px] w-full lg:min-h-[78px]">
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
              <p className="max-w-[387px] text-center text-[12px] leading-[18px] text-text-primary">
                {solutionCopy}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
