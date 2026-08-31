import { CSSProperties, ReactNode } from 'react';

interface FeatureItemProps {
  icon: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function FeatureItem({
  icon,
  title,
  description,
  children,
  className = '',
  style,
}: FeatureItemProps) {
  return (
    <div className={`flex items-start gap-[6px] ${className}`} style={style}>
      <div className="flex shrink-0 items-center py-1">
        <div className="flex h-3 w-3 items-center justify-center overflow-hidden">
          <img src={icon} alt="" className="max-h-full max-w-full" />
        </div>
      </div>
      <div className="flex flex-col text-[12px] leading-[20px]">
        <span className="whitespace-pre-line font-normal text-text-primary">
          {title}
        </span>
        {description && (
          <span className="text-text-secondary">{description}</span>
        )}
        {children && <div className="text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}
