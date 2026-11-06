export type SttProviderId = 'deepgram';
export type TranslatorId = 'google-free' | 'chrome-builtin' | 'openai';
export type SummarizerId = 'openai-compatible' | 'chrome-prompt';
export type MinutesTemplateId = 'standard' | 'brief' | 'standup' | 'interview' | 'lecture';

export interface Settings {
  sttProvider: SttProviderId;
  deepgramApiKey: string;
  deepgramModel: string;
  /** `multi` for automatic multilingual detection, otherwise a language code. */
  sourceLanguage: string;
  diarize: boolean;
  translateEnabled: boolean;
  translatorProvider: TranslatorId;
  targetLanguage: string;
  openaiApiKey: string;
  openaiModel: string;
  summaryProvider: SummarizerId;
  /** OpenAI-compatible API base, e.g. https://api.openai.com/v1 or http://localhost:11434/v1 */
  summaryBaseUrl: string;
  /** Falls back to `openaiApiKey` when empty. */
  summaryApiKey: string;
  summaryModel: string;
  minutesLanguage: string;
  minutesTemplate: MinutesTemplateId;
  liveSummaryIntervalMin: number;
}

export type ViewMode = 'bilingual' | 'original' | 'translation';

export interface UiPrefs {
  viewMode: ViewMode;
  fontSize: number;
  showTimestamps: boolean;
  autoScroll: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sttProvider: 'deepgram',
  deepgramApiKey: '',
  deepgramModel: 'nova-3',
  sourceLanguage: 'multi',
  diarize: true,
  translateEnabled: true,
  translatorProvider: 'google-free',
  targetLanguage: 'vi',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  summaryProvider: 'openai-compatible',
  summaryBaseUrl: 'https://api.openai.com/v1',
  summaryApiKey: '',
  summaryModel: 'gpt-4o-mini',
  minutesLanguage: 'vi',
  minutesTemplate: 'standard',
  liveSummaryIntervalMin: 3,
};

export const DEFAULT_UI_PREFS: UiPrefs = {
  viewMode: 'bilingual',
  fontSize: 15,
  showTimestamps: true,
  autoScroll: true,
};
