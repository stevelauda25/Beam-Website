interface SectionLabelProps {
  icon: string;
  label: string;
  className?: string;
}

export default function SectionLabel({ icon, label, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-[6px] text-[12px] font-normal leading-[18px] text-text-primary ${className}`}>
      <img src={icon} alt="" className="h-3 w-3 shrink-0" width={12} height={12} />
      <span>{label}</span>
    </div>
  );
}
