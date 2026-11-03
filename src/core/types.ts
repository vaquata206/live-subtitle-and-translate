export interface Segment {
  id: string;
  /** Diarized speaker index (0-based), or null when unknown. */
  speaker: number | null;
  text: string;
  /** Seconds since the capture session started. */
  start: number;
  end: number;
  isFinal: boolean;
  /** Detected/declared source language (BCP-47), when known. */
  language?: string;
  translation?: string;
  translationError?: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  url?: string;
  startedAt: number;
  endedAt?: number;
  segmentCount: number;
}

export interface Session extends SessionMeta {
  segments: Segment[];
  speakerNames: Record<number, string>;
  sourceLanguage: string;
  targetLanguage: string;
}

export type CaptureStatus =
  | 'idle'
  | 'starting'
  | 'connecting'
  | 'listening'
  | 'reconnecting'
  | 'error'
  | 'stopped';

export interface CaptureState {
  status: CaptureStatus;
  tabId?: number;
  sessionId?: string;
  message?: string;
}
