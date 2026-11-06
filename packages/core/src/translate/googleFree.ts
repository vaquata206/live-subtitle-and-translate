import { isAutoLanguage, type TranslateRequest, type Translator } from './Translator';

/** Unofficial, key-less Google Translate endpoint (may be rate limited). */
export class GoogleFreeTranslator implements Translator {
  readonly id = 'google-free';

  constructor(private readonly fetchImpl: typeof fetch = (...a) => fetch(...a)) {}

  async translate(req: TranslateRequest, signal?: AbortSignal): Promise<string> {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: isAutoLanguage(req.from) ? 'auto' : req.from!,
      tl: req.to,
      dt: 't',
      q: req.text,
    });
    const res = await this.fetchImpl(`https://translate.googleapis.com/translate_a/single?${params}`, { signal });
    if (!res.ok) throw new Error(`Google Translate lỗi HTTP ${res.status}`);
    const data = (await res.json()) as unknown;
    return parseGoogleResponse(data);
  }
}

export function parseGoogleResponse(data: unknown): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Phản hồi Google Translate không hợp lệ');
  return (data[0] as unknown[])
    .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
    .join('')
    .trim();
}
