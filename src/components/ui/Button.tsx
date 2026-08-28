import { ReactNode } from 'react';
import arrowRight from '../../assets/icons/arrow-right.svg';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'dark' | 'pricing';
  children: ReactNode;
  icon?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function Button({
  variant = 'secondary',
  children,
  icon,
  href,
  onClick,
  className = '',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1 rounded-full text-sm font-normal transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const variantClasses: Record<string, string> = {
    primary: `${base} border-[0.5px] border-black/20 px-3 py-2 text-[14px] text-white hover:opacity-90 focus-visible:ring-black`,
    secondary: `${base} border-[0.5px] border-black/10 bg-[#fafafa] px-3 py-2 text-[14px] text-black hover:bg-canvas focus-visible:ring-text-secondary`,
    dark: `${base} h-[34px] border-[0.5px] border-black/20 py-2.5 pl-4 pr-3 text-[14px] leading-none text-black hover:bg-neutral-100 focus-visible:ring-white`,
    pricing: `${base} h-[30px] w-full rounded-[34px] border border-[#0a0a0a] px-3.5 text-[12px] leading-[18px] text-white hover:opacity-90 focus-visible:ring-black`,
  };

  const backgroundStyle: Record<string, React.CSSProperties> = {
    primary: {
      backgroundImage:
        'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%), linear-gradient(90deg, #3d3d3d 0%, #3d3d3d 100%)',
      boxShadow:
        'inset 0px 0.5px 0.5px rgba(255,255,255,0.6), inset 0px -0.5px 0.5px rgba(0,0,0,0.5)',
    },
    secondary: {
      boxShadow:
        'inset 0px 0.5px 0.5px rgba(255,255,255,0.6), inset 0px -0.5px 0.5px rgba(0,0,0,0.5)',
    },
    dark: {
      backgroundImage:
        'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.1) 100%), linear-gradient(90deg, #ffffff 0%, #ffffff 100%)',
      boxShadow:
        'inset 0px 0.5px 0.5px rgba(0,0,0,0.6), inset 0px -0.5px 0.5px rgba(255,255,255,0.5)',
    },
    pricing: {
      backgroundImage:
        'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%), linear-gradient(90deg, #3d3d3d 0%, #3d3d3d 100%)',
      boxShadow:
        '0px 8px 16px -6px rgba(0,0,0,0.04), 0px 6px 12px -6px rgba(0,0,0,0.06), 0px 4px 8px -4px rgba(0,0,0,0.08), 0px 1px 2px rgba(0,0,0,0.10), inset 0px -0.5px 0.5px rgba(0,0,0,0.1)',
    },
  };

  const classes = `${variantClasses[variant]} ${className}`;

  const content = (
    <>
      {children}
      {icon && (
        <img
          src={arrowRight}
          alt=""
          className="h-3 w-3 shrink-0"
          width={12}
          height={12}
        />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        style={backgroundStyle[variant]}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      style={backgroundStyle[variant]}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
