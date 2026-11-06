import type { ViewMode } from '../settings';
import type { Session } from '../types';
import { speakerLabel } from './session';

/** `HH:MM:SS` (clock style) */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** `HH:MM:SS,mmm` (SRT style) */
export function formatSrtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(rest).padStart(3, '0')}`;
}

function linesFor(text: string, translation: string | undefined, mode: ViewMode): string[] {
  switch (mode) {
    case 'original':
      return [text];
    case 'translation':
      return [translation || text];
    default:
      return translation ? [text, translation] : [text];
  }
}

export function toTxt(session: Session, mode: ViewMode = 'bilingual'): string {
  const header = [session.title, new Date(session.startedAt).toLocaleString(), session.url ?? ''].filter(Boolean);
  header.push('');
  const body = session.segments.map((seg) => {
    const who = speakerLabel(session, seg.speaker);
    const prefix = `[${formatClock(seg.start)}]${who ? ` ${who}:` : ''}`;
    const [first, second] = linesFor(seg.text, seg.translation, mode);
    return second ? `${prefix} ${first}\n    → ${second}` : `${prefix} ${first}`;
  });
  return [...header, ...body].join('\n') + '\n';
}

export function toSrt(session: Session, mode: ViewMode = 'bilingual'): string {
  return session.segments
    .map((seg, i) => {
      const who = speakerLabel(session, seg.speaker);
      const end = seg.end > seg.start ? seg.end : seg.start + 2;
      const lines = linesFor(seg.text, seg.translation, mode);
      if (who) lines[0] = `${who}: ${lines[0]}`;
      return `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(end)}\n${lines.join('\n')}\n`;
    })
    .join('\n');
}

export function exportFileName(session: Session, ext: 'txt' | 'srt'): string {
  const d = new Date(session.startedAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const safe =
    session.title
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || 'meeting';
  return `${safe} ${stamp}.${ext}`;
}
