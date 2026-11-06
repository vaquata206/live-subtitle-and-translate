import { describe, expect, it } from 'vitest';
import { floatToInt16, PcmDownsampler } from '../src/lib/audio/pcm';

describe('floatToInt16', () => {
  it('clamps and scales', () => {
    expect(floatToInt16(0)).toBe(0);
    expect(floatToInt16(1)).toBe(32767);
    expect(floatToInt16(-1)).toBe(-32768);
    expect(floatToInt16(2)).toBe(32767);
    expect(floatToInt16(-5)).toBe(-32768);
  });
});

describe('PcmDownsampler', () => {
  it('downsamples 48k → 16k with exact sample count across chunks', () => {
    const ds = new PcmDownsampler(48000, 16000);
    let total = 0;
    for (let i = 0; i < 10; i++) total += ds.process(new Float32Array(4800).fill(0.5)).length;
    expect(total).toBe(16000);
  });

  it('handles non-integer ratios (44.1k) without drift', () => {
    const ds = new PcmDownsampler(44100, 16000);
    let total = 0;
    for (let i = 0; i < 100; i++) total += ds.process(new Float32Array(441)).length;
    // 44100 input samples = 1 second → ~16000 output samples
    expect(Math.abs(total - 16000)).toBeLessThanOrEqual(1);
  });

  it('averages samples (box filter)', () => {
    const ds = new PcmDownsampler(48000, 16000);
    const out = ds.process(Float32Array.from([0, 0.3, 0.6, 1, 1, 1]));
    expect(Array.from(out)).toEqual([floatToInt16(0.3), floatToInt16(1)]);
  });

  it('rejects upsampling', () => {
    expect(() => new PcmDownsampler(8000, 16000)).toThrow();
  });
});
