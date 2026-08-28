import FadeIn from '../ui/FadeIn';
import SectionLabel from '../ui/SectionLabel';
import FeatureItem from '../ui/FeatureItem';
import keyVisualSecrets from '../../assets/hero/key-visual-secrets.svg';
import secretsIcon from '../../assets/icons/secrets.svg';
import toggleActive from '../../assets/icons/toggle-active.svg';

const features = [
  {
    className: 'lg:w-[301px]',
    title:
      'Encrypted at rest with AES-256-GCM,\nnever stored in snapshots, chunks, or logs',
  },
  {
    className: 'lg:w-[358px]',
    title:
      'Scoped to org, workspace, and profile (dev,\nstaging, prod), so a token only unlocks what it needs',
  },
  {
    className: 'lg:w-[325px]',
    title:
      'Every read is audit-logged, and rotating a key\nreaches every live workspace in under 30 seconds',
  },
];

export default function Secrets() {
  return (
    <section className="w-full overflow-hidden bg-canvas px-8 py-[100px] lg:px-[131px]">
      <div className="mx-auto flex max-w-[1178px] flex-col items-center gap-8">
        <FadeIn className="flex flex-col items-center gap-3 text-center">
          <SectionLabel icon={secretsIcon} label="Secrets" />
          <h2 className="max-w-[460px] text-section font-normal text-text-primary">
            Env vars that travel, without leaving a trace
          </h2>
          <p className="max-w-[490px] text-[12px] leading-[18px] text-text-primary">
            Agents get the same view of your files as you do, through the CLI and
            an MCP server, authenticated with scoped tokens you can revoke at any
            time.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="w-full">
          <img
            src={keyVisualSecrets}
            alt="A Beam workspace mounting encrypted environment variables on a new machine"
            className="h-auto w-full"
            width={1178}
            height={484}
          />
        </FadeIn>

        <FadeIn delay={0.1} className="w-full">
          <div className="flex w-full flex-col justify-center gap-8 lg:flex-row lg:gap-8">
            {features.map((feature) => (
              <FeatureItem
                key={feature.title.slice(0, 24)}
                icon={toggleActive}
                title={feature.title}
                className={`max-w-full ${feature.className}`}
              />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
