import { languageName } from '../languages';
import { extractJson, estimateTokens, type Summarizer } from '../summarize/Summarizer';
import type { LiveSummary, MeetingMinutes, Session } from '../types';
import { chunkLines, groupByBudget, hashText } from './chunk';
import { normalizeMinutes, translateMinutes, type NormalizeContext } from './normalize';
import {
  liveSummarySystemPrompt,
  liveSummaryUserPrompt,
  mergeNotesSystemPrompt,
  MINUTES_SCHEMA,
  minutesSystemPrompt,
  minutesUserPrompt,
  notesSystemPrompt,
} from './prompts';
import { buildLines, linesToText, sessionParticipants } from './transcriptText';

export type MinutesStage = 'map' | 'merge' | 'final' | 'translate';

export interface MinutesProgress {
  stage: MinutesStage;
  done: number;
  total: number;
}

export interface GenerateMinutesOptions {
  template: string;
  language: string;
  extraInstructions?: string;
  signal?: AbortSignal;
  onProgress?: (p: MinutesProgress) => void;
  /** Map-step notes from a previous run; unchanged chunks are not re-sent. */
  cache?: Record<string, string>;
  /** Used when the summarizer can't write `language` directly (e.g. Gemini Nano). */
  translate?: (text: string) => Promise<string>;
}

export interface GenerateMinutesResult {
  minutes: MeetingMinutes;
  /** Notes actually used in this run (keeps the stored cache bounded). */
  cache: Record<string, string>;
  outputLanguage: string;
}

const NOTES_CACHE_VERSION = 'v1';

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Đã huỷ', 'AbortError');
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export function minutesContext(session: Session): NormalizeContext {
  const last = session.segments[session.segments.length - 1];
  const fromSegments = last ? last.end / 60 : 0;
  const fromClock = session.endedAt ? (session.endedAt - session.startedAt) / 60000 : 0;
  return {
    title: session.title,
    date: session.startedAt,
    durationMinutes: Math.max(1, Math.round(Math.max(fromSegments, fromClock))),
    participants: sessionParticipants(session),
  };
}

/** Estimated transcript tokens, for cost hints before generating. */
export function estimateSessionTokens(session: Session): number {
  return estimateTokens(linesToText(buildLines(session)));
}

/** Map-reduce generation of structured meeting minutes. */
export async function generateMinutes(
  session: Session,
  summarizer: Summarizer,
  opts: GenerateMinutesOptions,
): Promise<GenerateMinutesResult> {
  const lines = buildLines(session);
  if (!lines.length) throw new Error('Chưa có nội dung transcript để tạo biên bản.');

  const outputLanguage = summarizer.supportsOutputLanguage(opts.language) ? opts.language : 'en';
  const ctx = minutesContext(session);
  const promptCtx = {
    title: ctx.title,
    date: new Date(ctx.date).toISOString().slice(0, 10),
    durationMinutes: ctx.durationMinutes,
    participants: ctx.participants,
  };
  const budget = await summarizer.inputBudget();
  const cacheOut: Record<string, string> = {};

  let body = linesToText(lines);
  let isNotes = false;

  if (estimateTokens(body) > budget) {
    const chunks = chunkLines(lines, budget);
    let done = 0;
    opts.onProgress?.({ stage: 'map', done, total: chunks.length });
    let notes = await mapLimit(chunks, summarizer.concurrency, async (chunk) => {
      throwIfAborted(opts.signal);
      const text = linesToText(chunk);
      const key = hashText(`${NOTES_CACHE_VERSION}|${opts.template}|${text}`);
      let out = opts.cache?.[key];
      if (!out) {
        out = await summarizer.generate({ system: notesSystemPrompt(opts.template), prompt: text, signal: opts.signal });
      }
      cacheOut[key] = out;
      opts.onProgress?.({ stage: 'map', done: ++done, total: chunks.length });
      return out;
    });

    // Condense notes until they fit into a single final request.
    for (let round = 0; round < 4 && estimateTokens(notes.join('\n')) > budget; round++) {
      const groups = groupByBudget(notes, budget);
      if (groups.length >= notes.length) break;
      let merged = 0;
      opts.onProgress?.({ stage: 'merge', done: 0, total: groups.length });
      notes = await mapLimit(groups, summarizer.concurrency, async (group) => {
        throwIfAborted(opts.signal);
        const out = await summarizer.generate({
          system: mergeNotesSystemPrompt(),
          prompt: group.join('\n\n'),
          signal: opts.signal,
        });
        opts.onProgress?.({ stage: 'merge', done: ++merged, total: groups.length });
        return out;
      });
    }
    body = notes.map((n, i) => `Part ${i + 1}:\n${n}`).join('\n\n');
    isNotes = true;
  }

  throwIfAborted(opts.signal);
  opts.onProgress?.({ stage: 'final', done: 0, total: 1 });
  const system = minutesSystemPrompt(opts.template, languageName(outputLanguage), opts.extraInstructions);
  const prompt = minutesUserPrompt(promptCtx, body, isNotes);
  let raw: unknown;
  try {
    raw = extractJson(await summarizer.generate({ system, prompt, schema: MINUTES_SCHEMA, signal: opts.signal }));
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    // One retry: models occasionally emit malformed JSON.
    raw = extractJson(
      await summarizer.generate({
        system,
        prompt: `${prompt}\n\nReturn ONLY valid JSON matching the requested keys.`,
        schema: MINUTES_SCHEMA,
        signal: opts.signal,
      }),
    );
  }
  opts.onProgress?.({ stage: 'final', done: 1, total: 1 });
  let minutes = normalizeMinutes(raw, ctx);

  if (outputLanguage !== opts.language && opts.translate) {
    throwIfAborted(opts.signal);
    opts.onProgress?.({ stage: 'translate', done: 0, total: 1 });
    minutes = await translateMinutes(minutes, opts.translate);
    opts.onProgress?.({ stage: 'translate', done: 1, total: 1 });
  }
  return { minutes, cache: cacheOut, outputLanguage: opts.translate ? opts.language : outputLanguage };
}

export interface LiveSummaryOptions {
  language: string;
  previous?: LiveSummary;
  signal?: AbortSignal;
  translate?: (text: string) => Promise<string>;
}

/** Incrementally folds new transcript lines into the running summary. */
export async function updateLiveSummary(
  session: Session,
  summarizer: Summarizer,
  opts: LiveSummaryOptions,
): Promise<LiveSummary> {
  const prev = opts.previous && opts.previous.language === opts.language ? opts.previous : undefined;
  const fromSegment = prev ? Math.min(prev.upToSegment, session.segments.length) : 0;
  const lines = buildLines(session, { fromSegment });
  if (prev && !lines.length) return prev;
  if (!lines.length) throw new Error('Chưa có nội dung transcript để tóm tắt.');

  const working = summarizer.supportsOutputLanguage(opts.language) ? opts.language : 'en';
  const needsTranslate = working !== opts.language && !!opts.translate;
  let summary = prev ? (prev.workingText ?? prev.text) : '';
  const system = liveSummarySystemPrompt(languageName(working));
  const budget = await summarizer.inputBudget();

  for (const chunk of chunkLines(lines, Math.max(500, budget - estimateTokens(summary) - 200), 0)) {
    throwIfAborted(opts.signal);
    summary = await summarizer.generate({
      system,
      prompt: liveSummaryUserPrompt(summary, linesToText(chunk)),
      signal: opts.signal,
    });
  }
  const text = needsTranslate ? await translateBullets(summary, opts.translate!) : summary;
  return {
    text,
    workingText: needsTranslate ? summary : undefined,
    upToSegment: session.segments.length,
    language: needsTranslate ? opts.language : working,
    updatedAt: Date.now(),
  };
}

async function translateBullets(text: string, translate: (t: string) => Promise<string>): Promise<string> {
  const lines = text.split('\n');
  const out = await Promise.all(
    lines.map(async (line) => {
      const m = /^(\s*[-•*]\s+)(.*)$/.exec(line);
      if (!m) return line.trim() ? translate(line) : line;
      return `${m[1]}${await translate(m[2])}`;
    }),
  );
  return out.join('\n');
}
