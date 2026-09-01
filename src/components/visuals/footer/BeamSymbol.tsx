import { useId } from 'react';

type BeamSymbolProps = {
  className?: string;
  hoverShineClassName?: string;
  shineClassName?: string;
  variant?: 'outline' | 'metal';
};

const paths = [
  'M576.423 161.901C580.605 158.515 585.837 157.039 590.942 157.475C591.288 157.502 591.624 157.538 591.969 157.583C594.218 157.884 595.214 160.684 593.646 162.263L589.689 166.188C587.263 168.589 583.353 168.627 580.871 166.3L576.423 161.901Z',
  'M596.505 165.314C598.384 163.455 601.15 162.987 603.473 163.929C604.366 164.292 605.073 164.987 605.638 165.768C607.942 168.957 609.191 172.67 609.376 176.418C609.421 177.199 609.412 177.978 609.358 178.76C609.087 182.787 607.579 186.745 604.852 190.045L592.716 178.035C590.214 175.559 590.214 171.54 592.716 169.064L596.505 165.314Z',
  'M577.819 168.981C580.321 171.457 580.321 175.458 577.819 177.934L573.916 181.788C572.286 183.337 569.483 182.354 569.179 180.133C569.134 179.802 569.097 179.462 569.07 179.129L569.034 178.64C568.728 173.751 570.232 168.764 573.551 164.759L577.819 168.981Z',
  'M580.798 180.865C583.3 178.389 587.342 178.389 589.844 180.865L601.991 192.886C598.655 195.598 594.651 197.085 590.577 197.353C589.787 197.407 589 197.415 588.215 197.371C584.422 197.188 580.678 195.952 577.457 193.67C576.669 193.112 575.965 192.412 575.595 191.52C574.643 189.222 575.107 186.49 576.99 184.634L580.798 180.865Z',
];

export function BeamSymbol({
  className,
  hoverShineClassName,
  shineClassName,
  variant = 'outline',
}: BeamSymbolProps) {
  const id = useId().replace(/:/g, '');
  const metalId = `beam-metal-${id}`;
  const shineId = `beam-shine-${id}`;
  const clipId = `beam-clip-${id}`;

  return (
    <svg
      className={className}
      viewBox="567.2 155.4 44 44"
      fill="none"
      aria-hidden="true"
    >
      {variant === 'metal' ? (
        <defs>
          <linearGradient
            id={metalId}
            x1="575"
            y1="159"
            x2="603"
            y2="196"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFFFFF" />
            <stop offset="0.38" stopColor="#ECECEC" />
            <stop offset="0.7" stopColor="#A9A9A9" />
            <stop offset="1" stopColor="#F7F7F7" />
          </linearGradient>
          <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="0.3" stopColor="white" stopOpacity="0.12" />
            <stop offset="0.5" stopColor="#fffdf7" stopOpacity="0.98" />
            <stop offset="0.7" stopColor="white" stopOpacity="0.18" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            {paths.map((path) => (
              <path d={path} key={`clip-${path}`} />
            ))}
          </clipPath>
        </defs>
      ) : null}

      {paths.map((path) => (
        <path
          d={path}
          fill={variant === 'metal' ? `url(#${metalId})` : 'none'}
          stroke={
            variant === 'metal' ? 'rgba(255,255,255,.72)' : 'currentColor'
          }
          strokeWidth={variant === 'metal' ? 0.45 : 0.85}
          key={path}
        />
      ))}

      {variant === 'metal' && (shineClassName || hoverShineClassName) ? (
        <g clipPath={`url(#${clipId})`}>
          <rect
            className={shineClassName}
            x="545"
            y="145"
            width="22"
            height="70"
            fill={`url(#${shineId})`}
          />
          <rect
            className={hoverShineClassName}
            x="545"
            y="145"
            width="22"
            height="70"
            fill={`url(#${shineId})`}
          />
        </g>
      ) : null}
    </svg>
  );
}
