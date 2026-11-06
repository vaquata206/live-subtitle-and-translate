/**
 * Streaming downsampler: Float32 mono at `inputRate` → Int16 PCM at `outputRate`.
 * Uses box-filter averaging and keeps fractional state across chunks so chunk
 * boundaries don't introduce drift.
 */
export class PcmDownsampler {
  private readonly ratio: number;
  private carry: Float32Array = new Float32Array(0);
  private position = 0;

  constructor(
    readonly inputRate: number,
    readonly outputRate = 16000,
  ) {
    if (outputRate > inputRate) throw new Error('Upsampling is not supported');
    this.ratio = inputRate / outputRate;
  }

  process(input: Float32Array): Int16Array {
    const data = new Float32Array(this.carry.length + input.length);
    data.set(this.carry, 0);
    data.set(input, this.carry.length);

    const out: number[] = [];
    let pos = this.position;
    while (pos + this.ratio <= data.length) {
      const start = Math.floor(pos);
      const end = Math.floor(pos + this.ratio);
      let sum = 0;
      let count = 0;
      for (let i = start; i < end; i++) {
        sum += data[i];
        count++;
      }
      out.push(floatToInt16(count ? sum / count : data[start]));
      pos += this.ratio;
    }

    const consumed = Math.floor(pos);
    this.carry = data.slice(consumed);
    this.position = pos - consumed;
    return Int16Array.from(out);
  }

  reset(): void {
    this.carry = new Float32Array(0);
    this.position = 0;
  }
}

export function floatToInt16(sample: number): number {
  const s = Math.max(-1, Math.min(1, sample));
  return s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
}
