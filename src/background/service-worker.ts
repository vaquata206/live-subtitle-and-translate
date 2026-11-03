import {
  broadcast,
  isBackgroundRequest,
  isOffscreenRequest,
  type BackgroundRequest,
  type BackgroundResponses,
  type BroadcastEvent,
  type OffscreenRequest,
} from '../core/messages';
import { loadSettings } from '../core/settings';
import { newId } from '../core/id';
import { applyFinalSegment, applyTranslation, createSession, renameSpeaker } from '../core/transcript/session';
import type { CaptureState, CaptureStatus } from '../core/types';
import { sessionStore } from './store';

const STATE_KEY = 'captureState';
const OFFSCREEN_PATH = 'offscreen/index.html';
const ACTIVE: CaptureStatus[] = ['starting', 'connecting', 'listening', 'reconnecting'];

// Opening the panel automatically on action click does NOT grant activeTab (and suppresses
// action.onClicked), which tabCapture requires. We open the panel ourselves in onClicked instead.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(console.error);

const PENDING_INVOKE_KEY = 'pendingInvokeTabId';

async function getState(): Promise<CaptureState> {
  const data = await chrome.storage.session.get(STATE_KEY);
  return (data[STATE_KEY] as CaptureState | undefined) ?? { status: 'idle' };
}

async function setState(patch: Partial<CaptureState>, replace = false): Promise<CaptureState> {
  const next = replace ? ({ status: 'idle', ...patch } as CaptureState) : { ...(await getState()), ...patch };
  await chrome.storage.session.set({ [STATE_KEY]: next });
  broadcast({ type: 'CAPTURE_STATE', state: next });
  void updateBadge(next);
  return next;
}

async function updateBadge(state: CaptureState) {
  const on = ACTIVE.includes(state.status);
  await chrome.action.setBadgeText({ text: on ? 'REC' : '' });
  if (on) await chrome.action.setBadgeBackgroundColor({ color: state.status === 'listening' ? '#dc2626' : '#f59e0b' });
}

const isActive = (s: CaptureState) => ACTIVE.includes(s.status);

// ---------- Offscreen document ----------

async function hasOffscreen(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
  });
  return contexts.length > 0;
}

let creatingOffscreen: Promise<void> | null = null;
async function ensureOffscreen(): Promise<void> {
  if (await hasOffscreen()) return;
  creatingOffscreen ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Capture tab audio for live transcription and translation',
    })
    .finally(() => {
      creatingOffscreen = null;
    });
  await creatingOffscreen;
}

async function closeOffscreen(): Promise<void> {
  if (await hasOffscreen()) await chrome.offscreen.closeDocument().catch(() => undefined);
}

async function sendToOffscreen(msg: OffscreenRequest): Promise<{ ok: boolean; error?: string }> {
  // The side panel also receives runtime messages but never answers offscreen requests,
  // so retry until the offscreen document's listener is registered and responds.
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const res = (await chrome.runtime.sendMessage(msg)) as { ok: boolean; error?: string } | undefined;
      if (res) return res;
    } catch {
      // receiver not ready yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return { ok: false, error: 'Offscreen document không phản hồi.' };
}

// ---------- Capture control ----------

function isNotInvokedError(e: unknown): boolean {
  return /invoked|activeTab/i.test(e instanceof Error ? e.message : String(e));
}

function friendlyCaptureError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (isNotInvokedError(e)) {
    return 'Chrome yêu cầu cấp quyền ghi âm cho tab này: hãy bấm biểu tượng extension trên thanh công cụ (hoặc Alt+Shift+S) khi đang ở tab này – phụ đề sẽ tự bắt đầu.';
  }
  if (/Chrome pages cannot be captured/i.test(msg)) return 'Không thể ghi âm trang nội bộ của Chrome (chrome://…).';
  if (/active stream/i.test(msg)) return 'Tab này đang được ghi âm bởi extension khác hoặc phiên trước. Hãy thử lại.';
  return msg;
}

async function startCapture(tabId: number): Promise<BackgroundResponses['START_CAPTURE']> {
  const current = await getState();
  if (isActive(current)) await stopCapture();

  const settings = await loadSettings();
  if (settings.sttProvider === 'deepgram' && !settings.deepgramApiKey) {
    const error = 'Chưa cấu hình Deepgram API key. Mở Cài đặt để nhập key.';
    await setState({ status: 'error', message: error }, true);
    return { ok: false, error };
  }

  await setState({ status: 'starting', tabId, message: undefined, sessionId: undefined }, true);

  let streamId: string;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  } catch (e) {
    const error = friendlyCaptureError(e);
    // Remember the tab so the next action click on it (which grants activeTab) starts capture.
    if (isNotInvokedError(e)) await chrome.storage.session.set({ [PENDING_INVOKE_KEY]: tabId });
    await setState({ status: 'error', message: error }, true);
    return { ok: false, error };
  }
  await chrome.storage.session.remove(PENDING_INVOKE_KEY);

  const tab =  await chrome.tabs.get(tabId).catch(() => undefined);
  const session = createSession({
    id: newId('m'),
    title: tab?.title || 'Cuộc họp',
    url: tab?.url,
    startedAt: Date.now(),
    sourceLanguage: settings.sourceLanguage,
    targetLanguage: settings.targetLanguage,
  });
  await sessionStore.create(session);
  await setState({ sessionId: session.id });

  try {
    await ensureOffscreen();
  } catch (e) {
    const error = `Không tạo được offscreen document: ${e instanceof Error ? e.message : String(e)}`;
    await setState({ status: 'error', message: error }, true);
    return { ok: false, error };
  }

  const res = await sendToOffscreen({
    target: 'offscreen',
    type: 'OFFSCREEN_START',
    streamId,
    sessionId: session.id,
    settings,
  });
  if (!res.ok) {
    await closeOffscreen();
    await finishSession(session.id);
    const error = res.error ?? 'Không thể bắt đầu ghi âm.';
    await setState({ status: 'error', message: error, sessionId: session.id, tabId: undefined });
    return { ok: false, error };
  }
  return { ok: true, sessionId: session.id };
}

async function finishSession(sessionId: string | undefined) {
  if (!sessionId) return;
  await sessionStore.update(sessionId, (s) => (s.endedAt ? s : { ...s, endedAt: Date.now() }));
}

let stopping: Promise<void> | null = null;
async function stopCapture(finalStatus: CaptureStatus = 'stopped', message?: string): Promise<void> {
  stopping ??= (async () => {
    const state = await getState();
    if (await hasOffscreen()) {
      await sendToOffscreenOnce({ target: 'offscreen', type: 'OFFSCREEN_STOP' });
      await closeOffscreen();
    }
    await finishSession(state.sessionId);
    await setState({ status: finalStatus, message, sessionId: state.sessionId, tabId: undefined });
  })().finally(() => {
    stopping = null;
  });
  return stopping;
}

async function sendToOffscreenOnce(msg: OffscreenRequest) {
  try {
    await Promise.race([chrome.runtime.sendMessage(msg), new Promise((r) => setTimeout(r, 3000))]);
  } catch {
    // offscreen already gone
  }
}

// ---------- Messaging ----------

async function handleRequest(msg: BackgroundRequest): Promise<unknown> {
  switch (msg.type) {
    case 'START_CAPTURE':
      return startCapture(msg.tabId);
    case 'STOP_CAPTURE':
      await stopCapture();
      return { ok: true };
    case 'GET_STATE': {
      const state = await getState();
      let session = state.sessionId ? await sessionStore.get(state.sessionId) : null;
      if (!session) {
        const [latest] = await sessionStore.list();
        session = latest ? await sessionStore.get(latest.id) : null;
      }
      return { state, session };
    }
    case 'LIST_SESSIONS':
      return { sessions: await sessionStore.list() };
    case 'GET_SESSION':
      return { session: await sessionStore.get(msg.sessionId) };
    case 'DELETE_SESSION':
      await sessionStore.delete(msg.sessionId);
      return { ok: true };
    case 'RENAME_SPEAKER': {
      const session = await sessionStore.update(msg.sessionId, (s) => renameSpeaker(s, msg.speaker, msg.name));
      if (session) broadcast({ type: 'SESSION_UPDATED', session });
      return { session };
    }
  }
}

async function handleEvent(ev: BroadcastEvent): Promise<void> {
  switch (ev.type) {
    case 'STATUS': {
      const state = await getState();
      if (ev.sessionId && state.sessionId && ev.sessionId !== state.sessionId) return;
      if (ev.status === 'stopped' || ev.status === 'error') {
        if (isActive(state)) await stopCapture(ev.status, ev.message);
      } else if (isActive(state)) {
        await setState({ status: ev.status, message: ev.message });
      }
      return;
    }
    case 'SEGMENT_FINAL':
      await sessionStore.update(ev.sessionId, (s) => applyFinalSegment(s, ev.segment));
      return;
    case 'SEGMENT_TRANSLATED':
      await sessionStore.update(ev.sessionId, (s) => applyTranslation(s, ev.id, ev.translation, ev.error));
      return;
    default:
      return;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (isOffscreenRequest(msg)) return;
  if (isBackgroundRequest(msg)) {
    handleRequest(msg).then(sendResponse, (e) => sendResponse({ ok: false, error: String(e?.message ?? e) }));
    return true;
  }
  void handleEvent(msg as BroadcastEvent).catch(console.error);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'toggle-capture' || !tab?.id) return;
  const tabId = tab.id;
  // sidePanel.open must be called synchronously within the user gesture.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => undefined);
  void getState().then(async (s) => {
    if (isActive(s)) await stopCapture();
    else await startCapture(tabId);
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  const tabId = tab.id;
  // Must run synchronously within the user gesture; opens the window-wide panel.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
  void (async () => {
    const data = await chrome.storage.session.get(PENDING_INVOKE_KEY);
    const state = await getState();
    if (data[PENDING_INVOKE_KEY] === tabId && !isActive(state)) await startCapture(tabId);
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void getState().then((s) => {
    if (isActive(s) && s.tabId === tabId) void stopCapture('stopped', 'Tab cuộc họp đã đóng.');
  });
});

chrome.runtime.onStartup.addListener(() => {
  void setState({ status: 'idle' }, true);
});
