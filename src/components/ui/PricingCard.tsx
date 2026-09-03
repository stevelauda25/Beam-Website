import Button from './Button';
import checkIcon from '../../assets/icons/pricing/check.svg';

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  recommended?: boolean;
  className?: string;
}

export default function PricingCard({
  name,
  description,
  price,
  period,
  features,
  cta,
  recommended,
  className = '',
}: PricingCardProps) {
  return (
    <div
      data-pricing-card
      className={`flex h-full min-w-0 flex-col items-start overflow-visible rounded-[2.83px] px-3 min-[744px]:px-0 lg:h-auto lg:px-3 ${
        recommended
          ? 'lg:w-[277.25px] lg:shrink-0'
          : 'lg:flex-1'
      } ${className}`}
    >
      <div className="flex w-full flex-col justify-center text-[14px] leading-[20px]">
        <div className="flex items-center justify-between">
          <span className="text-text-primary">{name}</span>
          {recommended && (
            <span className="inline-flex items-center gap-1 overflow-hidden rounded-full bg-[#3d3d3d] px-2 py-1 shadow-[inset_0_0_0_0.6px_rgba(0,0,0,0.5),inset_0_0.5px_2px_rgba(255,255,255,0.6),inset_0_-0.5px_0.5px_rgba(0,0,0,0.5)]">
              <span className="flex items-center justify-center whitespace-nowrap pb-px text-center text-[10px] font-normal leading-none text-white">
                Recommended
              </span>
            </span>
          )}
        </div>
        <span className="text-text-secondary tracking-[-0.12px]">
          {description}
        </span>
      </div>

      <div className="w-full pt-5">
        <div className="flex items-baseline gap-0.5 whitespace-nowrap text-text-primary">
          <span className="text-price">{price}</span>
          <span className="text-[12px] leading-[18px]">{period}</span>
        </div>
      </div>

      <div className="flex min-h-[193px] w-full flex-1 flex-col pt-3 sm:min-h-[205px] sm:pb-6 lg:min-h-[193px] lg:pb-0">
        <div className="flex w-full flex-col gap-1.5">
          <span className="text-[12px] leading-[18px] text-text-muted">Include:</span>
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-[7px]">
              <img
                src={checkIcon}
                alt=""
                className="h-3 w-3 shrink-0"
                width={12}
                height={12}
              />
              <span className="text-[14px] leading-[20px] text-text-primary lg:whitespace-nowrap">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        className="dark-button-interaction mt-3 h-[34px] w-full !px-[14px] !py-0 !leading-none whitespace-nowrap"
      >
        {cta}
      </Button>
    </div>
  );
}
