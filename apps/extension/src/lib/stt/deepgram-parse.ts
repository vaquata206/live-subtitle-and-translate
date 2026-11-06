import type { Segment } from '@lst/core/types';

export interface DeepgramWord {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  speaker?: number;
  language?: string;
}

export interface DeepgramResults {
  type: 'Results';
  start: number;
  duration: number;
  is_final?: boolean;
  speech_final?: boolean;
  channel: {
    alternatives: Array<{ transcript: string; words?: DeepgramWord[]; languages?: string[] }>;
    detected_language?: string;
  };
  metadata?: unknown;
}

export interface ParsedResult {
  isFinal: boolean;
  segments: Segment[];
}

/**
 * Converts a Deepgram `Results` message into segments. Final results are split
 * into runs of consecutive words from the same speaker so each segment has a
 * single speaker label. Times are shifted by `offset` seconds.
 */
export function parseDeepgramResults(msg: DeepgramResults, offset: number, makeId: () => string): ParsedResult {
  const alt = msg.channel?.alternatives?.[0];
  const isFinal = !!msg.is_final;
  const transcript = alt?.transcript?.trim() ?? '';
  if (!alt || !transcript) return { isFinal, segments: [] };

  const fallbackLang = alt.languages?.[0] ?? msg.channel.detected_language;
  const words = alt.words ?? [];

  if (words.length === 0) {
    return {
      isFinal,
      segments: [
        {
          id: makeId(),
          speaker: null,
          text: transcript,
          start: offset + msg.start,
          end: offset + msg.start + msg.duration,
          isFinal,
          language: fallbackLang,
        },
      ],
    };
  }

  if (!isFinal) {
    return {
      isFinal,
      segments: [
        {
          id: makeId(),
          speaker: words[0].speaker ?? null,
          text: transcript,
          start: offset + words[0].start,
          end: offset + words[words.length - 1].end,
          isFinal,
          language: words[0].language ?? fallbackLang,
        },
      ],
    };
  }

  const segments: Segment[] = [];
  let run: DeepgramWord[] = [];
  const flush = () => {
    if (!run.length) return;
    segments.push({
      id: makeId(),
      speaker: run[0].speaker ?? null,
      text: run.map((w) => w.punctuated_word ?? w.word).join(' '),
      start: offset + run[0].start,
      end: offset + run[run.length - 1].end,
      isFinal: true,
      language: majority(run.map((w) => w.language)) ?? fallbackLang,
    });
    run = [];
  };
  for (const w of words) {
    if (run.length && (w.speaker ?? null) !== (run[0].speaker ?? null)) flush();
    run.push(w);
  }
  flush();
  return { isFinal, segments };
}

function majority(values: Array<string | undefined>): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

export interface DeepgramOptions {
  model: string;
  language: string;
  diarize: boolean;
  sampleRate: number;
}

export function buildDeepgramUrl(opts: DeepgramOptions): string {
  const params = new URLSearchParams({
    model: opts.model,
    language: opts.language,
    encoding: 'linear16',
    sample_rate: String(opts.sampleRate),
    channels: '1',
    interim_results: 'true',
    smart_format: 'true',
    punctuate: 'true',
    endpointing: '300',
    utterance_end_ms: '1000',
    vad_events: 'true',
  });
  if (opts.diarize) params.set('diarize', 'true');
  return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
}
