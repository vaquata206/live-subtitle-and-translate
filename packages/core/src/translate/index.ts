import type { Settings } from '../settings';
import { ChromeBuiltinTranslator } from './chromeBuiltin';
import { GoogleFreeTranslator } from './googleFree';
import { OpenAiTranslator } from './openai';
import type { Translator } from './Translator';

export function createTranslator(settings: Settings): Translator {
  switch (settings.translatorProvider) {
    case 'google-free':
      return new GoogleFreeTranslator();
    case 'chrome-builtin':
      return new ChromeBuiltinTranslator();
    case 'openai':
      return new OpenAiTranslator(settings.openaiApiKey, settings.openaiModel);
    default:
      throw new Error(`Unsupported translator: ${String(settings.translatorProvider)}`);
  }
}

export const TRANSLATOR_LABELS: Record<Settings['translatorProvider'], string> = {
  'google-free': 'Google Translate (miễn phí, không cần key)',
  'chrome-builtin': 'Chrome built-in AI (on-device, Chrome 138+)',
  openai: 'OpenAI (cần API key)',
};
