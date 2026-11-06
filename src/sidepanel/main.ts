import { languageName } from '../core/languages';
import { sendToBackground, type BroadcastEvent } from '../core/messages';
import { loadSettings, loadUiPrefs, saveUiPrefs, type Settings, type UiPrefs, type ViewMode } from '../core/settings';
import { TRANSLATOR_LABELS } from '../core/translate';
import { exportFileName, formatClock, toSrt, toTxt } from '../core/transcript/export';
import { applyFinalSegment, applyTranslation, speakerLabel } from '../core/transcript/session';
import type { CaptureState, CaptureStatus, Segment, Session, SessionMeta } from '../core/types';
import { initSummaryTab } from './summary';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  status: $<HTMLDivElement>('status'),
  statusText: $<HTMLSpanElement>('statusText'),
  toggle: $<HTMLButtonElement>('toggle'),
  notice: $<HTMLDivElement>('notice'),
  sessionSelect: $<HTMLSelectElement>('sessionSelect'),
  viewMode: $<HTMLSelectElement>('viewMode'),
  fontDown: $<HTMLButtonElement>('fontDown'),
  fontUp: $<HTMLButtonElement>('fontUp'),
  toggleTime: $<HTMLButtonElement>('toggleTime'),
  copy: $<HTMLButtonElement>('copy'),
  exportTxt: $<HTMLButtonElement>('exportTxt'),
  exportSrt: $<HTMLButtonElement>('exportSrt'),
  deleteSession: $<HTMLButtonElement>('deleteSession'),
  openSettings: $<HTMLButtonElement>('openSettings'),
  transcript: $<HTMLElement>('transcript'),
  empty: $<HTMLDivElement>('empty'),
  interim: $<HTMLDivElement>('interim'),
  jump: $<HTMLButtonElement>('jump'),
  footer: $<HTMLElement>('footer'),
};

const STATUS_TEXT: Record<CaptureStatus, string> = {
  idle: 'Sẵn sàng',
  starting: 'Đang khởi động…',
  connecting: 'Đang kết nối nhận dạng giọng nói…',
  listening: 'Đang nghe',
  reconnecting: 'Đang kết nối lại…',
  error: 'Lỗi',
  stopped: 'Đã dừng',
};
const ACTIVE: CaptureStatus[] = ['starting', 'connecting', 'listening', 'reconnecting'];
const SPEAKER_COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#be123c'];

let captureState: CaptureState = { status: 'idle' };
let session: Session | null = null;
let viewedSessionId: string | null = null;
let loadingSession = false;
let bufferedEvents: BroadcastEvent[] = [];
let prefs: UiPrefs;
let settings: Settings;

const summaryTab = initSummaryTab({
  getSession: () => session,
  isLiveSession: () => isActive() && !!session && session.id === captureState.sessionId,
  getSettings: () => settings,
});

for (const tab of document.querySelectorAll<HTMLButtonElement>('.tab')) {
  tab.addEventListener('click', () => {
    const summary = tab.dataset.tab === 'summary';
    document.body.classList.toggle('tab-summary', summary);
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    summaryTab.setVisible(summary);
  });
}

// ---------- Rendering ----------

function isActive() {
  return ACTIVE.includes(captureState.status);
}

function renderStatus() {
  els.status.dataset.status = captureState.status;
  els.statusText.textContent = STATUS_TEXT[captureState.status];
  els.toggle.textContent = isActive() ? '■ Dừng' : '▶ Bắt đầu';
  els.toggle.classList.toggle('stop', isActive());
  els.toggle.disabled = captureState.status === 'starting';
  if (captureState.status === 'error' && captureState.message) showNotice(captureState.message);
  else if (captureState.status === 'reconnecting' && captureState.message) showNotice(captureState.message, 'info');
  else if (captureState.status === 'stopped' && captureState.message) showNotice(captureState.message, 'info');
  else if (captureState.status === 'listening') hideNotice();
}

function showNotice(text: string, kind: 'error' | 'info' = 'error', withSettingsLink = false) {
  els.notice.hidden = false;
  els.notice.className = `notice ${kind === 'info' ? 'info' : ''}`;
  els.notice.textContent = text;
  if (withSettingsLink || /Cài đặt|API key/i.test(text)) {
    const a = document.createElement('a');
    a.textContent = ' Mở Cài đặt';
    a.addEventListener('click', () => chrome.runtime.openOptionsPage());
    els.notice.append(a);
  }
}

function hideNotice() {
  els.notice.hidden = true;
}

function applyPrefs() {
  document.documentElement.style.setProperty('--font-size', `${prefs.fontSize}px`);
  document.body.dataset.view = prefs.viewMode;
  document.body.classList.toggle('hide-time', !prefs.showTimestamps);
  els.viewMode.value = prefs.viewMode;
}

function renderFooter() {
  const src = languageName(settings.sourceLanguage);
  const tgt = languageName(settings.targetLanguage);
  const tr = settings.translateEnabled ? `${TRANSLATOR_LABELS[settings.translatorProvider].split(' (')[0]}` : 'tắt dịch';
  els.footer.textContent = `${src} → ${tgt} · Deepgram ${settings.deepgramModel} · ${tr}`;
  els.footer.title = els.footer.textContent;
}

function speakerColor(speaker: number | null) {
  return speaker === null ? 'var(--fg-2)' : SPEAKER_COLORS[speaker % SPEAKER_COLORS.length];
}

function isContinuation(prev: Segment | undefined, seg: Segment) {
  return !!prev && prev.speaker === seg.speaker && seg.start - prev.end < 4;
}

function buildSegment(seg: Segment, prev: Segment | undefined): HTMLElement {
  const el = document.createElement('div');
  el.className = 'seg';
  el.dataset.id = seg.id;
  if (isContinuation(prev, seg)) el.classList.add('cont');

  const meta = document.createElement('div');
  meta.className = 'meta';
  if (seg.speaker !== null && session) {
    const sp = document.createElement('span');
    sp.className = 'speaker';
    sp.style.setProperty('--c', speakerColor(seg.speaker));
    sp.textContent = speakerLabel(session, seg.speaker);
    sp.title = 'Bấm để đổi tên người nói';
    sp.addEventListener('click', () => beginRename(sp, seg.speaker!));
    meta.append(sp);
  }
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = formatClock(seg.start);
  meta.append(time);

  const orig = document.createElement('div');
  orig.className = 'orig';
  orig.textContent = seg.text;

  const trans = document.createElement('div');
  trans.className = 'trans';
  el.append(meta, orig, trans);
  fillTranslation(el, seg);
  return el;
}

function fillTranslation(el: HTMLElement, seg: Segment) {
  const orig = el.querySelector('.orig')!;
  const trans = el.querySelector<HTMLElement>('.trans')!;
  trans.classList.remove('pending', 'error');
  orig.classList.toggle('has-trans', !!seg.translation);
  if (seg.translation) {
    trans.textContent = seg.translation;
    trans.hidden = seg.translation === seg.text;
  } else if (seg.translationError) {
    trans.hidden = false;
    trans.classList.add('error');
    trans.textContent = `⚠ ${seg.translationError}`;
  } else if (settings.translateEnabled && isActive() && session?.id === captureState.sessionId) {
    trans.hidden = false;
    trans.classList.add('pending');
    trans.textContent = 'đang dịch…';
  } else {
    trans.hidden = true;
    trans.textContent = '';
  }
}

function nearBottom() {
  const t = els.transcript;
  return t.scrollHeight - t.scrollTop - t.clientHeight < 80;
}

function scrollToBottom() {
  els.transcript.scrollTop = els.transcript.scrollHeight;
  els.jump.hidden = true;
}

function renderTranscript() {
  els.transcript.replaceChildren();
  if (!session || session.segments.length === 0) {
    els.transcript.append(els.empty);
  } else {
    const frag = document.createDocumentFragment();
    session.segments.forEach((seg, i) => frag.append(buildSegment(seg, session!.segments[i - 1])));
    els.transcript.append(frag);
  }
  scrollToBottom();
  updateToolbarState();
}

function appendSegment(seg: Segment) {
  if (!session) return;
  const idx = session.segments.findIndex((s) => s.id === seg.id);
  if (idx !== session.segments.length - 1) {
    renderTranscript();
    return;
  }
  const stick = nearBottom();
  if (els.empty.isConnected) els.empty.remove();
  els.transcript.append(buildSegment(session.segments[idx], session.segments[idx - 1]));
  if (stick && prefs.autoScroll) scrollToBottom();
  else els.jump.hidden = false;
  updateToolbarState();
}

function updateSegmentTranslation(id: string) {
  const seg = session?.segments.find((s) => s.id === id);
  const el = els.transcript.querySelector<HTMLElement>(`.seg[data-id="${CSS.escape(id)}"]`);
  if (!seg || !el) return;
  const stick = nearBottom();
  fillTranslation(el, seg);
  if (stick && prefs.autoScroll) scrollToBottom();
}

function renderInterim(seg: Segment | null) {
  if (!seg || !seg.text) {
    els.interim.hidden = true;
    els.interim.replaceChildren();
    return;
  }
  els.interim.hidden = false;
  els.interim.replaceChildren();
  if (seg.speaker !== null && session) {
    const sp = document.createElement('span');
    sp.className = 'speaker';
    sp.style.setProperty('--c', speakerColor(seg.speaker));
    sp.textContent = speakerLabel(session, seg.speaker);
    els.interim.append(sp);
  }
  els.interim.append(document.createTextNode(seg.text));
}

function beginRename(chip: HTMLElement, speaker: number) {
  if (!session) return;
  const sessionId = session.id;
  const input = document.createElement('input');
  input.className = 'speaker-input';
  input.value = session.speakerNames[speaker] ?? '';
  input.placeholder = `Speaker ${speaker + 1}`;
  chip.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async (save: boolean) => {
    if (done) return;
    done = true;
    if (save) {
      const res = await sendToBackground({ type: 'RENAME_SPEAKER', sessionId, speaker, name: input.value });
      if (res.session && session?.id === sessionId) {
        session = res.session;
        renderTranscript();
        return;
      }
    }
    input.replaceWith(chip);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void finish(true);
    if (e.key === 'Escape') void finish(false);
  });
  input.addEventListener('blur', () => void finish(true));
}

function updateToolbarState() {
  const has = !!session && session.segments.length > 0;
  els.copy.disabled = !has;
  els.exportTxt.disabled = !has;
  els.exportSrt.disabled = !has;
  els.deleteSession.disabled = !session || (isActive() && session.id === captureState.sessionId);
}

async function refreshSessionList() {
  const { sessions } = await sendToBackground({ type: 'LIST_SESSIONS' });
  renderSessionOptions(sessions);
}

function renderSessionOptions(sessions: SessionMeta[]) {
  els.sessionSelect.replaceChildren();
  if (!sessions.length) {
    const opt = new Option('Chưa có phiên nào', '');
    els.sessionSelect.append(opt);
    els.sessionSelect.disabled = true;
    return;
  }
  els.sessionSelect.disabled = false;
  for (const s of sessions) {
    const live = isActive() && s.id === captureState.sessionId ? '● ' : '';
    const when = new Date(s.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    els.sessionSelect.append(new Option(`${live}${when} · ${s.title} (${s.segmentCount})`, s.id));
  }
  if (viewedSessionId) els.sessionSelect.value = viewedSessionId;
}

let listRefreshTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSessionListRefresh() {
  if (listRefreshTimer) return;
  listRefreshTimer = setTimeout(() => {
    listRefreshTimer = undefined;
    void refreshSessionList();
  }, 3000);
}

// ---------- Session switching ----------

async function viewSession(id: string | null) {
  viewedSessionId = id;
  renderInterim(null);
  if (!id) {
    session = null;
    renderTranscript();
    summaryTab.reset();
    return;
  }
  loadingSession = true;
  bufferedEvents = [];
  const { session: loaded } = await sendToBackground({ type: 'GET_SESSION', sessionId: id });
  if (viewedSessionId !== id) return;
  session = loaded;
  loadingSession = false;
  const pending = bufferedEvents;
  bufferedEvents = [];
  for (const ev of pending) applyEventToSession(ev, false);
  renderTranscript();
  summaryTab.reset();
  if (els.sessionSelect.querySelector(`option[value="${CSS.escape(id)}"]`)) els.sessionSelect.value = id;
}

/** Applies a stored session snapshot without losing live segments/translations not yet persisted. */
function mergeSession(local: Session, incoming: Session): Session {
  let merged = incoming;
  const incomingById = new Map(incoming.segments.map((s) => [s.id, s]));
  for (const seg of local.segments) {
    const stored = incomingById.get(seg.id);
    if (!stored) merged = applyFinalSegment(merged, seg);
    else if (!stored.translation && !stored.translationError && (seg.translation || seg.translationError)) {
      merged = applyTranslation(merged, seg.id, seg.translation, seg.translationError);
    }
  }
  return merged;
}

function applyEventToSession(ev: BroadcastEvent, render: boolean) {
  if (!session) return;
  switch (ev.type) {
    case 'SEGMENT_FINAL':
      session = applyFinalSegment(session, ev.segment);
      if (render) {
        renderInterim(null);
        appendSegment(ev.segment);
        summaryTab.render();
      }
      break;
    case 'SEGMENT_TRANSLATED':
      session = applyTranslation(session, ev.id, ev.translation, ev.error);
      if (render) updateSegmentTranslation(ev.id);
      break;
    default:
      break;
  }
}

// ---------- Events ----------

chrome.runtime.onMessage.addListener((msg: BroadcastEvent & { target?: string }) => {
  if (msg?.target) return;
  switch (msg.type) {
    case 'CAPTURE_STATE': {
      const prevSession = captureState.sessionId;
      const wasActive = isActive();
      captureState = msg.state;
      renderStatus();
      if (isActive() && msg.state.sessionId && msg.state.sessionId !== prevSession) {
        hideNotice();
        void viewSession(msg.state.sessionId).then(refreshSessionList);
      } else if (wasActive && !isActive()) {
        renderInterim(null);
        void refreshSessionList();
        if (session) renderTranscript();
      }
      updateToolbarState();
      summaryTab.render();
      break;
    }
    case 'SEGMENT_INTERIM':
      if (msg.sessionId === viewedSessionId && !loadingSession) renderInterim(msg.segment);
      break;
    case 'SEGMENT_FINAL':
    case 'SEGMENT_TRANSLATED':
      if (msg.type === 'SEGMENT_FINAL') scheduleSessionListRefresh();
      if (msg.sessionId !== viewedSessionId) break;
      if (loadingSession) bufferedEvents.push(msg);
      else applyEventToSession(msg, true);
      break;
    case 'SESSION_UPDATED':
      if (msg.session.id === viewedSessionId) {
        const namesChanged = JSON.stringify(session?.speakerNames ?? {}) !== JSON.stringify(msg.session.speakerNames);
        session = session ? mergeSession(session, msg.session) : msg.session;
        if (namesChanged) renderTranscript();
        summaryTab.render();
      }
      break;
    default:
      break;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    void loadSettings().then((s) => {
      settings = s;
      renderFooter();
      summaryTab.render();
    });
  }
});

els.toggle.addEventListener('click', async () => {
  hideNotice();
  if (isActive()) {
    els.toggle.disabled = true;
    await sendToBackground({ type: 'STOP_CAPTURE' });
    els.toggle.disabled = false;
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showNotice('Không tìm thấy tab đang mở.');
    return;
  }
  els.toggle.disabled = true;
  const res = await sendToBackground({ type: 'START_CAPTURE', tabId: tab.id });
  els.toggle.disabled = false;
  if (!res.ok) showNotice(res.error);
});

els.sessionSelect.addEventListener('change', () => void viewSession(els.sessionSelect.value || null));

els.viewMode.addEventListener('change', async () => {
  prefs = await saveUiPrefs({ viewMode: els.viewMode.value as ViewMode });
  applyPrefs();
});

els.fontDown.addEventListener('click', async () => {
  prefs = await saveUiPrefs({ fontSize: Math.max(11, prefs.fontSize - 1) });
  applyPrefs();
});

els.fontUp.addEventListener('click', async () => {
  prefs = await saveUiPrefs({ fontSize: Math.min(28, prefs.fontSize + 1) });
  applyPrefs();
});

els.toggleTime.addEventListener('click', async () => {
  prefs = await saveUiPrefs({ showTimestamps: !prefs.showTimestamps });
  applyPrefs();
});

els.copy.addEventListener('click', async () => {
  if (!session) return;
  await navigator.clipboard.writeText(toTxt(session, prefs.viewMode));
  flash(els.copy, '✓');
});

function download(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

els.exportTxt.addEventListener('click', () => {
  if (session) download(toTxt(session, prefs.viewMode), exportFileName(session, 'txt'), 'text/plain');
});

els.exportSrt.addEventListener('click', () => {
  if (session) download(toSrt(session, prefs.viewMode), exportFileName(session, 'srt'), 'application/x-subrip');
});

let deleteTimer: ReturnType<typeof setTimeout> | undefined;
els.deleteSession.addEventListener('click', async () => {
  if (!session) return;
  if (!els.deleteSession.classList.contains('confirm')) {
    els.deleteSession.classList.add('confirm');
    els.deleteSession.textContent = 'Xoá?';
    deleteTimer = setTimeout(resetDeleteButton, 3000);
    return;
  }
  clearTimeout(deleteTimer);
  resetDeleteButton();
  await sendToBackground({ type: 'DELETE_SESSION', sessionId: session.id });
  const { sessions } = await sendToBackground({ type: 'LIST_SESSIONS' });
  renderSessionOptions(sessions);
  await viewSession(sessions[0]?.id ?? null);
});

function resetDeleteButton() {
  els.deleteSession.classList.remove('confirm');
  els.deleteSession.textContent = '🗑';
}

els.openSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());

els.transcript.addEventListener('scroll', () => {
  if (nearBottom()) els.jump.hidden = true;
});
els.jump.addEventListener('click', scrollToBottom);

function flash(btn: HTMLButtonElement, text: string) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1200);
}

// ---------- Init ----------

async function init() {
  [prefs, settings] = await Promise.all([loadUiPrefs(), loadSettings()]);
  applyPrefs();
  renderFooter();
  const { state, session: current } = await sendToBackground({ type: 'GET_STATE' });
  captureState = state;
  session = current;
  viewedSessionId = current?.id ?? null;
  renderStatus();
  renderTranscript();
  summaryTab.render();
  await refreshSessionList();
  if (!settings.deepgramApiKey) showNotice('Chưa có Deepgram API key – cần để nhận dạng giọng nói.', 'info', true);
}

void init();
