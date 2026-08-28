interface KeyVisualPlaceholderProps {
  className?: string;
  label?: string;
}

export default function KeyVisualPlaceholder({
  className = '',
  label = 'Key visual placeholder',
}: KeyVisualPlaceholderProps) {
  return (
    <div
      className={`bg-[#dcdcdc] ${className}`}
      role="img"
      aria-label={label}
    />
  );
}
