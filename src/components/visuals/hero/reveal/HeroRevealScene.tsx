/**
 * Hero reveal — one static state of THE hero panel.
 *
 * This is the Figma-comparison surface: a single frozen state, no motion. It
 * resolves the authored scene into the same `HeroRevealFrame` the animated
 * sequence produces and hands it to the same `HeroCanvas`, so the review states
 * and the animation cannot drift apart.
 */
import { HeroCanvas } from './HeroCanvas';
import { findHeroRevealScene, type HeroRevealSceneId } from './heroRevealScenes';
import type { HeroRevealFrame } from './heroRevealTimeline';

/** The authored bar position in Figma's upload frame: 481.518 / 566.257. */
const AUTHORED_BAR = 0.8504;

/** Map an authored Figma state onto the frame the canvas renders. */
function frameForScene(id: HeroRevealSceneId): HeroRevealFrame {
  const scene = findHeroRevealScene(id);
  return {
    dim: scene.state.innerFill === '#ffffff' ? 0 : 1,
    overlay: scene.overlay
      ? { opacity: 1, copyOpacity: 1, armed: scene.id === 'drop-target' ? 1 : 0 }
      : null,
    dragStack: scene.dragStack
      ? {
          // The authored rest position: no entrance offset, no trailing lag.
          stackX: 0,
          stackY: 0,
          handX: 0,
          handY: 0,
          handOffsetX: 0,
          handOffsetY: 0,
          cardOpacity: 1,
          pointerOpacity: 1,
          pointerExitX: 0,
          pointerExitY: 0,
          // Scene 1 is the carry state, so the hand is closed.
          handOpen: 0,
        }
      : null,
    upload: scene.uploadToast
      ? {
          opacity: 1,
          // Label from the authored percent; the bar is decoupled here ONLY so
          // the authored frame can be compared against Figma as drawn.
          progress: scene.uploadToast.percent / 100,
          complete: 0,
        }
      : null,
    workspaceOpacity: scene.mountsLiveDemo ? 1 : 0,
  };
}

export function HeroRevealScene({ sceneId }: { sceneId: HeroRevealSceneId }) {
  const scene = findHeroRevealScene(sceneId);
  return (
    <HeroCanvas
      frame={frameForScene(sceneId)}
      uploadBarProgress={scene.uploadToast ? AUTHORED_BAR : undefined}
    />
  );
}
