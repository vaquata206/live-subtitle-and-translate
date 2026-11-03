export type SttProviderId = 'deepgram';
export type TranslatorId = 'google-free' | 'chrome-builtin' | 'openai';

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
};

export const DEFAULT_UI_PREFS: UiPrefs = {
  viewMode: 'bilingual',
  fontSize: 15,
  showTimestamps: true,
  autoScroll: true,
};

const SETTINGS_KEY = 'settings';
const UI_PREFS_KEY = 'uiPrefs';

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...((data[SETTINGS_KEY] as Partial<Settings>) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function loadUiPrefs(): Promise<UiPrefs> {
  const data = await chrome.storage.local.get(UI_PREFS_KEY);
  return { ...DEFAULT_UI_PREFS, ...((data[UI_PREFS_KEY] as Partial<UiPrefs>) ?? {}) };
}

export async function saveUiPrefs(patch: Partial<UiPrefs>): Promise<UiPrefs> {
  const next = { ...(await loadUiPrefs()), ...patch };
  await chrome.storage.local.set({ [UI_PREFS_KEY]: next });
  return next;
}
