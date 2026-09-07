/**
 * Playback for the hero reveal.
 *
 * The sequence is a pure function of time, so this only has to own a clock.
 * Play, pause, restart and scrub are all "set the time"; nothing can desync.
 *
 * Reduced motion: the player STEPS through representative frames with hard
 * cuts instead of tweening, and ends on the settled workspace. Section 6
 * (Reduced Motion) requires "gentler, not zero" and, for explanatory visuals,
 * jumping between states "so the visitor still receives every state" — parking
 * straight at the end would withhold the explanation rather than soften it.
 * No movement is interpolated; only the states change.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HERO_REDUCED_STEPS,
  HERO_REDUCED_STEP_MS,
  HERO_REVEAL_DEFAULTS,
  heroRevealDuration,
  type HeroRevealTuning,
} from './heroRevealTimeline';

export type HeroRevealPlayer = {
  time: number;
  playing: boolean;
  reducedMotion: boolean;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Back to 0, paused. */
  restart: () => void;
  /** Back to 0 and play. */
  replay: () => void;
  seek: (ms: number) => void;
};

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function useHeroRevealPlayer(
  autoplay = true,
  /** Motion Lab only — lets the clock follow a tuned sequence length. */
  tuning: HeroRevealTuning = HERO_REVEAL_DEFAULTS,
): HeroRevealPlayer {
  const reducedMotion = usePrefersReducedMotion();
  const HERO_REVEAL_DURATION = heroRevealDuration(tuning);
  const [time, setTime] = useState(reducedMotion ? HERO_REDUCED_STEPS[0] : 0);
  const [playing, setPlaying] = useState(autoplay && !reducedMotion);
  const [stepIndex, setStepIndex] = useState(0);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  // Honour a mid-session change to the OS setting.
  useEffect(() => {
    if (!reducedMotion) return;
    setPlaying(false);
    setStepIndex(0);
    setTime(HERO_REDUCED_STEPS[0]);
  }, [reducedMotion]);

  /*
   * Reduced-motion stepper: hard cuts between representative frames, holding
   * each so it can be read, then resting on the settled workspace.
   */
  useEffect(() => {
    if (!reducedMotion) return undefined;
    if (stepIndex >= HERO_REDUCED_STEPS.length - 1) return undefined;
    const id = window.setTimeout(() => {
      const next = stepIndex + 1;
      setStepIndex(next);
      setTime(HERO_REDUCED_STEPS[next]);
    }, HERO_REDUCED_STEP_MS);
    return () => window.clearTimeout(id);
  }, [reducedMotion, stepIndex]);

  useEffect(() => {
    if (reducedMotion || !playing) {
      last.current = null;
      return undefined;
    }
    const step = (now: number) => {
      const prev = last.current ?? now;
      last.current = now;
      setTime((t) => {
        // Clamp the delta so a backgrounded tab does not jump the sequence.
        const next = t + Math.min(now - prev, 64);
        if (next >= HERO_REVEAL_DURATION) {
          setPlaying(false);
          return HERO_REVEAL_DURATION;
        }
        return next;
      });
      raf.current = window.requestAnimationFrame(step);
    };
    raf.current = window.requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) window.cancelAnimationFrame(raf.current);
      last.current = null;
    };
  }, [playing]);

  const play = useCallback(() => {
    if (reducedMotion) {
      setStepIndex(0);
      setTime(HERO_REDUCED_STEPS[0]);
      return;
    }
    setTime((t) => (t >= HERO_REVEAL_DURATION ? 0 : t));
    setPlaying(true);
  }, [reducedMotion]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const restart = useCallback(() => {
    setPlaying(false);
    setTime(0);
  }, []);
  const replay = useCallback(() => {
    if (reducedMotion) {
      setStepIndex(0);
      setTime(HERO_REDUCED_STEPS[0]);
      return;
    }
    setTime(0);
    setPlaying(true);
  }, [reducedMotion]);
  const seek = useCallback((ms: number) => {
    setPlaying(false);
    setTime(Math.max(0, Math.min(HERO_REVEAL_DURATION, ms)));
  }, []);

  return {
    time,
    playing,
    reducedMotion,
    duration: HERO_REVEAL_DURATION,
    play,
    pause,
    toggle,
    restart,
    replay,
    seek,
  };
}
