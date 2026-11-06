import { describe, expect, it, vi } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { Packer } from 'docx';
import { chunkLines, groupByBudget, hashText } from '../src/core/minutes/chunk';
import { buildMinutesDocument, minutesDocxFileName } from '../src/core/minutes/docx';
import { normalizeMinutes, translateMinutes } from '../src/core/minutes/normalize';
import { generateMinutes, minutesContext, updateLiveSummary } from '../src/core/minutes/pipeline';
import { MINUTES_SCHEMA, minutesSystemPrompt } from '../src/core/minutes/prompts';
import { buildLines, formatTimestamp, linesToText, parseTimestamp } from '../src/core/minutes/transcriptText';
import { DEFAULT_SETTINGS } from '../src/core/settings';
import { summarizerConfigError } from '../src/core/summarize';
import { OpenAiCompatibleSummarizer, normalizeBaseUrl } from '../src/core/summarize/openaiCompatible';
import { extractJson, type GenerateRequest, type Summarizer } from '../src/core/summarize/Summarizer';
import type { Segment, Session } from '../src/core/types';

function seg(id: string, start: number, speaker: number | null, text: string): Segment {
  return { id, start, end: start + 2, speaker, text, isFinal: true };
}

function makeSession(segments: Segment[], names: Record<number, string> = {}): Session {
  return {
    id: 'm1',
    title: 'Sprint review',
    startedAt: new Date(2026, 10, 3, 9, 0).getTime(),
    segmentCount: segments.length,
    segments,
    speakerNames: names,
    sourceLanguage: 'multi',
    targetLanguage: 'vi',
  };
}

const MINUTES_JSON = {
  title: 'Sprint review',
  participants: ['Lan', 'Minh'],
  summary: 'Team agreed to launch on the 20th.',
  topics: [{ title: 'Launch date', points: ['Payment bugs found'], refs: ['0:10'] }],
  decisions: [{ text: 'Launch on the 20th', refs: ['0:12'] }],
  actionItems: [{ task: 'Fix payment bugs', owner: 'Minh', due: 'Friday', refs: ['0:14'] }],
  openQuestions: [],
  nextSteps: ['Update marketing plan'],
};

function fakeSummarizer(opts: { budget?: number; langs?: string[] } = {}) {
  const calls: GenerateRequest[] = [];
  const s: Summarizer = {
    id: 'fake',
    model: 'fake-model',
    concurrency: 2,
    supportsOutputLanguage: (l) => (opts.langs ? opts.langs.includes(l) : true),
    inputBudget: async () => opts.budget ?? 10_000,
    async generate(req) {
      calls.push(req);
      if (req.signal?.aborted) throw new DOMException('aborted', 'AbortError');
      if (req.schema) return '```json\n' + JSON.stringify(MINUTES_JSON) + '\n```';
      if (req.system.includes('running summary')) return `- summary of ${req.prompt.length} chars`;
      return `- note for part [0:00]`;
    },
  };
  return { s, calls };
}

describe('transcript text', () => {
  it('merges consecutive segments of the same speaker', () => {
    const lines = buildLines(
      makeSession([seg('a', 0, 0, 'Hello.'), seg('b', 2.5, 0, 'Let us start.'), seg('c', 5, 1, 'Hi!'), seg('d', 30, 1, 'Later.')], { 0: 'Lan' }),
    );
    expect(lines.map((l) => [l.speaker, l.text])).toEqual([
      ['Lan', 'Hello. Let us start.'],
      ['Speaker 2', 'Hi!'],
      ['Speaker 2', 'Later.'],
    ]);
    expect(linesToText(lines).split('\n')[0]).toBe('[0:00] Lan: Hello. Let us start.');
  });

  it('formats and parses timestamps', () => {
    expect(formatTimestamp(75)).toBe('1:15');
    expect(formatTimestamp(3725)).toBe('1:02:05');
    expect(parseTimestamp('[1:15]')).toBe(75);
    expect(parseTimestamp('1:02:05')).toBe(3725);
    expect(parseTimestamp('abc')).toBeNaN();
  });
});

describe('chunking', () => {
  const lines = Array.from({ length: 20 }, (_, i) => ({ start: i * 10, end: i * 10 + 5, speaker: 'A', text: 'x'.repeat(90) }));

  it('keeps chunks within budget and covers all lines', () => {
    const chunks = chunkLines(lines, 120, 1);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(linesToText(c).length / 3).toBeLessThanOrEqual(120);
    const covered = new Set(chunks.flat().map((l) => l.start));
    expect(covered.size).toBe(20);
  });

  it('overlaps one line between chunks', () => {
    const chunks = chunkLines(lines, 120, 1);
    expect(chunks[1][0]).toBe(chunks[0][chunks[0].length - 1]);
  });

  it('groups texts by budget and hashes deterministically', () => {
    expect(groupByBudget(['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(30)], 25)).toHaveLength(2);
    expect(hashText('abc')).toBe(hashText('abc'));
    expect(hashText('abc')).not.toBe(hashText('abd'));
  });
});

describe('extractJson', () => {
  it('handles fences and surrounding prose', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":2} hope it helps')).toEqual({ a: 2 });
    expect(() => extractJson('no json')).toThrow();
  });
});

describe('normalizeMinutes', () => {
  const ctx = { title: 'Fallback', date: 1, durationMinutes: 10, participants: ['Speaker 1'] };

  it('repairs malformed output', () => {
    const m = normalizeMinutes(
      {
        summary: '  ok ',
        topics: [{ title: 'T', points: ['- a', 'a', 'b'], refs: ['0:30', 'bad', 5000] }, { title: '', points: [] }],
        decisions: ['Do X'],
        actionItems: [{ task: 'Y', owner: null, due: 'N/A', refs: [] }, { task: '' }],
        openQuestions: 'not array',
      },
      ctx,
    );
    expect(m.title).toBe('Fallback');
    expect(m.participants).toEqual(['Speaker 1']);
    expect(m.summary).toBe('ok');
    expect(m.topics).toEqual([{ title: 'T', points: ['a', 'b'], refs: [30] }]);
    expect(m.decisions).toEqual([{ text: 'Do X', refs: [] }]);
    expect(m.actionItems).toEqual([{ task: 'Y', owner: '', due: '', refs: [] }]);
    expect(m.openQuestions).toEqual([]);
  });

  it('translates text fields but not owners', async () => {
    const m = normalizeMinutes(MINUTES_JSON, ctx);
    const t = await translateMinutes(m, async (s) => `vi:${s}`);
    expect(t.summary).toBe('vi:Team agreed to launch on the 20th.');
    expect(t.actionItems[0]).toMatchObject({ task: 'vi:Fix payment bugs', owner: 'Minh', due: 'vi:Friday' });
    expect(t.participants).toEqual(['Lan', 'Minh']);
  });
});

describe('prompts', () => {
  it('includes template guidance, language and extra instructions', () => {
    const p = minutesSystemPrompt('standup', 'Tiếng Việt', 'focus on risks');
    expect(p).toContain('daily stand-up');
    expect(p).toContain('Tiếng Việt');
    expect(p).toContain('focus on risks');
  });

  it('schema is strict-compatible (all properties required)', () => {
    const check = (schema: Record<string, unknown>) => {
      if (schema.type === 'object') {
        const props = Object.keys(schema.properties as object);
        expect((schema.required as string[]).sort()).toEqual(props.sort());
        expect(schema.additionalProperties).toBe(false);
        for (const p of Object.values(schema.properties as Record<string, Record<string, unknown>>)) check(p);
      }
      if (schema.type === 'array') check(schema.items as Record<string, unknown>);
    };
    check(MINUTES_SCHEMA);
  });
});

describe('generateMinutes', () => {
  const segments = Array.from({ length: 40 }, (_, i) => seg(`s${i}`, i * 6, i % 2, `Sentence number ${i} about the launch plan.`));

  it('uses a single structured call for short transcripts', async () => {
    const { s, calls } = fakeSummarizer();
    const res = await generateMinutes(makeSession(segments), s, { template: 'standard', language: 'vi' });
    expect(calls).toHaveLength(1);
    expect(calls[0].schema).toBe(MINUTES_SCHEMA);
    expect(res.minutes.decisions[0]).toEqual({ text: 'Launch on the 20th', refs: [12] });
    expect(res.minutes.date).toBe(makeSession([]).startedAt);
    expect(res.minutes.durationMinutes).toBe(4);
  });

  it('map-reduces long transcripts and reuses cached notes', async () => {
    const session = makeSession(segments);
    const first = fakeSummarizer({ budget: 300 });
    const progress: string[] = [];
    const r1 = await generateMinutes(session, first.s, {
      template: 'standard',
      language: 'vi',
      onProgress: (p) => progress.push(`${p.stage}:${p.done}/${p.total}`),
    });
    const mapCalls = first.calls.filter((c) => !c.schema && c.system.includes('taking notes')).length;
    expect(mapCalls).toBeGreaterThan(1);
    expect(first.calls[first.calls.length - 1].schema).toBeDefined();
    expect(first.calls[first.calls.length - 1].prompt).toContain('Notes extracted');
    expect(progress).toContain(`map:${mapCalls}/${mapCalls}`);
    expect(Object.keys(r1.cache)).toHaveLength(mapCalls);

    const second = fakeSummarizer({ budget: 300 });
    await generateMinutes(session, second.s, { template: 'standard', language: 'vi', cache: r1.cache });
    expect(second.calls.filter((c) => c.system.includes('taking notes'))).toHaveLength(0);
  });

  it('generates in English then translates when the model lacks the language', async () => {
    const { s, calls } = fakeSummarizer({ langs: ['en'] });
    const translate = vi.fn(async (t: string) => `vi:${t}`);
    const res = await generateMinutes(makeSession(segments), s, { template: 'standard', language: 'vi', translate });
    expect(calls[0].system).toContain('Write every text value in English');
    expect(res.minutes.summary.startsWith('vi:')).toBe(true);
    expect(res.outputLanguage).toBe('vi');
  });

  it('rejects empty transcripts and honours abort', async () => {
    const { s } = fakeSummarizer();
    await expect(generateMinutes(makeSession([]), s, { template: 'standard', language: 'vi' })).rejects.toThrow();
    const ac = new AbortController();
    ac.abort();
    await expect(
      generateMinutes(makeSession(segments), s, { template: 'standard', language: 'vi', signal: ac.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('computes context from the session', () => {
    const ctx = minutesContext(makeSession(segments, { 0: 'Lan' }));
    expect(ctx.participants).toEqual(['Lan', 'Speaker 2']);
  });
});

describe('updateLiveSummary', () => {
  it('only processes new segments', async () => {
    const segments = [seg('a', 0, 0, 'First point.'), seg('b', 3, 1, 'Second point.')];
    const { s, calls } = fakeSummarizer();
    const first = await updateLiveSummary(makeSession(segments), s, { language: 'vi' });
    expect(first.upToSegment).toBe(2);
    expect(calls).toHaveLength(1);

    const same = await updateLiveSummary(makeSession(segments), s, { language: 'vi', previous: first });
    expect(same).toBe(first);
    expect(calls).toHaveLength(1);

    const more = [...segments, seg('c', 9, 0, 'Third point.')];
    const next = await updateLiveSummary(makeSession(more), s, { language: 'vi', previous: first });
    expect(next.upToSegment).toBe(3);
    expect(calls[1].prompt).toContain(first.text);
    expect(calls[1].prompt).toContain('Third point.');
    expect(calls[1].prompt).not.toContain('First point.');
  });
});

describe('OpenAiCompatibleSummarizer', () => {
  it('normalises base URLs', () => {
    expect(normalizeBaseUrl('https://x.com/v1/')).toBe('https://x.com/v1');
    expect(normalizeBaseUrl('https://x.com/v1/chat/completions')).toBe('https://x.com/v1');
    expect(normalizeBaseUrl('')).toBe('https://api.openai.com/v1');
  });

  it('sends json_schema and falls back on 400', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      if (bodies.length === 1) return new Response('{}', { status: 400 });
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
    });
    const s = new OpenAiCompatibleSummarizer({
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'llama3.1',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(s.remoteHost).toBeUndefined();
    await expect(s.generate({ system: 's', prompt: 'p', schema: { type: 'object' } })).resolves.toBe('{"ok":true}');
    expect(bodies[0].response_format).toBeDefined();
    expect(bodies[1].response_format).toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('reports HTTP errors with detail', async () => {
    const s = new OpenAiCompatibleSummarizer({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'k',
      model: 'm',
      fetchImpl: (async () => new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 })) as unknown as typeof fetch,
    });
    expect(s.remoteHost).toBe('api.openai.com');
    await expect(s.generate({ system: 's', prompt: 'p' })).rejects.toThrow('HTTP 401): bad key');
  });

  it('validates configuration', () => {
    expect(summarizerConfigError(DEFAULT_SETTINGS)).toMatch(/API key/);
    expect(summarizerConfigError({ ...DEFAULT_SETTINGS, openaiApiKey: 'sk' })).toBeNull();
    expect(summarizerConfigError({ ...DEFAULT_SETTINGS, summaryBaseUrl: 'http://localhost:11434/v1' })).toBeNull();
    expect(summarizerConfigError({ ...DEFAULT_SETTINGS, summaryProvider: 'chrome-prompt' })).toBeNull();
  });
});

/** Minimal ZIP reader: returns the named entry as text. */
function readZipEntry(buf: Buffer, name: string): string {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entry = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (entry === name) {
      const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(dataStart, dataStart + size);
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`entry ${name} not found`);
}

describe('DOCX export', () => {
  const ctx = { title: 'Họp sprint: tuần 45', date: new Date(2026, 10, 3, 9, 0).getTime(), durationMinutes: 30, participants: [] };
  const minutes = normalizeMinutes(MINUTES_JSON, ctx);

  it('renders all sections, the action table and the transcript appendix', async () => {
    const session = makeSession([seg('a', 12, 0, 'We launch on the 20th.')], { 0: 'Lan' });
    session.segments[0].translation = 'Chúng ta ra mắt ngày 20.';
    const doc = buildMinutesDocument(minutes, { language: 'vi', session: { ...session, url: 'https://meet.google.com/x' }, includeTranscript: true });
    const buf = await Packer.toBuffer(doc);
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    const xml = readZipEntry(buf, 'word/document.xml');
    for (const text of [
      'BIÊN BẢN CUỘC HỌP',
      'Thành phần tham dự',
      'Lan, Minh',
      'Team agreed to launch on the 20th.',
      'Launch date',
      'Launch on the 20th',
      'Người phụ trách',
      'Fix payment bugs',
      'Friday',
      'Update marketing plan',
      '[0:12]',
      'Phụ lục',
      'Chúng ta ra mắt ngày 20.',
      'https://meet.google.com/x',
    ]) {
      expect(xml, text).toContain(text);
    }
  });

  it('omits refs and transcript when disabled, uses English labels', async () => {
    const buf = await Packer.toBuffer(buildMinutesDocument(minutes, { language: 'en', includeRefs: false }));
    const xml = readZipEntry(buf, 'word/document.xml');
    expect(xml).toContain('MEETING MINUTES');
    expect(xml).toContain('Action items');
    expect(xml).not.toContain('[0:12]');
    expect(xml).not.toContain('Appendix');
  });

  it('builds a safe file name', () => {
    expect(minutesDocxFileName(minutes)).toBe('Bien ban - Sprint review - 20261103.docx');
    expect(minutesDocxFileName({ ...minutes, title: 'a/b:c' })).toBe('Bien ban - a b c - 20261103.docx');
  });
});
