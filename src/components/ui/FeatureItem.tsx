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
        <img
          src={icon}
          alt=""
          className="h-3 w-3"
          width={12}
          height={12}
        />
      </div>
      <div className="flex flex-col text-[12px] leading-[20px]">
        <span className="font-normal text-text-primary">{title}</span>
        {description && (
          <span className="text-text-secondary">{description}</span>
        )}
        {children && <div className="text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}
