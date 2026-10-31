// ============================================
// DIAMOND Playback Hook
// ============================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useEventStore } from '@/store/eventStore';

export type PlaybackState = 'idle' | 'playing' | 'paused';

export function usePlayback() {
  const [state, setState] = useState<PlaybackState>('idle');
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const progressRef = useRef(0);
  const setCurrentStep = useEventStore((s) => s.setCurrentStep);
  const events = useEventStore((s) => s.allEvents);

  const { timelineStart, timelineEnd, totalDurationMs } = useMemo(() => {
    if (events.length === 0) {
      const now = Date.now();
      return { timelineStart: now, timelineEnd: now, totalDurationMs: 1 };
    }

    const timestamps = events.map((event) => new Date(event.timestamp).getTime());
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDurationMs: Math.max(1, end - start),
    };
  }, [events]);

  const totalSteps = events.length;
  const currentTimestamp = timelineStart + (timelineEnd - timelineStart) * progress;
  const currentStep = useMemo(
    () => events.filter((event) => new Date(event.timestamp).getTime() <= currentTimestamp).length,
    [currentTimestamp, events],
  );

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  const setPlaybackProgress = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    progressRef.current = clamped;
    setProgress(clamped);
  }, []);

  // Sync step with store
  useEffect(() => {
    setCurrentStep(currentStep);
  }, [currentStep, setCurrentStep]);

  const tick = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const delta = (timestamp - lastTimeRef.current) * speed;
      lastTimeRef.current = timestamp;

      const next = progressRef.current + delta / totalDurationMs;
      if (next >= 1) {
        setPlaybackProgress(1);
        setState('paused');
        animFrameRef.current = 0;
        return;
      }

      setPlaybackProgress(next);
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [setPlaybackProgress, speed, totalDurationMs],
  );

  const play = useCallback(() => {
    stopAnimation();
    if (progressRef.current >= 1) {
      setPlaybackProgress(0);
    }
    setState('playing');
    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(tick);
  }, [setPlaybackProgress, stopAnimation, tick]);

  const pause = useCallback(() => {
    setState('paused');
    stopAnimation();
  }, [stopAnimation]);

  const resume = useCallback(() => {
    stopAnimation();
    setState('playing');
    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(tick);
  }, [stopAnimation, tick]);

  const restart = useCallback(() => {
    stopAnimation();
    setPlaybackProgress(0);
    setState('playing');
    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(tick);
  }, [setPlaybackProgress, stopAnimation, tick]);

  const scrubTo = useCallback(
    (p: number) => {
      const clamped = Math.max(0, Math.min(1, p));
      setPlaybackProgress(clamped);
      lastTimeRef.current = 0;
      if (state !== 'playing') {
        setState('paused');
      }
    },
    [setPlaybackProgress, state],
  );

  const togglePlayPause = useCallback(() => {
    if (state === 'playing') {
      pause();
    } else {
      if (state === 'idle' || progress >= 1) {
        play();
      } else {
        resume();
      }
    }
  }, [state, progress, play, pause, resume]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  // When speed changes during playback, restart the animation loop
  useEffect(() => {
    if (state === 'playing') {
      stopAnimation();
      lastTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(tick);
    }
  }, [speed, state, stopAnimation, tick]);

  return {
    state,
    speed,
    progress,
    currentStep,
    currentTimestamp: new Date(currentTimestamp).toISOString(),
    totalSteps,
    setSpeed,
    play,
    pause,
    resume,
    restart,
    scrubTo,
    togglePlayPause,
  };
}
