import { isAutoLanguage, type TranslateRequest, type Translator } from './Translator';

// Minimal typings for Chrome's built-in AI Translator / LanguageDetector APIs (Chrome 138+).
type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
interface BuiltinTranslator {
  translate(text: string, opts?: { signal?: AbortSignal }): Promise<string>;
  destroy?(): void;
}
interface CreateMonitor {
  addEventListener(type: 'downloadprogress', cb: (e: { loaded: number }) => void): void;
}
interface TranslatorStatic {
  availability(opts: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: CreateMonitor) => void;
  }): Promise<BuiltinTranslator>;
}
interface LanguageDetectorStatic {
  availability(): Promise<Availability>;
  create(): Promise<{ detect(text: string): Promise<Array<{ detectedLanguage: string; confidence: number }>> }>;
}

function api() {
  const g = globalThis as unknown as { Translator?: TranslatorStatic; LanguageDetector?: LanguageDetectorStatic };
  return { Translator: g.Translator, LanguageDetector: g.LanguageDetector };
}

export function isChromeBuiltinSupported(): boolean {
  return !!api().Translator;
}

/**
 * Downloads/initialises the on-device model for a language pair. Must be called
 * from a user gesture (e.g. the Options page button) when the model is `downloadable`.
 */
export async function prepareChromeBuiltin(
  sourceLanguage: string,
  targetLanguage: string,
  onProgress?: (fraction: number) => void,
): Promise<Availability> {
  const T = api().Translator;
  if (!T) throw new Error('Trình duyệt không hỗ trợ Translator API (cần Chrome 138+).');
  const availability = await T.availability({ sourceLanguage, targetLanguage });
  if (availability === 'unavailable') return availability;
  const t = await T.create({
    sourceLanguage,
    targetLanguage,
    monitor: (m) => m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded)),
  });
  t.destroy?.();
  return 'available';
}

export class ChromeBuiltinTranslator implements Translator {
  readonly id = 'chrome-builtin';
  private readonly translators = new Map<string, Promise<BuiltinTranslator>>();
  private detector: Promise<{ detect(text: string): Promise<Array<{ detectedLanguage: string }>> }> | null = null;

  async translate(req: TranslateRequest, signal?: AbortSignal): Promise<string> {
    const { Translator: T } = api();
    if (!T) throw new Error('Trình duyệt không hỗ trợ Translator API (cần Chrome 138+).');
    const from = isAutoLanguage(req.from) ? await this.detect(req.text) : req.from!.split('-')[0];
    const key = `${from}>${req.to}`;
    let tp = this.translators.get(key);
    if (!tp) {
      tp = (async () => {
        const availability = await T.availability({ sourceLanguage: from, targetLanguage: req.to });
        if (availability === 'unavailable') throw new Error(`Không hỗ trợ dịch ${from} → ${req.to} trên thiết bị.`);
        if (availability !== 'available') {
          throw new Error(`Mô hình ${from} → ${req.to} chưa được tải. Mở Cài đặt và bấm "Tải mô hình Chrome".`);
        }
        return T.create({ sourceLanguage: from, targetLanguage: req.to });
      })();
      this.translators.set(key, tp);
      tp.catch(() => this.translators.delete(key));
    }
    return (await (await tp).translate(req.text, { signal })).trim();
  }

  private async detect(text: string): Promise<string> {
    const { LanguageDetector: LD } = api();
    if (!LD) return 'en';
    this.detector ??= LD.create();
    try {
      const results = await (await this.detector).detect(text);
      return results[0]?.detectedLanguage?.split('-')[0] ?? 'en';
    } catch {
      return 'en';
    }
  }
}
