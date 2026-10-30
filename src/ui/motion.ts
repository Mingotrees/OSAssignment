export const motionTokens = {
  duration: {
    instant: 0.08,
    fast: 0.18,
    normal: 0.35,
    slow: 0.6,
    crawl: 1,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    linear: [0, 0, 1, 1] as [number, number, number, number],
  },
  distance: {
    xs: 4,
    sm: 8,
  },
  scale: {
    press: 0.95,
  },
};

export const springs = {
  snappy: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

export function timelineTransition(start: number, end: number, total: number, reducedMotion: boolean) {
  const duration = reducedMotion || total <= 0 ? 0 : motionTokens.duration.crawl / total;
  return {
    delay: start * duration,
    duration: (end - start) * duration,
    ease: motionTokens.easing.linear,
  };
}
