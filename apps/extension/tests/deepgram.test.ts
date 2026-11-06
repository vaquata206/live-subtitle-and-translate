import { describe, expect, it } from 'vitest';
import { buildDeepgramUrl, parseDeepgramResults, type DeepgramResults } from '../src/lib/stt/deepgram-parse';

let n = 0;
const id = () => `id${++n}`;

function results(
  partial: Partial<DeepgramResults> & {
    words?: DeepgramResults['channel']['alternatives'][0]['words'];
    transcript?: string;
  },
): DeepgramResults {
  return {
    type: 'Results',
    start: partial.start ?? 0,
    duration: partial.duration ?? 2,
    is_final: partial.is_final,
    channel: { alternatives: [{ transcript: partial.transcript ?? '', words: partial.words }] },
  };
}

describe('parseDeepgramResults', () => {
  it('returns nothing for empty transcript', () => {
    expect(parseDeepgramResults(results({ transcript: '  ', is_final: true }), 0, id).segments).toEqual([]);
  });

  it('splits final results by speaker runs and applies offset', () => {
    const msg = results({
      is_final: true,
      transcript: 'hello there hi',
      words: [
        { word: 'hello', punctuated_word: 'Hello', start: 1, end: 1.4, speaker: 0, language: 'en' },
        { word: 'there', punctuated_word: 'there.', start: 1.4, end: 1.8, speaker: 0, language: 'en' },
        { word: 'hi', punctuated_word: 'Hi!', start: 2.1, end: 2.4, speaker: 1, language: 'en' },
      ],
    });
    const { isFinal, segments } = parseDeepgramResults(msg, 10, id);
    expect(isFinal).toBe(true);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      speaker: 0,
      text: 'Hello there.',
      start: 11,
      end: 11.8,
      isFinal: true,
      language: 'en',
    });
    expect(segments[1]).toMatchObject({ speaker: 1, text: 'Hi!', start: 12.1, end: 12.4 });
  });

  it('returns a single interim segment', () => {
    const msg = results({
      is_final: false,
      transcript: 'good morning',
      words: [
        { word: 'good', start: 0.5, end: 0.8, speaker: 2 },
        { word: 'morning', start: 0.8, end: 1.2, speaker: 3 },
      ],
    });
    const { isFinal, segments } = parseDeepgramResults(msg, 0, id);
    expect(isFinal).toBe(false);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ text: 'good morning', speaker: 2, isFinal: false });
  });

  it('falls back to message timing when words are missing', () => {
    const { segments } = parseDeepgramResults(
      results({ is_final: true, transcript: 'ok', start: 3, duration: 1 }),
      2,
      id,
    );
    expect(segments[0]).toMatchObject({ speaker: null, start: 5, end: 6 });
  });
});

describe('buildDeepgramUrl', () => {
  it('includes required streaming params', () => {
    const url = new URL(buildDeepgramUrl({ model: 'nova-3', language: 'multi', diarize: true, sampleRate: 16000 }));
    expect(url.protocol).toBe('wss:');
    expect(url.searchParams.get('encoding')).toBe('linear16');
    expect(url.searchParams.get('sample_rate')).toBe('16000');
    expect(url.searchParams.get('interim_results')).toBe('true');
    expect(url.searchParams.get('diarize')).toBe('true');
    expect(url.searchParams.get('language')).toBe('multi');
  });

  it('omits diarize when disabled', () => {
    const url = new URL(buildDeepgramUrl({ model: 'nova-2', language: 'vi', diarize: false, sampleRate: 16000 }));
    expect(url.searchParams.has('diarize')).toBe(false);
  });
});
