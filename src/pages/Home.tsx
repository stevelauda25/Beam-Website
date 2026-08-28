import Navbar from '../components/sections/Navbar';
import Hero from '../components/sections/Hero';
import Problem from '../components/sections/Problem';
import Solution from '../components/sections/Solution';
import Sync from '../components/sections/Sync';
import OnDemand from '../components/sections/OnDemand';
import Agents from '../components/sections/Agents';
import ShareHost from '../components/sections/ShareHost';
import Secrets from '../components/sections/Secrets';
import Pricing from '../components/sections/Pricing';
import Footer from '../components/sections/Footer';

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
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
