import FadeIn from '../ui/FadeIn';
import FeatureItem from '../ui/FeatureItem';
import keyVisualProblem from '../../assets/key-visuals/problem/problem.svg';
import featureGit from '../../assets/icons/features/feature-git.svg';
import featureSecrets from '../../assets/icons/features/feature-secrets.svg';
import featureColdstart from '../../assets/icons/features/feature-coldstart.svg';
import featureAgents from '../../assets/icons/features/feature-agents.svg';

const features = [
  {
    icon: featureGit,
    title: 'Git isn’t sync',
    description: 'You need temporary commits just to move unfinished work.',
  },
  {
    icon: featureSecrets,
    title: 'Secrets don’t travel',
    description: 'Your code arrives, but the environment it needs often doesn’t.',
  },
  {
    icon: featureColdstart,
    title: 'Cold starts are slow',
    description:
      'Repositories, dependencies, and context have to be rebuilt before real work can begin.',
  },
  {
    icon: featureAgents,
    title: 'Agents repeat the cycle',
    description:
      'Ephemeral environments repeat the same setup again and again for every agent.',
  },
];

export default function Problem() {
  return (
    <section className="w-full bg-canvas px-8 py-[100px] lg:px-[131px]">
      <div className="mx-auto flex max-w-[1178px] flex-col items-center gap-12">
        <FadeIn>
          <h2 className="text-center text-section font-normal text-text-primary">
            Your workflow breaks between environments.
          </h2>
        </FadeIn>

        <FadeIn delay={0.05} className="w-full">
          <img
            src={keyVisualProblem}
            alt="A local machine and new environment separated by repeated setup steps"
            className="h-auto w-full"
            width={1178}
            height={350}
          />
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <FeatureItem
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
