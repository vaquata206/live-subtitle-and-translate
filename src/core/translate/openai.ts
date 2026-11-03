import { isAutoLanguage, type TranslateRequest, type Translator } from './Translator';

/** Translation via an OpenAI-compatible Chat Completions endpoint. */
export class OpenAiTranslator implements Translator {
  readonly id = 'openai';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = (...a) => fetch(...a),
    private readonly endpoint = 'https://api.openai.com/v1/chat/completions',
  ) {}

  async translate(req: TranslateRequest, signal?: AbortSignal): Promise<string> {
    if (!this.apiKey) throw new Error('Chưa cấu hình OpenAI API key.');
    const from = isAutoLanguage(req.from) ? 'the detected source language' : req.from;
    const res = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              `You are a live meeting interpreter. Translate the user's utterance from ${from} into the language with BCP-47 code "${req.to}". ` +
              'The text is a speech-to-text transcript and may contain recognition errors; translate the intended meaning naturally. ' +
              'Reply with the translation only, no quotes or explanations.',
          },
          { role: 'user', content: req.text },
        ],
      }),
    });
    if (!res.ok) {
      let detail = '';
      try {
        detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '';
      } catch {
        // ignore
      }
      throw new Error(`OpenAI lỗi HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error('OpenAI không trả về bản dịch');
    return out;
  }
}
