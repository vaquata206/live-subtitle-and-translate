import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../core/languages';
import { loadSettings, saveSettings, type Settings } from '../core/settings';
import { testDeepgramKey } from '../core/stt/deepgram';
import { createTranslator, TRANSLATOR_LABELS } from '../core/translate';
import { isChromeBuiltinSupported, prepareChromeBuiltin } from '../core/translate/chromeBuiltin';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const f = {
  sttProvider: $<HTMLSelectElement>('sttProvider'),
  deepgramApiKey: $<HTMLInputElement>('deepgramApiKey'),
  deepgramModel: $<HTMLInputElement>('deepgramModel'),
  sourceLanguage: $<HTMLSelectElement>('sourceLanguage'),
  diarize: $<HTMLInputElement>('diarize'),
  translateEnabled: $<HTMLInputElement>('translateEnabled'),
  targetLanguage: $<HTMLSelectElement>('targetLanguage'),
  translatorProvider: $<HTMLSelectElement>('translatorProvider'),
  openaiApiKey: $<HTMLInputElement>('openaiApiKey'),
  openaiModel: $<HTMLInputElement>('openaiModel'),
};

function fillSelect(select: HTMLSelectElement, items: Array<{ value: string; label: string }>) {
  select.replaceChildren(...items.map((i) => new Option(i.label, i.value)));
}

fillSelect(f.sourceLanguage, SOURCE_LANGUAGES.map((l) => ({ value: l.code, label: l.name })));
fillSelect(f.targetLanguage, TARGET_LANGUAGES.map((l) => ({ value: l.code, label: l.name })));
fillSelect(
  f.translatorProvider,
  (Object.keys(TRANSLATOR_LABELS) as Settings['translatorProvider'][]).map((k) => ({ value: k, label: TRANSLATOR_LABELS[k] })),
);
fillSelect(
  $<HTMLSelectElement>('chromeFrom'),
  SOURCE_LANGUAGES.filter((l) => l.code !== 'multi').map((l) => ({ value: l.code, label: l.name })),
);

function readForm(): Partial<Settings> {
  return {
    sttProvider: f.sttProvider.value as Settings['sttProvider'],
    deepgramApiKey: f.deepgramApiKey.value.trim(),
    deepgramModel: f.deepgramModel.value.trim() || 'nova-3',
    sourceLanguage: f.sourceLanguage.value,
    diarize: f.diarize.checked,
    translateEnabled: f.translateEnabled.checked,
    targetLanguage: f.targetLanguage.value,
    translatorProvider: f.translatorProvider.value as Settings['translatorProvider'],
    openaiApiKey: f.openaiApiKey.value.trim(),
    openaiModel: f.openaiModel.value.trim() || 'gpt-4o-mini',
  };
}

function writeForm(s: Settings) {
  f.sttProvider.value = s.sttProvider;
  f.deepgramApiKey.value = s.deepgramApiKey;
  f.deepgramModel.value = s.deepgramModel;
  f.sourceLanguage.value = s.sourceLanguage;
  f.diarize.checked = s.diarize;
  f.translateEnabled.checked = s.translateEnabled;
  f.targetLanguage.value = s.targetLanguage;
  f.translatorProvider.value = s.translatorProvider;
  f.openaiApiKey.value = s.openaiApiKey;
  f.openaiModel.value = s.openaiModel;
  updateVisibility();
}

function updateVisibility() {
  $('openaiFields').hidden = f.translatorProvider.value !== 'openai';
  $('chromeFields').hidden = f.translatorProvider.value !== 'chrome-builtin';
}

let savedTimer: ReturnType<typeof setTimeout> | undefined;
async function save() {
  await saveSettings(readForm());
  const saved = $('saved');
  saved.classList.add('show');
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => saved.classList.remove('show'), 1500);
}

for (const el of Object.values(f)) {
  el.addEventListener('change', () => {
    updateVisibility();
    void save();
  });
}

function setResult(el: HTMLElement, ok: boolean, text: string) {
  el.className = `${el.className.replace(/\b(ok|err)\b/g, '').trim()} ${ok ? 'ok' : 'err'}`;
  el.textContent = text;
}

function bindReveal(buttonId: string, input: HTMLInputElement) {
  const btn = $<HTMLButtonElement>(buttonId);
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Ẩn' : 'Hiện';
  });
}
bindReveal('toggleDgKey', f.deepgramApiKey);
bindReveal('toggleOaKey', f.openaiApiKey);

$('testStt').addEventListener('click', async () => {
  const out = $('testSttResult');
  out.textContent = 'Đang kiểm tra…';
  out.className = 'result';
  const s = readForm();
  if (!s.deepgramApiKey) return setResult(out, false, 'Chưa nhập API key.');
  try {
    await testDeepgramKey(s.deepgramApiKey, s.deepgramModel!);
    setResult(out, true, 'Kết nối thành công ✓');
  } catch (e) {
    setResult(out, false, e instanceof Error ? e.message : String(e));
  }
});

$('testTranslate').addEventListener('click', async () => {
  const out = $('testTranslateResult');
  out.className = 'result block';
  out.textContent = 'Đang dịch…';
  await save();
  const settings = await loadSettings();
  try {
    const text = $<HTMLInputElement>('testText').value;
    const from = settings.sourceLanguage === 'multi' ? undefined : settings.sourceLanguage;
    const result = await createTranslator(settings).translate({ text, from, to: settings.targetLanguage });
    setResult(out, true, result);
  } catch (e) {
    setResult(out, false, e instanceof Error ? e.message : String(e));
  }
});

$('downloadChrome').addEventListener('click', async () => {
  const out = $('downloadChromeResult');
  out.className = 'result';
  if (!isChromeBuiltinSupported()) return setResult(out, false, 'Trình duyệt chưa hỗ trợ Translator API (cần Chrome 138+).');
  const from = $<HTMLSelectElement>('chromeFrom').value;
  const to = f.targetLanguage.value;
  out.textContent = 'Đang chuẩn bị…';
  try {
    const result = await prepareChromeBuiltin(from, to.split('-')[0], (p) => {
      out.textContent = `Đang tải ${Math.round(p * 100)}%…`;
    });
    if (result === 'unavailable') setResult(out, false, `Không hỗ trợ cặp ${from} → ${to}.`);
    else setResult(out, true, `Sẵn sàng dịch ${from} → ${to} ✓`);
  } catch (e) {
    setResult(out, false, e instanceof Error ? e.message : String(e));
  }
});

void loadSettings().then(writeForm);
