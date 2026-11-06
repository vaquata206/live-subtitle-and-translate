import type { Settings } from '../settings';
import { ChromePromptSummarizer } from './chromePrompt';
import { OpenAiCompatibleSummarizer } from './openaiCompatible';
import type { Summarizer } from './Summarizer';

export function createSummarizer(settings: Settings): Summarizer {
  const configError = summarizerConfigError(settings);
  if (configError) throw new Error(configError);
  switch (settings.summaryProvider) {
    case 'openai-compatible':
      return new OpenAiCompatibleSummarizer({
        baseUrl: settings.summaryBaseUrl,
        apiKey: settings.summaryApiKey || settings.openaiApiKey,
        model: settings.summaryModel,
      });
    case 'chrome-prompt':
      return new ChromePromptSummarizer();
    default:
      throw new Error(`Unsupported summarizer: ${String(settings.summaryProvider)}`);
  }
}

/** Returns a user-facing message when the selected provider is missing required settings. */
export function summarizerConfigError(settings: Settings): string | null {
  if (settings.summaryProvider !== 'openai-compatible') return null;
  let url: URL;
  try {
    url = new URL(settings.summaryBaseUrl || 'https://api.openai.com/v1');
  } catch {
    return 'Base URL của API tóm tắt không hợp lệ. Mở Cài đặt để sửa.';
  }
  if (url.hostname === 'api.openai.com' && !(settings.summaryApiKey || settings.openaiApiKey)) {
    return 'Chưa có API key cho tính năng tóm tắt. Mở Cài đặt → Tóm tắt & Biên bản để nhập key.';
  }
  if (!settings.summaryModel.trim()) return 'Chưa chọn model tóm tắt trong Cài đặt.';
  return null;
}

export const SUMMARIZER_LABELS: Record<Settings['summaryProvider'], string> = {
  'openai-compatible': 'OpenAI / API tương thích OpenAI (Azure, Gemini, Ollama…)',
  'chrome-prompt': 'Chrome built-in AI – Gemini Nano (on-device, miễn phí)',
};
