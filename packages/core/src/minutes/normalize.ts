import type { ActionItem, MeetingMinutes, MinutesTopic, RefItem } from '../types';
import { parseTimestamp } from './transcriptText';

export interface NormalizeContext {
  title: string;
  date: number;
  durationMinutes: number;
  participants: string[];
}

const MAX_ITEMS = 50;

function str(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return /^(null|none|n\/a|unknown|không rõ|chưa rõ)$/i.test(s) ? '' : s;
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const s = str(item).replace(/^[-•*]\s+/, '');
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  }
  return out.slice(0, MAX_ITEMS);
}

function refs(v: unknown, maxSeconds: number): number[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<number>();
  for (const r of v) {
    const sec = typeof r === 'number' ? r : typeof r === 'string' ? parseTimestamp(r) : NaN;
    if (Number.isFinite(sec) && sec >= 0 && sec <= maxSeconds + 60) out.add(Math.floor(sec));
  }
  return [...out].sort((a, b) => a - b).slice(0, 5);
}

function objList<T>(v: unknown, map: (o: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    if (item && typeof item === 'object') {
      const mapped = map(item as Record<string, unknown>);
      if (mapped) out.push(mapped);
    } else if (typeof item === 'string') {
      const mapped = map({ text: item, task: item, title: item });
      if (mapped) out.push(mapped);
    }
  }
  return out.slice(0, MAX_ITEMS);
}

/** Validates and repairs model output into `MeetingMinutes`. Facts like date/duration come from the session. */
export function normalizeMinutes(raw: unknown, ctx: NormalizeContext): MeetingMinutes {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const maxSec = ctx.durationMinutes * 60;
  const topics = objList<MinutesTopic>(o.topics, (t) => {
    const title = str(t.title);
    const points = strList(t.points);
    return title || points.length ? { title, points, refs: refs(t.refs, maxSec) } : null;
  });
  const decisions = objList<RefItem>(o.decisions, (d) => {
    const text = str(d.text);
    return text ? { text, refs: refs(d.refs, maxSec) } : null;
  });
  const actionItems = objList<ActionItem>(o.actionItems, (a) => {
    const task = str(a.task);
    return task ? { task, owner: str(a.owner), due: str(a.due), refs: refs(a.refs, maxSec) } : null;
  });
  const participants = strList(o.participants);
  return {
    title: str(o.title) || ctx.title,
    date: ctx.date,
    durationMinutes: ctx.durationMinutes,
    participants: participants.length ? participants : ctx.participants,
    summary: str(o.summary),
    topics,
    decisions,
    actionItems,
    openQuestions: strList(o.openQuestions),
    nextSteps: strList(o.nextSteps),
  };
}

export function emptyMinutes(ctx: NormalizeContext): MeetingMinutes {
  return normalizeMinutes({}, ctx);
}

/** Translates every free-text field (not names) with the given function. */
export async function translateMinutes(
  m: MeetingMinutes,
  translate: (text: string) => Promise<string>,
): Promise<MeetingMinutes> {
  const tr = (s: string) => (s ? translate(s) : Promise.resolve(s));
  const trList = (list: string[]) => Promise.all(list.map(tr));
  const [title, summary, topics, decisions, actionItems, openQuestions, nextSteps] = await Promise.all([
    tr(m.title),
    tr(m.summary),
    Promise.all(m.topics.map(async (t) => ({ ...t, title: await tr(t.title), points: await trList(t.points) }))),
    Promise.all(m.decisions.map(async (d) => ({ ...d, text: await tr(d.text) }))),
    Promise.all(m.actionItems.map(async (a) => ({ ...a, task: await tr(a.task), due: await tr(a.due) }))),
    trList(m.openQuestions),
    trList(m.nextSteps),
  ]);
  return { ...m, title, summary, topics, decisions, actionItems, openQuestions, nextSteps };
}
