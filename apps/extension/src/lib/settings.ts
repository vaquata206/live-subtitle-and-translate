import { DEFAULT_SETTINGS, DEFAULT_UI_PREFS, type Settings, type UiPrefs } from '@lst/core/settings';

export * from '@lst/core/settings';

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
