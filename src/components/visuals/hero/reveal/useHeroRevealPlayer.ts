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
  HERO_REDUCED_STEP_MS,
  HERO_REVEAL_DEFAULTS,
  heroReducedSteps,
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
  /**
   * Whether the sequence is worth drawing right now.
   *
   * THE CLOCK IS NOT THE RENDERER. `false` keeps the clock advancing on exactly
   * the same arithmetic but stops publishing it to React, so the tree is not
   * re-rendered and nothing downstream recalculates style, lays out or paints.
   * When it flips back to `true` the whole elapsed interval is applied in one
   * update, so the sequence resumes at the time that really passed rather than
   * where it was left — no rewind, no freeze, no replay.
   *
   * Defaults to `true`, which is the previous behaviour exactly; Motion Lab and
   * the dev preview switch never pass it and are unaffected.
   */
  render = true,
): HeroRevealPlayer {
  const reducedMotion = usePrefersReducedMotion();
  const HERO_REVEAL_DURATION = heroRevealDuration(tuning);
  /* Representative frames follow the tuning (including the initial hold). */
  const HERO_REDUCED_STEPS = heroReducedSteps(tuning);
  const [time, setTime] = useState(reducedMotion ? HERO_REDUCED_STEPS[0] : 0);
  const [playing, setPlaying] = useState(autoplay && !reducedMotion);
  const [stepIndex, setStepIndex] = useState(0);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  /*
   * Elapsed milliseconds that the clock has advanced but React has not been
   * told about yet, because the sequence was not being drawn. Always a sum of
   * the same per-frame clamped deltas the visible path uses, so a hidden
   * stretch and a visible stretch of equal length advance the clock equally.
   */
  const deferred = useRef(0);
  const renderRef = useRef(render);
  renderRef.current = render;

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
      // Clamp the delta so a backgrounded tab does not jump the sequence.
      const delta = Math.min(now - prev, 64);
      /*
       * Off screen: bank the time and return. The frame callback itself is the
       * only cost that remains — no state update, so no render, no DOM write,
       * no style, layout or paint for a subtree nobody can see.
       */
      if (!renderRef.current) {
        deferred.current += delta;
        raf.current = window.requestAnimationFrame(step);
        return;
      }
      setTime((t) => {
        const next = t + deferred.current + delta;
        deferred.current = 0;
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

  /*
   * Became drawable again: apply everything banked while hidden in one update,
   * so the first frame the visitor can see is the state the timeline is really
   * at. The observer that drives `render` opens early (see HeroRevealHero), so
   * this lands before the sequence is actually on screen.
   */
  useEffect(() => {
    if (!render || deferred.current === 0) return;
    const banked = deferred.current;
    deferred.current = 0;
    setTime((t) => {
      const next = t + banked;
      if (next >= HERO_REVEAL_DURATION) {
        setPlaying(false);
        return HERO_REVEAL_DURATION;
      }
      return next;
    });
  }, [render, HERO_REVEAL_DURATION]);

  const play = useCallback(() => {
    if (reducedMotion) {
      setStepIndex(0);
      setTime(HERO_REDUCED_STEPS[0]);
      return;
    }
    deferred.current = 0;
    setTime((t) => (t >= HERO_REVEAL_DURATION ? 0 : t));
    setPlaying(true);
  }, [reducedMotion]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const restart = useCallback(() => {
    deferred.current = 0;
    setPlaying(false);
    setTime(0);
  }, []);
  const replay = useCallback(() => {
    if (reducedMotion) {
      setStepIndex(0);
      setTime(HERO_REDUCED_STEPS[0]);
      return;
    }
    deferred.current = 0;
    setTime(0);
    setPlaying(true);
  }, [reducedMotion]);
  const seek = useCallback((ms: number) => {
    deferred.current = 0;
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
