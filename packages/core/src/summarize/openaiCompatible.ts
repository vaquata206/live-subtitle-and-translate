import type { GenerateRequest, Summarizer } from './Summarizer';

export interface OpenAiCompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Transcript tokens per request. Kept well below context size for summary quality. */
  inputTokens?: number;
  fetchImpl?: typeof fetch;
}

export function normalizeBaseUrl(url: string): string {
  return (url.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}

/** Any Chat Completions compatible API: OpenAI, Azure OpenAI (v1), Gemini OpenAI-compat, Ollama, LM Studio… */
export class OpenAiCompatibleSummarizer implements Summarizer {
  readonly id = 'openai-compatible';
  readonly model: string;
  readonly concurrency = 2;
  readonly remoteHost?: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: OpenAiCompatibleOptions) {
    this.model = opts.model;
    this.endpoint = `${normalizeBaseUrl(opts.baseUrl)}/chat/completions`;
    this.fetchImpl = opts.fetchImpl ?? ((...a) => fetch(...a));
    const host = new URL(this.endpoint).hostname;
    this.remoteHost = host === 'localhost' || host === '127.0.0.1' ? undefined : host;
  }

  supportsOutputLanguage(): boolean {
    return true;
  }

  async inputBudget(): Promise<number> {
    return this.opts.inputTokens ?? 12000;
  }

  async generate(req: GenerateRequest): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
    };
    if (req.schema) {
      body.response_format = { type: 'json_schema', json_schema: { name: 'result', strict: true, schema: req.schema } };
    }
    let res = await this.post(body, req.signal);
    // Some compatible servers don't support json_schema; retry relying on the prompt's JSON instructions.
    if (res.status === 400 && req.schema) {
      delete body.response_format;
      res = await this.post(body, req.signal);
    }
    if (!res.ok) {
      let detail = '';
      try {
        detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '';
      } catch {
        // ignore
      }
      throw new Error(`Lỗi API tóm tắt (HTTP ${res.status})${detail ? `: ${detail}` : ''}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error('Mô hình không trả về nội dung');
    return out;
  }

  private post(body: unknown, signal?: AbortSignal) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.opts.apiKey) headers.Authorization = `Bearer ${this.opts.apiKey}`;
    return this.fetchImpl(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal });
  }
}
