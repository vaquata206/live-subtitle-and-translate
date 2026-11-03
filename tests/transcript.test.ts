import { describe, expect, it } from 'vitest';
import { exportFileName, formatClock, formatSrtTime, toSrt, toTxt } from '../src/core/transcript/export';
import {
  applyFinalSegment,
  applyTranslation,
  createSession,
  renameSpeaker,
  speakerLabel,
  toMeta,
} from '../src/core/transcript/session';
import type { Segment, Session } from '../src/core/types';

const seg = (id: string, start: number, speaker: number | null, text: string, extra: Partial<Segment> = {}): Segment => ({
  id,
  start,
  end: start + 1.5,
  speaker,
  text,
  isFinal: true,
  ...extra,
});

function sample(): Session {
  let s = createSession({
    id: 'm1',
    title: 'Weekly sync',
    url: 'https://meet.google.com/abc',
    startedAt: new Date(2026, 9, 31, 10, 5).getTime(),
    sourceLanguage: 'multi',
    targetLanguage: 'vi',
  });
  s = applyFinalSegment(s, seg('a', 1.2, 0, 'Hello everyone.'));
  s = applyFinalSegment(s, seg('b', 3.5, 1, 'Hi!'));
  s = applyTranslation(s, 'a', 'Xin chào mọi người.', undefined);
  return s;
}

describe('session ops', () => {
  it('appends idempotently and keeps order', () => {
    let s = sample();
    s = applyFinalSegment(s, seg('a', 1.2, 0, 'dup'));
    s = applyFinalSegment(s, seg('z', 2.0, 0, 'between'));
    expect(s.segments.map((x) => x.id)).toEqual(['a', 'z', 'b']);
    expect(s.segmentCount).toBe(3);
    expect(toMeta(s).segmentCount).toBe(3);
  });

  it('applies translation errors', () => {
    const s = applyTranslation(sample(), 'b', undefined, 'rate limited');
    expect(s.segments[1].translationError).toBe('rate limited');
  });

  it('renames and resets speakers', () => {
    let s = renameSpeaker(sample(), 0, '  Alice ');
    expect(speakerLabel(s, 0)).toBe('Alice');
    expect(speakerLabel(s, 1)).toBe('Speaker 2');
    expect(speakerLabel(s, null)).toBe('');
    s = renameSpeaker(s, 0, '');
    expect(speakerLabel(s, 0)).toBe('Speaker 1');
  });
});

describe('time formatting', () => {
  it('formats clock and SRT times', () => {
    expect(formatClock(3725.9)).toBe('01:02:05');
    expect(formatSrtTime(3725.0456)).toBe('01:02:05,046');
    expect(formatSrtTime(-1)).toBe('00:00:00,000');
  });
});

describe('export', () => {
  it('exports bilingual TXT', () => {
    const txt = toTxt(renameSpeaker(sample(), 0, 'Alice'));
    expect(txt).toContain('Weekly sync');
    expect(txt).toContain('[00:00:01] Alice: Hello everyone.\n    → Xin chào mọi người.');
    expect(txt).toContain('[00:00:03] Speaker 2: Hi!');
  });

  it('exports translation-only TXT falling back to original', () => {
    const txt = toTxt(sample(), 'translation');
    expect(txt).toContain('Speaker 1: Xin chào mọi người.');
    expect(txt).toContain('Speaker 2: Hi!');
    expect(txt).not.toContain('Hello everyone');
  });

  it('exports SRT', () => {
    const srt = toSrt(sample());
    expect(srt).toBe(
      '1\n00:00:01,200 --> 00:00:02,700\nSpeaker 1: Hello everyone.\nXin chào mọi người.\n\n' +
        '2\n00:00:03,500 --> 00:00:05,000\nSpeaker 2: Hi!\n',
    );
  });

  it('exports original-only SRT', () => {
    expect(toSrt(sample(), 'original')).not.toContain('Xin chào');
  });

  it('builds safe file names', () => {
    const s = { ...sample(), title: 'Meet: a/b?' };
    expect(exportFileName(s, 'srt')).toBe('Meet a b 20261031-1005.srt');
  });
});
