import type { GenerateRequest, Summarizer } from './Summarizer';

// Minimal typings for Chrome's built-in Prompt API (Gemini Nano), Chrome 138+ in extensions.
type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
interface LanguageModelSession {
  prompt(input: string, opts?: { signal?: AbortSignal; responseConstraint?: Record<string, unknown> }): Promise<string>;
  inputQuota?: number;
  destroy(): void;
}
interface LanguageModelCreateOptions {
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  expectedInputs?: Array<{ type: 'text'; languages?: string[] }>;
  expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>;
  signal?: AbortSignal;
  monitor?: (m: { addEventListener(t: 'downloadprogress', cb: (e: { loaded: number }) => void): void }) => void;
}
interface LanguageModelStatic {
  availability(opts?: LanguageModelCreateOptions): Promise<Availability>;
  create(opts?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

const OUTPUT_LANGS = ['en', 'es', 'ja'];
const IO_OPTS: LanguageModelCreateOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

function api(): LanguageModelStatic | undefined {
  return (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

export function isChromePromptSupported(): boolean {
  return !!api();
}

/** Downloads Gemini Nano if needed. Must be called from a user gesture. */
export async function prepareChromePrompt(onProgress?: (fraction: number) => void): Promise<Availability> {
  const LM = api();
  if (!LM) throw new Error('Trình duyệt chưa hỗ trợ Prompt API (cần Chrome 138+ và phần cứng tương thích).');
  const availability = await LM.availability(IO_OPTS);
  if (availability === 'unavailable') return availability;
  const s = await LM.create({
    ...IO_OPTS,
    monitor: (m) => m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded)),
  });
  s.destroy();
  return 'available';
}

/** On-device summarisation with Gemini Nano. Output languages limited to en/es/ja. */
export class ChromePromptSummarizer implements Summarizer {
  readonly id = 'chrome-prompt';
  readonly model = 'Gemini Nano';
  readonly concurrency = 1;
  readonly remoteHost = undefined;
  private quota: number | null = null;

  supportsOutputLanguage(lang: string): boolean {
    return OUTPUT_LANGS.includes(lang.split('-')[0]);
  }

  async inputBudget(): Promise<number> {
    if (this.quota === null) {
      const s = await this.createSession('');
      this.quota = s.inputQuota ?? 6000;
      s.destroy();
    }
    // Reserve room for instructions and the model's own output in the context window.
    return Math.max(1000, Math.floor(this.quota * 0.5));
  }

  async generate(req: GenerateRequest): Promise<string> {
    const s = await this.createSession(req.system, req.signal);
    try {
      return (await s.prompt(req.prompt, { signal: req.signal, responseConstraint: req.schema })).trim();
    } finally {
      s.destroy();
    }
  }

  private async createSession(system: string, signal?: AbortSignal): Promise<LanguageModelSession> {
    const LM = api();
    if (!LM) throw new Error('Trình duyệt chưa hỗ trợ Prompt API (cần Chrome 138+).');
    const availability = await LM.availability(IO_OPTS);
    if (availability === 'unavailable') throw new Error('Gemini Nano không khả dụng trên thiết bị này.');
    if (availability !== 'available') {
      throw new Error('Mô hình Gemini Nano chưa được tải. Mở Cài đặt và bấm "Tải Gemini Nano".');
    }
    return LM.create({
      ...IO_OPTS,
      signal,
      initialPrompts: system ? [{ role: 'system', content: system }] : undefined,
    });
  }
}
