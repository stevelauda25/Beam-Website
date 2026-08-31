import Navbar from '../components/sections/Navbar';
import Hero from '../components/sections/Hero';
import ProblemSolution from '../components/sections/ProblemSolution';
import Sync from '../components/sections/Sync';
import OnDemand from '../components/sections/OnDemand';
import Agents from '../components/sections/Agents';
import ShareHost from '../components/sections/ShareHost';
import Secrets from '../components/sections/Secrets';
import Pricing from '../components/sections/Pricing';
import Footer from '../components/sections/Footer';

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-canvas">
      <Navbar />
      <Hero />
      <ProblemSolution />
      <Sync />
      <OnDemand />
      <Agents />
      <ShareHost />
      <Secrets />
      <Pricing />
      <Footer />
    </main>
  );
}
