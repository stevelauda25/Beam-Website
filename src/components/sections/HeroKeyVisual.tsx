import keyVisualHero from '../../assets/hero/key-visual-hero.svg';

export default function HeroKeyVisual() {
  return (
    <div className="relative aspect-[1440/540] w-full overflow-hidden">
      <img
        src={keyVisualHero}
        alt="Beam workspace showing folders, files, and storage usage"
        className="h-full w-full object-contain"
        width={1440}
        height={540}
      />
    </div>
  );
}
