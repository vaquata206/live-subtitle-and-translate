import { SOURCE_LANGUAGES, TARGET_LANGUAGES, languageName } from '@lst/core/languages';
import { liveSummarySystemPrompt, liveSummaryUserPrompt } from '@lst/core/minutes/prompts';
import { friendlyError } from '../lib/minutes-run';
import { loadSettings, saveSettings, type Settings } from '../lib/settings';
import { testDeepgramKey } from '../lib/stt/deepgram';
import { createTranslator, TRANSLATOR_LABELS } from '@lst/core/translate';
import { isChromeBuiltinSupported, prepareChromeBuiltin } from '@lst/core/translate/chromeBuiltin';
import { MINUTES_TEMPLATES } from '@lst/core/minutes/prompts';
import { createSummarizer, SUMMARIZER_LABELS } from '@lst/core/summarize';
import { isChromePromptSupported, prepareChromePrompt } from '@lst/core/summarize/chromePrompt';
import { normalizeBaseUrl } from '@lst/core/summarize/openaiCompatible';

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
  summaryProvider: $<HTMLSelectElement>('summaryProvider'),
  summaryBaseUrl: $<HTMLInputElement>('summaryBaseUrl'),
  summaryApiKey: $<HTMLInputElement>('summaryApiKey'),
  summaryModel: $<HTMLInputElement>('summaryModel'),
  minutesLanguage: $<HTMLSelectElement>('minutesLanguage'),
  minutesTemplate: $<HTMLSelectElement>('minutesTemplate'),
  liveSummaryIntervalMin: $<HTMLInputElement>('liveSummaryIntervalMin'),
};

function fillSelect(select: HTMLSelectElement, items: Array<{ value: string; label: string }>) {
  select.replaceChildren(...items.map((i) => new Option(i.label, i.value)));
}

fillSelect(
  f.sourceLanguage,
  SOURCE_LANGUAGES.map((l) => ({ value: l.code, label: l.name })),
);
fillSelect(
  f.targetLanguage,
  TARGET_LANGUAGES.map((l) => ({ value: l.code, label: l.name })),
);
fillSelect(
  f.translatorProvider,
  (Object.keys(TRANSLATOR_LABELS) as Settings['translatorProvider'][]).map((k) => ({
    value: k,
    label: TRANSLATOR_LABELS[k],
  })),
);
fillSelect(
  $<HTMLSelectElement>('chromeFrom'),
  SOURCE_LANGUAGES.filter((l) => l.code !== 'multi').map((l) => ({ value: l.code, label: l.name })),
);
fillSelect(
  f.summaryProvider,
  (Object.keys(SUMMARIZER_LABELS) as Settings['summaryProvider'][]).map((k) => ({
    value: k,
    label: SUMMARIZER_LABELS[k],
  })),
);
fillSelect(
  f.minutesLanguage,
  TARGET_LANGUAGES.map((l) => ({ value: l.code, label: l.name })),
);
fillSelect(
  f.minutesTemplate,
  MINUTES_TEMPLATES.map((t) => ({ value: t.id, label: t.label })),
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
    summaryProvider: f.summaryProvider.value as Settings['summaryProvider'],
    summaryBaseUrl: normalizeBaseUrl(f.summaryBaseUrl.value),
    summaryApiKey: f.summaryApiKey.value.trim(),
    summaryModel: f.summaryModel.value.trim() || 'gpt-4o-mini',
    minutesLanguage: f.minutesLanguage.value,
    minutesTemplate: f.minutesTemplate.value as Settings['minutesTemplate'],
    liveSummaryIntervalMin: Math.min(30, Math.max(1, Math.round(Number(f.liveSummaryIntervalMin.value) || 3))),
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
  f.summaryProvider.value = s.summaryProvider;
  f.summaryBaseUrl.value = s.summaryBaseUrl;
  f.summaryApiKey.value = s.summaryApiKey;
  f.summaryModel.value = s.summaryModel;
  f.minutesLanguage.value = s.minutesLanguage;
  f.minutesTemplate.value = s.minutesTemplate;
  f.liveSummaryIntervalMin.value = String(s.liveSummaryIntervalMin);
  updateVisibility();
}

function updateVisibility() {
  $('openaiFields').hidden = f.translatorProvider.value !== 'openai';
  $('chromeFields').hidden = f.translatorProvider.value !== 'chrome-builtin';
  $('summaryOpenaiFields').hidden = f.summaryProvider.value !== 'openai-compatible';
  $('summaryChromeFields').hidden = f.summaryProvider.value !== 'chrome-prompt';
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
  if (!isChromeBuiltinSupported())
    return setResult(out, false, 'Trình duyệt chưa hỗ trợ Translator API (cần Chrome 138+).');
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

bindReveal('toggleSumKey', f.summaryApiKey);

const SAMPLE_TRANSCRIPT = [
  '[0:05] Lan: Good morning everyone. Today we need to decide the launch date for the mobile app.',
  '[0:15] Minh: QA found two critical bugs in the payment flow, so I suggest moving the launch to the 20th.',
  '[0:32] Lan: Agreed, we launch on the 20th. Minh, please fix the payment bugs by Friday.',
  '[0:45] Hoa: I will update the marketing plan and send it to the team tomorrow.',
].join('\n');

$('testSummary').addEventListener('click', async () => {
  const out = $('testSummaryResult');
  out.className = 'result block';
  // permissions.request must run synchronously inside the click gesture.
  let permission: Promise<boolean> = Promise.resolve(true);
  if (f.summaryProvider.value === 'openai-compatible') {
    try {
      const url = new URL(normalizeBaseUrl(f.summaryBaseUrl.value));
      if (url.hostname !== 'api.openai.com') {
        permission = chrome.permissions.request({ origins: [`${url.protocol}//${url.hostname}/*`] });
      }
    } catch {
      return setResult(out, false, 'Base URL không hợp lệ.');
    }
  }
  out.textContent = 'Đang kiểm tra…';
  if (!(await permission)) return setResult(out, false, 'Bạn chưa cấp quyền truy cập địa chỉ API này.');
  await save();
  try {
    const settings = await loadSettings();
    const summarizer = createSummarizer(settings);
    const lang = summarizer.supportsOutputLanguage(settings.minutesLanguage) ? settings.minutesLanguage : 'en';
    const started = performance.now();
    const text = await summarizer.generate({
      system: liveSummarySystemPrompt(languageName(lang)),
      prompt: liveSummaryUserPrompt('', SAMPLE_TRANSCRIPT),
    });
    setResult(
      out,
      true,
      `✓ ${summarizer.model} phản hồi sau ${((performance.now() - started) / 1000).toFixed(1)}s:\n${text}`,
    );
  } catch (e) {
    setResult(out, false, friendlyError(e));
  }
});

$('downloadNano').addEventListener('click', async () => {
  const out = $('downloadNanoResult');
  out.className = 'result';
  if (!isChromePromptSupported()) return setResult(out, false, 'Trình duyệt chưa hỗ trợ Prompt API (cần Chrome 138+).');
  out.textContent = 'Đang chuẩn bị…';
  try {
    const result = await prepareChromePrompt((p) => {
      out.textContent = `Đang tải ${Math.round(p * 100)}%…`;
    });
    if (result === 'unavailable') setResult(out, false, 'Gemini Nano không khả dụng trên thiết bị này.');
    else setResult(out, true, 'Gemini Nano đã sẵn sàng ✓');
  } catch (e) {
    setResult(out, false, e instanceof Error ? e.message : String(e));
  }
});
