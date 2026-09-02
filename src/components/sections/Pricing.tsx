import { Fragment, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FadeIn from '../ui/FadeIn';
import PricingCard from '../ui/PricingCard';

const MOBILE_CAROUSEL_PADDING = 32;

const plans = [
  {
    name: 'Free',
    description: 'For individuals getting started.',
    price: '$0',
    period: '/ month',
    features: [
      '5 GB storage',
      'Unlimited workspaces',
      'Web, CLI, MCP access',
      'On-demand files',
      'Secrets management',
      'Community support',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    description: 'For solo builders and power users.',
    price: '$8',
    period: '/ month',
    features: [
      '50 GB storage',
      'Everything in Free',
      'Version history (30 days)',
      'Advanced search',
      'Priority support',
    ],
    cta: 'Start Pro',
  },
  {
    name: 'Team',
    description: 'For growing teams.',
    price: '$15',
    period: '/ month',
    features: [
      '200 GB storage per user',
      'Everything in Pro',
      'Version history (90 days)',
      'Team permissions',
      'Audit logs',
      'Shared billing',
    ],
    cta: 'Start Team',
    recommended: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations.',
    price: 'Custom',
    period: '/ year',
    features: [
      'Custom storage',
      'Everything in Team',
      'SAML SSO',
      'SCIM provisioning',
      'Custom data region',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
  },
];

export default function Pricing() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activePlan, setActivePlan] = useState(0);

  const getCards = () => {
    if (!carouselRef.current) return [];
    return Array.from(
      carouselRef.current.querySelectorAll<HTMLElement>('[data-pricing-card]'),
    );
  };

  const updateActivePlan = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const targetLeft =
      carousel.getBoundingClientRect().left + MOBILE_CAROUSEL_PADDING;
    const cards = getCards();
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - targetLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActivePlan(nearestIndex);
  };

  const scrollToPlan = (index: number) => {
    const carousel = carouselRef.current;
    const cards = getCards();
    const nextIndex = Math.max(0, Math.min(index, cards.length - 1));
    const card = cards[nextIndex];
    if (!carousel || !card) return;

    carousel.scrollTo({
      left:
        carousel.scrollLeft +
        card.getBoundingClientRect().left -
        carousel.getBoundingClientRect().left -
        MOBILE_CAROUSEL_PADDING,
      behavior: 'smooth',
    });
    setActivePlan(nextIndex);
  };

  return (
    <section className="w-full bg-[#fafafa] px-5 py-12 sm:px-8 sm:py-20 lg:px-[131px] lg:py-[100px]">
      <div className="mx-auto flex max-w-[1144px] flex-col items-center gap-6 lg:gap-16">
        <FadeIn className="flex w-full flex-col items-center gap-2.5 text-center">
          <h2 className="text-section font-normal text-text-primary">
            <span className="block">Simple pricing.</span>
            <span className="block">Built for teams of any size.</span>
          </h2>
          <p className="max-w-[490px] text-[12px] leading-[18px] text-text-primary">
            Start free. Upgrade when you need more. All plans include end-to-end
            encryption and on-demand file access.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="w-full">
          <div
            ref={carouselRef}
            onScroll={updateActivePlan}
            role="region"
            aria-label="Pricing plans"
            aria-roledescription="carousel"
            className="-mx-5 flex w-[calc(100%+40px)] snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-8 pb-2 [scroll-padding-inline:32px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:w-full sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:flex lg:items-end lg:gap-3"
          >
            {plans.map((plan, index) => (
              <Fragment key={plan.name}>
                {index > 0 && (
                  <div
                    aria-hidden="true"
                    className="hidden w-[0.5px] self-stretch bg-black/10 lg:block"
                  />
                )}
                <PricingCard
                  {...plan}
                  className={`w-[calc(100vw-64px)] shrink-0 snap-start transition-opacity duration-300 sm:w-auto sm:shrink sm:opacity-100 ${
                    activePlan === index ? 'opacity-100' : 'opacity-35'
                  }`}
                />
              </Fragment>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => scrollToPlan(activePlan - 1)}
              disabled={activePlan === 0}
              aria-label="Show previous pricing plan"
              className="flex h-8 w-8 items-center justify-center text-text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft aria-hidden="true" size={14} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => scrollToPlan(activePlan + 1)}
              disabled={activePlan === plans.length - 1}
              aria-label="Show next pricing plan"
              className="flex h-8 w-8 items-center justify-center text-text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight aria-hidden="true" size={14} strokeWidth={1.5} />
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
