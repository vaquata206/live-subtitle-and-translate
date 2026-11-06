import { describe, expect, it, vi } from 'vitest';
import { GoogleFreeTranslator, parseGoogleResponse } from '../src/translate/googleFree';
import { OpenAiTranslator } from '../src/translate/openai';
import { TranslationQueue } from '../src/translate/queue';
import type { Translator } from '../src/translate/Translator';

describe('parseGoogleResponse', () => {
  it('joins sentence parts', () => {
    expect(
      parseGoogleResponse([
        [
          ['Xin chào. ', 'Hello. '],
          ['Bắt đầu nhé.', "Let's start."],
        ],
        null,
        'en',
      ]),
    ).toBe('Xin chào. Bắt đầu nhé.');
  });

  it('throws on malformed data', () => {
    expect(() => parseGoogleResponse({})).toThrow();
  });
});

describe('GoogleFreeTranslator', () => {
  it('builds the request with auto source', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([[['Chào', 'Hi']]]), { status: 200 }));
    const t = new GoogleFreeTranslator(fetchMock as unknown as typeof fetch);
    await expect(t.translate({ text: 'Hi', from: 'multi', to: 'vi' })).resolves.toBe('Chào');
    const url = new URL((fetchMock.mock.calls[0] as unknown[])[0] as string);
    expect(url.searchParams.get('sl')).toBe('auto');
    expect(url.searchParams.get('tl')).toBe('vi');
    expect(url.searchParams.get('q')).toBe('Hi');
  });

  it('surfaces HTTP errors', async () => {
    const t = new GoogleFreeTranslator((async () => new Response('', { status: 429 })) as unknown as typeof fetch);
    await expect(t.translate({ text: 'Hi', to: 'vi' })).rejects.toThrow('429');
  });
});

describe('OpenAiTranslator', () => {
  it('requires an API key', async () => {
    await expect(new OpenAiTranslator('', 'gpt-4o-mini').translate({ text: 'Hi', to: 'vi' })).rejects.toThrow();
  });

  it('returns message content', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ choices: [{ message: { content: ' Xin chào ' } }] }), { status: 200 }),
    );
    const t = new OpenAiTranslator('sk-test', 'gpt-4o-mini', fetchMock as unknown as typeof fetch);
    await expect(t.translate({ text: 'Hello', to: 'vi' })).resolves.toBe('Xin chào');
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
  });
});

function fakeTranslator(impl?: (text: string) => Promise<string>) {
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;
  const t: Translator = {
    id: 'fake',
    async translate(req) {
      calls.push(req.text);
      active++;
      maxActive = Math.max(maxActive, active);
      try {
        await new Promise((r) => setTimeout(r, 5));
        return impl ? await impl(req.text) : `[${req.text}]`;
      } finally {
        active--;
      }
    },
  };
  return { t, calls, maxActive: () => maxActive };
}

describe('TranslationQueue', () => {
  it('caches identical texts', async () => {
    const { t, calls } = fakeTranslator();
    const q = new TranslationQueue(t, 'vi');
    expect(await q.translate('hello', 'en')).toBe('[hello]');
    expect(await q.translate(' hello ', 'en')).toBe('[hello]');
    expect(calls).toEqual(['hello']);
  });

  it('skips translation when source equals target', async () => {
    const { t, calls } = fakeTranslator();
    const q = new TranslationQueue(t, 'vi');
    expect(await q.translate('xin chào', 'vi-VN')).toBe('xin chào');
    expect(calls).toEqual([]);
  });

  it('limits concurrency', async () => {
    const { t, maxActive } = fakeTranslator();
    const q = new TranslationQueue(t, 'vi', { concurrency: 2 });
    await Promise.all(['a', 'b', 'c', 'd', 'e'].map((s) => q.translate(s, 'en')));
    expect(maxActive()).toBe(2);
  });

  it('retries once then fails', async () => {
    let attempts = 0;
    const { t } = fakeTranslator(async () => {
      attempts++;
      throw new Error('boom');
    });
    const q = new TranslationQueue(t, 'vi', { retries: 1 });
    await expect(q.translate('x', 'en')).rejects.toThrow('boom');
    expect(attempts).toBe(2);
  });

  it('succeeds after a transient failure', async () => {
    let attempts = 0;
    const { t } = fakeTranslator(async (text) => {
      if (++attempts === 1) throw new Error('flaky');
      return `ok:${text}`;
    });
    const q = new TranslationQueue(t, 'vi');
    await expect(q.translate('x', 'en')).resolves.toBe('ok:x');
  });
});
