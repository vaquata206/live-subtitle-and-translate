export interface TranslateRequest {
  text: string;
  /** Source language code, or undefined/`auto`/`multi` when unknown. */
  from?: string;
  to: string;
}

export interface Translator {
  readonly id: string;
  translate(req: TranslateRequest, signal?: AbortSignal): Promise<string>;
}

export function isAutoLanguage(code: string | undefined): boolean {
  return !code || code === 'auto' || code === 'multi';
}
