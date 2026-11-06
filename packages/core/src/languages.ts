export interface Language {
  code: string;
  name: string;
}

/** Languages offered for translation targets. */
export const TARGET_LANGUAGES: Language[] = [
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'zh-CN', name: '中文简体 (Chinese Simplified)' },
  { code: 'zh-TW', name: '中文繁體 (Chinese Traditional)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'th', name: 'ไทย (Thai)' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
];

/** Spoken languages for Deepgram streaming. `multi` = automatic multilingual (nova-3). */
export const SOURCE_LANGUAGES: Language[] = [
  { code: 'multi', name: 'Tự động (đa ngôn ngữ)' },
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'id', name: 'Bahasa Indonesia' },
];

export function languageName(code: string): string {
  return (
    TARGET_LANGUAGES.find((l) => l.code === code)?.name ?? SOURCE_LANGUAGES.find((l) => l.code === code)?.name ?? code
  );
}

/** Compares base language subtags, e.g. `en-US` ~ `en`. */
export function sameLanguage(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase().split('-')[0] === b.toLowerCase().split('-')[0];
}
