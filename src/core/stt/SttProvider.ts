import type { Segment } from '../types';

export type SttStatus = 'connecting' | 'listening' | 'reconnecting' | 'error' | 'closed';

export interface SttCallbacks {
  onInterim(segment: Segment): void;
  onFinal(segments: Segment[]): void;
  onStatus(status: SttStatus, message?: string): void;
}

/** A streaming speech-to-text backend fed with 16 kHz mono PCM16 audio. */
export interface SttProvider {
  readonly id: string;
  readonly sampleRate: number;
  start(): Promise<void>;
  sendAudio(pcm: Int16Array): void;
  stop(): Promise<void>;
}
