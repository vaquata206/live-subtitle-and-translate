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
  summary?: SummaryState;
}

/** Item that can point back to moments (seconds since session start) in the transcript. */
export interface RefItem {
  text: string;
  refs: number[];
}

export interface MinutesTopic {
  title: string;
  points: string[];
  refs: number[];
}

export interface ActionItem {
  task: string;
  owner: string;
  due: string;
  refs: number[];
}

export interface MeetingMinutes {
  title: string;
  /** Session start, epoch ms. */
  date: number;
  durationMinutes: number;
  participants: string[];
  summary: string;
  topics: MinutesTopic[];
  decisions: RefItem[];
  actionItems: ActionItem[];
  openQuestions: string[];
  nextSteps: string[];
}

export interface MinutesMeta {
  provider: string;
  model: string;
  template: string;
  language: string;
  generatedAt: number;
  edited: boolean;
}

export interface LiveSummary {
  text: string;
  /** Summary in the model's working language when it differs from `language` (then `text` is translated). */
  workingText?: string;
  /** Number of final segments covered by `text`. */
  upToSegment: number;
  language: string;
  updatedAt: number;
}

export interface SummaryState {
  live?: LiveSummary;
  minutes?: MeetingMinutes;
  minutesMeta?: MinutesMeta;
  /** Map-step notes cache keyed by a hash of (chunk text, template, language). */
  chunkNotes?: Record<string, string>;
}

export type CaptureStatus = 'idle' | 'starting' | 'connecting' | 'listening' | 'reconnecting' | 'error' | 'stopped';

export interface CaptureState {
  status: CaptureStatus;
  tabId?: number;
  sessionId?: string;
  message?: string;
}
