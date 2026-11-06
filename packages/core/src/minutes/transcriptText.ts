import { speakerLabel } from '../transcript/session';
import type { Session } from '../types';

export interface TranscriptLine {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface BuildLinesOptions {
  /** Index of the first segment to include. */
  fromSegment?: number;
  /** Consecutive segments from the same speaker closer than this (s) are merged. */
  mergeGapSec?: number;
  maxLineChars?: number;
}

/** Merges consecutive final segments of the same speaker into compact transcript lines. */
export function buildLines(
  session: Pick<Session, 'segments' | 'speakerNames'>,
  opts: BuildLinesOptions = {},
): TranscriptLine[] {
  const { fromSegment = 0, mergeGapSec = 8, maxLineChars = 800 } = opts;
  const lines: TranscriptLine[] = [];
  for (const seg of session.segments.slice(fromSegment)) {
    const text = seg.text.trim();
    if (!text) continue;
    const speaker = speakerLabel(session, seg.speaker);
    const last = lines[lines.length - 1];
    if (
      last &&
      last.speaker === speaker &&
      seg.start - last.end <= mergeGapSec &&
      last.text.length + text.length + 1 <= maxLineChars
    ) {
      last.text += ` ${text}`;
      last.end = Math.max(last.end, seg.end);
    } else {
      lines.push({ start: seg.start, end: seg.end, speaker, text });
    }
  }
  return lines;
}

/** `m:ss` or `h:mm:ss` */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Parses `m:ss`, `mm:ss`, `h:mm:ss` (optionally in brackets) to seconds; NaN when invalid. */
export function parseTimestamp(value: string): number {
  const m = /^\[?\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s*\]?$/.exec(value.trim());
  if (!m) return NaN;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function formatLine(line: TranscriptLine): string {
  return `[${formatTimestamp(line.start)}] ${line.speaker ? `${line.speaker}: ` : ''}${line.text}`;
}

export function linesToText(lines: TranscriptLine[]): string {
  return lines.map(formatLine).join('\n');
}

export function sessionParticipants(session: Pick<Session, 'segments' | 'speakerNames'>): string[] {
  const seen = new Set<number>();
  for (const seg of session.segments) if (seg.speaker !== null && seg.speaker !== undefined) seen.add(seg.speaker);
  return [...seen].sort((a, b) => a - b).map((s) => speakerLabel(session, s));
}
