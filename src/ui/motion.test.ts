import { describe, expect, it } from 'vitest';
import { motionTokens, timelineTransition } from './motion';

describe('timelineTransition', () => {
  it('reveals consecutive segments at the same rate as the progress line', () => {
    const first = timelineTransition(0, 5, 22, false);
    const next = timelineTransition(5, 8, 22, false);
    const last = timelineTransition(21, 22, 22, false);

    expect(first.delay).toBe(0);
    expect(first.delay + first.duration).toBeCloseTo(next.delay);
    expect(first.duration / 5).toBeCloseTo(next.duration / 3);
    expect(last.delay + last.duration).toBeCloseTo(motionTokens.duration.crawl);
    expect(last.ease).toEqual(motionTokens.easing.linear);
  });

  it('shows every segment immediately with reduced motion', () => {
    expect(timelineTransition(21, 22, 22, true)).toMatchObject({ delay: 0, duration: 0 });
  });

  it('does not produce invalid timing for an empty schedule', () => {
    expect(timelineTransition(0, 0, 0, false)).toMatchObject({ delay: 0, duration: 0 });
  });
});
