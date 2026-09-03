import { Suspense, lazy } from 'react';
import Home from './pages/Home';

/**
 * DEV-ONLY route seam for the Motion Lab (`/dev/motion-lab`).
 *
 * `import.meta.env.DEV` is statically replaced with `false` in a production
 * build, so this ternary collapses to `null` and Rollup drops both the branch
 * and the dynamic import — the lab is never bundled or reachable in production.
 *
 * The project has no router, and this deliberately does not add one.
 */
const MotionLab = import.meta.env.DEV
  ? lazy(() => import('./dev/motion-lab/MotionLab'))
  : null;

function isMotionLabRoute() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/dev/motion-lab');
}

export default function App() {
  if (MotionLab && isMotionLabRoute()) {
    return (
      <Suspense fallback={null}>
        <MotionLab />
      </Suspense>
    );
  }

  return <Home />;
}
