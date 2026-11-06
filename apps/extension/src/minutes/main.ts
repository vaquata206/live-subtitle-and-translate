import { TARGET_LANGUAGES } from '@lst/core/languages';
import { sendToBackground, type BroadcastEvent } from '../lib/messages';
import { minutesLabels, type MinutesLabels } from '@lst/core/minutes/labels';
import { MINUTES_TEMPLATES } from '@lst/core/minutes/prompts';
import { friendlyError, progressText, runMinutes } from '../lib/minutes-run';
import { formatTimestamp } from '@lst/core/minutes/transcriptText';
import { loadSettings } from '../lib/settings';
import { speakerLabel } from '@lst/core/transcript/session';
import type { MeetingMinutes, MinutesMeta, Session } from '@lst/core/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const el = {
  saveState: $('saveState'),
  tpl: $<HTMLSelectElement>('tpl'),
  lang: $<HTMLSelectElement>('lang'),
  regen: $<HTMLButtonElement>('regen'),
  cancel: $<HTMLButtonElement>('cancel'),
  withTranscript: $<HTMLInputElement>('withTranscript'),
  withRefs: $<HTMLInputElement>('withRefs'),
  export: $<HTMLButtonElement>('export'),
  progress: $('progress'),
  doc: $('doc'),
  title: $<HTMLInputElement>('title'),
  metaLine: $('metaLine'),
  participants: $<HTMLTextAreaElement>('participants'),
  summary: $<HTMLTextAreaElement>('summary'),
  topics: $('topics'),
  decisions: $('decisions'),
  actions: $('actions'),
  openQuestions: $<HTMLTextAreaElement>('openQuestions'),
  nextSteps: $<HTMLTextAreaElement>('nextSteps'),
  addTopic: $<HTMLButtonElement>('addTopic'),
  addDecision: $<HTMLButtonElement>('addDecision'),
  addAction: $<HTMLButtonElement>('addAction'),
  empty: $('empty'),
  emptyText: $('emptyText'),
  generate: $<HTMLButtonElement>('generate'),
  refPanel: $('refPanel'),
  refTitle: $('refTitle'),
  refBody: $('refBody'),
  refClose: $<HTMLButtonElement>('refClose'),
};

const sessionId = new URLSearchParams(location.search).get('session') ?? '';
let session: Session | null = null;
let minutes: MeetingMinutes | null = null;
let meta: MinutesMeta | null = null;
let lastSavedJson = '';
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let generating: AbortController | null = null;

el.tpl.replaceChildren(...MINUTES_TEMPLATES.map((t) => new Option(t.label, t.id)));
el.lang.replaceChildren(...TARGET_LANGUAGES.map((l) => new Option(l.name, l.code)));

// ---------- Helpers ----------

function autoGrow(t: HTMLTextAreaElement) {
  t.style.height = 'auto';
  t.style.height = `${t.scrollHeight + 2}px`;
}

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function textarea(value: string, onInput: (v: string) => void, placeholder = '', cls = 'grow'): HTMLTextAreaElement {
  const t = document.createElement('textarea');
  t.className = cls;
  t.rows = 1;
  t.value = value;
  t.placeholder = placeholder;
  t.addEventListener('input', () => {
    autoGrow(t);
    onInput(t.value);
    scheduleSave();
  });
  requestAnimationFrame(() => autoGrow(t));
  return t;
}

function delButton(onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn del';
  b.title = 'Xoá';
  b.textContent = '✕';
  b.addEventListener('click', () => {
    onClick();
    renderLists();
    scheduleSave();
  });
  return b;
}

function refChips(refs: number[]): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'refs';
  for (const r of refs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ref';
    b.textContent = formatTimestamp(r);
    b.title = 'Xem đoạn transcript';
    b.addEventListener('click', () => showRef(r));
    wrap.append(b);
  }
  return wrap;
}

function labels(): MinutesLabels {
  return minutesLabels(meta?.language ?? el.lang.value);
}

// ---------- Rendering ----------

function renderHeadings() {
  const L = labels();
  for (const h of document.querySelectorAll<HTMLElement>('[data-label]')) {
    const text = L[h.dataset.label as keyof MinutesLabels];
    h.textContent = h.dataset.num ? `${h.dataset.num}. ${text}` : text;
  }
}

function renderMeta() {
  if (!minutes) return;
  const L = labels();
  const d = new Date(minutes.date);
  const parts = [
    `${L.date}: ${d.toLocaleDateString()}`,
    `${L.time}: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    `${L.duration}: ${minutes.durationMinutes} ${L.minutes}`,
  ];
  el.metaLine.textContent = parts.join(' · ');
}

function renderLists() {
  if (!minutes) return;
  const m = minutes;

  el.topics.replaceChildren(
    ...m.topics.map((t, i) => {
      const box = document.createElement('div');
      box.className = 'topic';
      const head = document.createElement('div');
      head.className = 'item-row';
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = `2.${i + 1}`;
      const title = textarea(t.title, (v) => (t.title = v), 'Tên chủ đề', 'grow topic-title');
      head.append(
        num,
        title,
        refChips(t.refs),
        delButton(() => m.topics.splice(i, 1)),
      );
      const points = textarea(t.points.join('\n'), (v) => (t.points = lines(v)), 'Các ý chính, mỗi ý một dòng');
      box.append(head, points);
      return box;
    }),
  );

  el.decisions.replaceChildren(
    ...m.decisions.map((d, i) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = `${i + 1}.`;
      row.append(
        num,
        textarea(d.text, (v) => (d.text = v), 'Nội dung quyết định'),
        refChips(d.refs),
        delButton(() => m.decisions.splice(i, 1)),
      );
      return row;
    }),
  );

  el.actions.replaceChildren(
    ...m.actionItems.map((a, i) => {
      const tr = document.createElement('tr');
      const td = (...children: Node[]) => {
        const c = document.createElement('td');
        c.append(...children);
        tr.append(c);
        return c;
      };
      td(document.createTextNode(String(i + 1))).className = 'c-no';
      const taskCell = td(textarea(a.task, (v) => (a.task = v), 'Công việc', ''));
      if (a.refs.length) taskCell.append(refChips(a.refs));
      td(textarea(a.owner, (v) => (a.owner = v), '—', ''));
      td(textarea(a.due, (v) => (a.due = v), '—', ''));
      td(delButton(() => m.actionItems.splice(i, 1)));
      return tr;
    }),
  );
}

function renderAll() {
  const has = !!minutes;
  el.doc.hidden = !has;
  el.empty.hidden = has || !!generating;
  el.export.disabled = !has || !!generating;
  el.regen.disabled = !session?.segments.length || !!generating;
  el.generate.disabled = !session?.segments.length || !!generating;
  el.cancel.hidden = !generating;
  el.emptyText.textContent = session?.segments.length
    ? 'Phiên này chưa có biên bản.'
    : 'Phiên này chưa có nội dung transcript.';
  if (meta) {
    el.tpl.value = meta.template;
    el.lang.value = meta.language;
  }
  renderHeadings();
  if (!minutes) return;
  document.title = `Biên bản – ${minutes.title}`;
  el.title.value = minutes.title;
  el.participants.value = minutes.participants.join('\n');
  el.summary.value = minutes.summary;
  el.openQuestions.value = minutes.openQuestions.join('\n');
  el.nextSteps.value = minutes.nextSteps.join('\n');
  for (const t of [el.participants, el.summary, el.openQuestions, el.nextSteps])
    requestAnimationFrame(() => autoGrow(t));
  renderMeta();
  renderLists();
  el.saveState.textContent = meta?.edited
    ? 'Đã chỉnh sửa'
    : meta
      ? `Tạo lúc ${new Date(meta.generatedAt).toLocaleString()}`
      : '';
}

// ---------- Editing & saving ----------

function bindStatic(t: HTMLTextAreaElement | HTMLInputElement, apply: (v: string) => void) {
  t.addEventListener('input', () => {
    if (!minutes) return;
    if (t instanceof HTMLTextAreaElement) autoGrow(t);
    apply(t.value);
    scheduleSave();
  });
}

bindStatic(el.title, (v) => (minutes!.title = v));
bindStatic(el.participants, (v) => (minutes!.participants = lines(v)));
bindStatic(el.summary, (v) => (minutes!.summary = v));
bindStatic(el.openQuestions, (v) => (minutes!.openQuestions = lines(v)));
bindStatic(el.nextSteps, (v) => (minutes!.nextSteps = lines(v)));

el.addTopic.addEventListener('click', () => {
  minutes?.topics.push({ title: '', points: [], refs: [] });
  renderLists();
  scheduleSave();
});
el.addDecision.addEventListener('click', () => {
  minutes?.decisions.push({ text: '', refs: [] });
  renderLists();
  scheduleSave();
});
el.addAction.addEventListener('click', () => {
  minutes?.actionItems.push({ task: '', owner: '', due: '', refs: [] });
  renderLists();
  scheduleSave();
});

function scheduleSave() {
  el.saveState.textContent = 'Đang lưu…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
}

async function save() {
  if (!minutes || !session) return;
  const json = JSON.stringify(minutes);
  if (json === lastSavedJson) {
    el.saveState.textContent = 'Đã lưu';
    return;
  }
  meta = {
    ...(meta ?? {
      provider: 'manual',
      model: '',
      template: el.tpl.value,
      language: el.lang.value,
      generatedAt: Date.now(),
    }),
    edited: true,
  };
  lastSavedJson = json;
  await sendToBackground({ type: 'UPDATE_SUMMARY', sessionId: session.id, patch: { minutes, minutesMeta: meta } });
  el.saveState.textContent = 'Đã lưu';
}

async function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    await save();
  }
}

// ---------- Transcript references ----------

function showRef(seconds: number) {
  if (!session) return;
  el.refPanel.hidden = false;
  el.refTitle.textContent = `Transcript quanh ${formatTimestamp(seconds)}`;
  const nearby = session.segments.filter((s) => s.end >= seconds - 20 && s.start <= seconds + 60);
  el.refBody.replaceChildren(
    ...(nearby.length ? nearby : []).map((s) => {
      const div = document.createElement('div');
      div.className = 'ref-line';
      if (s.start <= seconds + 5 && s.end >= seconds - 1) div.classList.add('hit');
      const t = document.createElement('span');
      t.className = 't';
      t.textContent = formatTimestamp(s.start);
      div.append(t);
      const who = speakerLabel(session!, s.speaker);
      if (who) {
        const w = document.createElement('span');
        w.className = 'who';
        w.textContent = `${who}:`;
        div.append(w);
      }
      div.append(document.createTextNode(s.text));
      if (s.translation && s.translation !== s.text) {
        const tr = document.createElement('span');
        tr.className = 'tr';
        tr.textContent = s.translation;
        div.append(tr);
      }
      return div;
    }),
  );
  if (!nearby.length) el.refBody.textContent = 'Không tìm thấy đoạn transcript tương ứng.';
  el.refBody.querySelector('.hit')?.scrollIntoView({ block: 'center' });
}

el.refClose.addEventListener('click', () => (el.refPanel.hidden = true));

// ---------- Generate & export ----------

function setProgress(text: string, error = false) {
  el.progress.hidden = !text;
  el.progress.textContent = text;
  el.progress.classList.toggle('error', error);
}

async function generate() {
  if (!session || generating) return;
  if (meta?.edited && !confirm('Biên bản đã được chỉnh sửa. Tạo lại sẽ ghi đè các chỉnh sửa. Tiếp tục?')) return;
  await flushSave();
  generating = new AbortController();
  renderAll();
  setProgress('Đang chuẩn bị…');
  try {
    const saved = await runMinutes(session.id, {
      template: el.tpl.value,
      language: el.lang.value,
      signal: generating.signal,
      onProgress: (p) => setProgress(progressText(p)),
    });
    applySession(saved, true);
    setProgress('');
  } catch (e) {
    setProgress(friendlyError(e), (e as Error)?.name !== 'AbortError');
  } finally {
    generating = null;
    renderAll();
  }
}

el.regen.addEventListener('click', () => void generate());
el.generate.addEventListener('click', () => void generate());
el.cancel.addEventListener('click', () => generating?.abort());

el.export.addEventListener('click', async () => {
  if (!minutes || !session) return;
  await flushSave();
  el.export.disabled = true;
  try {
    const { downloadMinutesDocx } = await import('@lst/core/minutes/docx');
    await downloadMinutesDocx(minutes, {
      language: meta?.language ?? el.lang.value,
      session,
      includeTranscript: el.withTranscript.checked,
      includeRefs: el.withRefs.checked,
    });
  } catch (e) {
    setProgress(friendlyError(e), true);
  } finally {
    el.export.disabled = false;
  }
});

// ---------- Sync ----------

function applySession(s: Session, force = false) {
  session = s;
  const incoming = s.summary?.minutes ?? null;
  const incomingJson = incoming ? JSON.stringify(incoming) : '';
  // Ignore echoes of our own saves; otherwise take external changes (e.g. regenerated in the side panel).
  if (!force && incomingJson === lastSavedJson) return;
  if (!force && saveTimer) return;
  minutes = incoming ? structuredClone(incoming) : null;
  meta = s.summary?.minutesMeta ?? null;
  lastSavedJson = incomingJson;
  renderAll();
}

chrome.runtime.onMessage.addListener((msg: BroadcastEvent & { target?: string }) => {
  if (msg?.type === 'SESSION_UPDATED' && msg.session.id === sessionId) applySession(msg.session);
});

window.addEventListener('beforeunload', () => {
  if (saveTimer) void save();
});

async function init() {
  const settings = await loadSettings();
  el.tpl.value = settings.minutesTemplate;
  el.lang.value = settings.minutesLanguage;
  if (!sessionId) {
    el.empty.hidden = false;
    el.emptyText.textContent = 'Thiếu mã phiên. Hãy mở trang này từ Side Panel.';
    el.generate.hidden = true;
    return;
  }
  const { session: s } = await sendToBackground({ type: 'GET_SESSION', sessionId });
  if (!s) {
    el.empty.hidden = false;
    el.emptyText.textContent = 'Không tìm thấy phiên (có thể đã bị xoá).';
    el.generate.hidden = true;
    return;
  }
  applySession(s, true);
}

void init();
