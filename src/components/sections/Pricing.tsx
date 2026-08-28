import { Fragment } from 'react';
import FadeIn from '../ui/FadeIn';
import PricingCard from '../ui/PricingCard';

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
  return (
    <section className="w-full bg-[#fafafa] px-6 py-[100px] lg:px-[131px]">
      <div className="mx-auto flex max-w-[1144px] flex-col items-center gap-16">
        <FadeIn className="flex w-full flex-col items-center gap-2.5 text-center">
          <h2 className="text-section font-normal text-text-primary">
            Simple pricing. Built for teams of any size.
          </h2>
          <p className="max-w-[490px] text-[12px] leading-[18px] text-text-primary">
            <span className="block">
              Start free. Upgrade when you need more. All plans include end-to-end
            </span>
            <span className="block">encryption and on-demand file access.</span>
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="w-full">
          <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:flex lg:items-end lg:gap-3">
            {plans.map((plan, index) => (
              <Fragment key={plan.name}>
                {index > 0 && (
                  <div
                    aria-hidden="true"
                    className="hidden w-[0.5px] self-stretch bg-black/10 lg:block"
                  />
                )}
                <PricingCard {...plan} />
              </Fragment>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
