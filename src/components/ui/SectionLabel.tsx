interface SectionLabelProps {
  label: string;
  className?: string;
}

export default function SectionLabel({ label, className = '' }: SectionLabelProps) {
  return (
    <div className={`text-[12px] font-normal leading-[18px] text-text-primary ${className}`}>
      {label}
    </div>
  );
}
