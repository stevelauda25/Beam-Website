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
      className={`flex min-w-0 flex-col items-start overflow-hidden rounded-[2.83px] px-3 ${
        recommended
          ? 'lg:w-[277.25px] lg:shrink-0'
          : 'lg:flex-1'
      } ${className}`}
    >
      <div className="flex w-full flex-col justify-center text-[12px] leading-[18px]">
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

      <div
        className={`flex w-full flex-col pt-3 ${
          recommended ? 'min-h-[194px] pb-5' : 'min-h-[193px]'
        }`}
      >
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
              <span className="text-[12px] leading-[18px] text-text-primary lg:whitespace-nowrap">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="pricing">
        {cta}
      </Button>
    </div>
  );
}
