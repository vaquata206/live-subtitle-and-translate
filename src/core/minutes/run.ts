import { sendToBackground } from '../messages';
import { loadSettings, type Settings } from '../settings';
import { createSummarizer } from '../summarize';
import { createTranslator } from '../translate';
import { TranslationQueue } from '../translate/queue';
import type { LiveSummary, Session } from '../types';
import { generateMinutes, updateLiveSummary, type MinutesProgress } from './pipeline';

export interface RunMinutesOptions {
  template?: string;
  language?: string;
  extraInstructions?: string;
  signal?: AbortSignal;
  onProgress?: (p: MinutesProgress) => void;
}

function translatorFor(settings: Settings, to: string) {
  const queue = new TranslationQueue(createTranslator(settings), to, { concurrency: 3 });
  return (text: string) => queue.translate(text);
}

async function getSession(sessionId: string): Promise<Session> {
  const { session } = await sendToBackground({ type: 'GET_SESSION', sessionId });
  if (!session) throw new Error('Không tìm thấy phiên.');
  return session;
}

/** Generates minutes for a stored session and persists them. */
export async function runMinutes(sessionId: string, opts: RunMinutesOptions = {}): Promise<Session> {
  const settings = await loadSettings();
  const template = opts.template ?? settings.minutesTemplate;
  const language = opts.language ?? settings.minutesLanguage;
  const summarizer = createSummarizer(settings);
  const session = await getSession(sessionId);
  const result = await generateMinutes(session, summarizer, {
    template,
    language,
    extraInstructions: opts.extraInstructions,
    signal: opts.signal,
    onProgress: opts.onProgress,
    cache: session.summary?.chunkNotes,
    translate: translatorFor(settings, language),
  });
  const { session: saved } = await sendToBackground({
    type: 'UPDATE_SUMMARY',
    sessionId,
    patch: {
      minutes: result.minutes,
      chunkNotes: result.cache,
      minutesMeta: {
        provider: summarizer.id,
        model: summarizer.model,
        template,
        language: result.outputLanguage,
        generatedAt: Date.now(),
        edited: false,
      },
    },
  });
  if (!saved) throw new Error('Không lưu được biên bản.');
  return saved;
}

/** Updates the running summary with transcript added since the last update. */
export async function runLiveSummary(sessionId: string, signal?: AbortSignal): Promise<LiveSummary> {
  const settings = await loadSettings();
  const session = await getSession(sessionId);
  const live = await updateLiveSummary(session, createSummarizer(settings), {
    language: settings.minutesLanguage,
    previous: session.summary?.live,
    signal,
    translate: translatorFor(settings, settings.minutesLanguage),
  });
  await sendToBackground({ type: 'UPDATE_SUMMARY', sessionId, patch: { live } });
  return live;
}

export function progressText(p: MinutesProgress): string {
  switch (p.stage) {
    case 'map':
      return `Đang đọc transcript: đoạn ${p.done}/${p.total}…`;
    case 'merge':
      return `Đang gộp ghi chú ${p.done}/${p.total}…`;
    case 'final':
      return 'Đang soạn biên bản…';
    case 'translate':
      return 'Đang dịch biên bản…';
  }
}

export function friendlyError(e: unknown): string {
  if ((e as Error)?.name === 'AbortError') return 'Đã huỷ.';
  const msg = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError/i.test(msg)) {
    return 'Không gọi được API tóm tắt. Kiểm tra Base URL, kết nối mạng và quyền truy cập (Cài đặt → Kiểm tra kết nối).';
  }
  if (/HTTP 401|HTTP 403/.test(msg)) return `${msg}. Kiểm tra API key trong Cài đặt.`;
  return msg;
}
