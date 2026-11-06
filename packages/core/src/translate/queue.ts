import { sameLanguage } from '../languages';
import { isAutoLanguage, type Translator } from './Translator';

export interface QueueOptions {
  concurrency?: number;
  cacheSize?: number;
  retries?: number;
}

/**
 * Translation queue with bounded concurrency, an LRU cache and retry.
 * Results are delivered in completion order; callers key results by segment id.
 */
export class TranslationQueue {
  private readonly concurrency: number;
  private readonly cacheSize: number;
  private readonly retries: number;
  private readonly cache = new Map<string, string>();
  private readonly pending: Array<() => void> = [];
  private active = 0;
  private readonly controller = new AbortController();

  constructor(
    private readonly translator: Translator,
    private readonly to: string,
    opts: QueueOptions = {},
  ) {
    this.concurrency = opts.concurrency ?? 2;
    this.cacheSize = opts.cacheSize ?? 500;
    this.retries = opts.retries ?? 1;
  }

  async translate(text: string, from?: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (!isAutoLanguage(from) && sameLanguage(from, this.to)) return trimmed;

    const key = `${from ?? ''}|${trimmed}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }

    await this.acquire();
    try {
      let lastError: unknown;
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        if (this.controller.signal.aborted) throw new Error('Đã dừng dịch');
        try {
          const result = await this.translator.translate({ text: trimmed, from, to: this.to }, this.controller.signal);
          this.remember(key, result);
          return result;
        } catch (e) {
          lastError = e;
          if (attempt < this.retries) await delay(400 * (attempt + 1));
        }
      }
      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    } finally {
      this.release();
    }
  }

  dispose(): void {
    this.controller.abort();
    this.pending.splice(0).forEach((resume) => resume());
  }

  private remember(key: string, value: string): void {
    this.cache.set(key, value);
    while (this.cache.size > this.cacheSize) {
      const oldest = this.cache.keys().next().value as string;
      this.cache.delete(oldest);
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) =>
      this.pending.push(() => {
        this.active++;
        resolve();
      }),
    );
  }

  private release(): void {
    this.active--;
    this.pending.shift()?.();
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
