/**
 * DialKit proof — DEV ONLY, lab-only.
 *
 * This is NOT a Beam production component and never will be. It exists purely
 * to verify DialKit's panel + timeline wiring inside the Motion Lab:
 *
 *   - parameter panel: numeric slider, grouped folder, spring control
 *   - timeline: three named clips (enter / settle / exit) that play, pause,
 *     replay, scrub, and seek deterministically
 *
 * It deliberately animates a plain lab shape rather than a production visual,
 * so verifying DialKit cannot change any Beam animation.
 *
 * No production component imports this file, DialKit, or anything in src/dev.
 */
import { useDialKit, useDialTimeline } from 'dialkit';
import styles from '../MotionLab.module.css';

export function DialKitProof() {
  // Parameter panel — verifies slider, folder grouping, and spring controls.
  const params = useDialKit('Proof · parameters', {
    size: [140, 60, 280],
    label: 'DialKit proof',
    box: {
      radius: [20, 0, 80],
      borderWidth: [2, 0, 12],
      opacity: [1, 0, 1],
    },
    spring: {
      type: 'spring',
      visualDuration: 0.5,
      bounce: 0.2,
    },
  });

  // TODO(production): DialKit's clip.current values are the scrubbable authoring
  // preview. When a real Beam animation is authored here, replace them with the
  // production animation system using the tuned timings and transitions, then
  // remove useDialTimeline and <DialTimeline />. Nothing in this proof ships.
  const proof = useDialTimeline(
    'Proof · timeline',
    {
      enter: {
        at: 0,
        duration: 0.5,
        from: { y: 28, scale: 0.9, opacity: 0 },
        to: { y: 0, scale: 1, opacity: 1 },
        transition: { type: 'spring', visualDuration: 0.5, bounce: 0.2 },
      },
      settle: {
        at: 0.6,
        duration: 0.45,
        from: { rotate: -8 },
        to: { rotate: 0 },
        transition: { type: 'easing', duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        at: 1.5,
        duration: 0.35,
        from: { opacity: 1, y: 0 },
        to: { opacity: 0, y: -20 },
        transition: { type: 'easing', duration: 0.35, ease: [0.55, 0, 1, 0.45] },
      },
    },
    {
      id: 'beam-motion-lab-proof-v1',
      persist: import.meta.env.DEV,
      autoplay: false,
    },
  );

  const enter = proof.enter.current;
  const settle = proof.settle.current;
  const exit = proof.exit.current;

  // The lab owns composition across clips — DialKit does not compose them.
  const opacity = Math.min(enter.opacity, exit.opacity) * params.box.opacity;
  const y = enter.y + exit.y;

  return (
    <div className={styles.proofStage}>
      <div
        className={styles.proofShape}
        style={{
          width: params.size,
          height: params.size,
          borderRadius: params.box.radius,
          borderWidth: params.box.borderWidth,
          opacity,
          transform: `translateY(${y}px) scale(${enter.scale}) rotate(${settle.rotate}deg)`,
        }}
      >
        {params.label}
      </div>

      <div className={styles.proofTransport}>
        <button type="button" className={styles.chip} onClick={() => proof.play()}>
          Play
        </button>
        <button type="button" className={styles.chip} onClick={() => proof.pause()}>
          Pause
        </button>
        <button type="button" className={styles.chip} onClick={() => proof.replay()}>
          Replay
        </button>
        <button type="button" className={styles.chip} onClick={() => proof.seek(0.6)}>
          Seek 0.6s
        </button>
        <span className={styles.statusHint}>
          Scrub the timeline dock below — the shape updates deterministically from the playhead.
        </span>
      </div>
    </div>
  );
}
