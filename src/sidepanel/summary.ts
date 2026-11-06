import { TARGET_LANGUAGES } from '../core/languages';
import { estimateSessionTokens } from '../core/minutes/pipeline';
import { MINUTES_TEMPLATES } from '../core/minutes/prompts';
import { friendlyError, progressText, runLiveSummary, runMinutes } from '../core/minutes/run';
import { saveSettings, type MinutesTemplateId, type Settings } from '../core/settings';
import { createSummarizer, summarizerConfigError } from '../core/summarize';
import type { Session } from '../core/types';

export interface SummaryDeps {
  getSession(): Session | null;
  /** True when the viewed session is the one currently being captured. */
  isLiveSession(): boolean;
  getSettings(): Settings;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function initSummaryTab(deps: SummaryDeps) {
  const el = {
    liveMeta: $('liveMeta'),
    liveText: $('liveText'),
    liveNow: $<HTMLButtonElement>('liveNow'),
    liveAuto: $<HTMLInputElement>('liveAuto'),
    liveInterval: $('liveInterval'),
    minutesMeta: $('minutesMeta'),
    tplSelect: $<HTMLSelectElement>('tplSelect'),
    langSelect: $<HTMLSelectElement>('langSelect'),
    extra: $<HTMLTextAreaElement>('extra'),
    hints: $<HTMLUListElement>('summaryHints'),
    genMinutes: $<HTMLButtonElement>('genMinutes'),
    cancelGen: $<HTMLButtonElement>('cancelGen'),
    genProgress: $('genProgress'),
    preview: $('minutesPreview'),
    actions: $('minutesActions'),
    openMinutes: $<HTMLButtonElement>('openMinutes'),
    exportDocx: $<HTMLButtonElement>('exportDocx'),
    docxTranscript: $<HTMLInputElement>('docxTranscript'),
  };

  el.tplSelect.replaceChildren(...MINUTES_TEMPLATES.map((t) => new Option(t.label, t.id)));
  el.langSelect.replaceChildren(...TARGET_LANGUAGES.map((l) => new Option(`Biên bản: ${l.name}`, l.code)));

  let generating: AbortController | null = null;
  let liveRunning: AbortController | null = null;
  let autoTimer: ReturnType<typeof setInterval> | undefined;
  let visible = false;

  function setProgress(text: string, error = false) {
    el.genProgress.hidden = !text;
    el.genProgress.textContent = text;
    el.genProgress.classList.toggle('error', error);
  }

  function renderLive(session: Session | null) {
    const live = session?.summary?.live;
    el.liveText.classList.toggle('placeholder', !live);
    if (live) {
      el.liveText.textContent = live.text;
      const pending = (session?.segments.length ?? 0) - live.upToSegment;
      el.liveMeta.textContent = `cập nhật ${new Date(live.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${pending > 0 ? ` · +${pending} câu mới` : ''}`;
    } else {
      el.liveText.textContent = 'Bấm "Tóm tắt ngay" để tóm tắt nội dung đến thời điểm hiện tại.';
      el.liveMeta.textContent = '';
    }
    el.liveNow.disabled = !session?.segments.length || !!liveRunning;
    el.liveNow.textContent = liveRunning ? '⏳ Đang tóm tắt…' : '⚡ Tóm tắt ngay';
    el.liveAuto.disabled = !deps.isLiveSession();
    if (!deps.isLiveSession() && el.liveAuto.checked) {
      el.liveAuto.checked = false;
      stopAuto();
    }
  }

  function renderHints(session: Session | null) {
    const settings = deps.getSettings();
    if (!settings) return;
    const hints: Array<{ text: string; warn?: boolean }> = [];
    const configError = summarizerConfigError(settings);
    if (configError) hints.push({ text: configError, warn: true });
    else {
      try {
        const s = createSummarizer(settings);
        hints.push({
          text: s.remoteHost
            ? `Transcript sẽ được gửi tới ${s.remoteHost} (${s.model}) để tóm tắt.`
            : `Tóm tắt bằng ${s.model} trên máy, dữ liệu không rời thiết bị.`,
        });
        if (!s.supportsOutputLanguage(el.langSelect.value)) {
          hints.push({ text: `${s.model} soạn bằng tiếng Anh rồi dịch sang ngôn ngữ đã chọn.` });
        }
      } catch {
        // config errors already reported
      }
    }
    if (session?.segments.length) {
      const hasSpeakers = session.segments.some((x) => x.speaker !== null);
      if (hasSpeakers && !Object.keys(session.speakerNames).length) {
        hints.push({ text: 'Mẹo: đổi tên "Speaker N" ở tab Phụ đề để biên bản ghi đúng tên người tham dự.' });
      }
      hints.push({ text: `Độ dài transcript ≈ ${estimateSessionTokens(session).toLocaleString()} token.` });
    }
    el.hints.replaceChildren(
      ...hints.map((h) => {
        const li = document.createElement('li');
        li.textContent = h.text;
        if (h.warn) li.className = 'warn';
        return li;
      }),
    );
  }

  function renderMinutes(session: Session | null) {
    const m = session?.summary?.minutes;
    const meta = session?.summary?.minutesMeta;
    el.genMinutes.disabled = !session?.segments.length || !!generating;
    el.genMinutes.textContent = m ? '🔄 Tạo lại biên bản' : '📝 Tạo biên bản';
    el.cancelGen.hidden = !generating;
    el.actions.hidden = !m;
    el.minutesMeta.textContent = meta
      ? `${meta.edited ? 'đã chỉnh sửa · ' : ''}${new Date(meta.generatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
      : '';
    el.preview.replaceChildren();
    if (!m) return;
    const add = (tag: string, text: string, cls?: string) => {
      const node = document.createElement(tag);
      node.textContent = text;
      if (cls) node.className = cls;
      el.preview.append(node);
      return node;
    };
    add('p', `${m.topics.length} chủ đề · ${m.decisions.length} quyết định · ${m.actionItems.length} việc cần làm`, 'stats');
    if (m.summary) {
      add('h4', 'Tóm tắt');
      add('p', m.summary);
    }
    const list = (title: string, items: string[]) => {
      if (!items.length) return;
      add('h4', title);
      const ul = document.createElement('ul');
      for (const t of items) {
        const li = document.createElement('li');
        li.textContent = t;
        ul.append(li);
      }
      el.preview.append(ul);
    };
    list('Quyết định', m.decisions.map((d) => d.text));
    list(
      'Việc cần làm',
      m.actionItems.map((a) => [a.task, a.owner && `→ ${a.owner}`, a.due && `(${a.due})`].filter(Boolean).join(' ')),
    );
  }

  function render() {
    const session = deps.getSession();
    const settings = deps.getSettings();
    if (!settings) return;
    if (document.activeElement !== el.tplSelect) el.tplSelect.value = settings.minutesTemplate;
    if (document.activeElement !== el.langSelect) el.langSelect.value = settings.minutesLanguage;
    el.liveInterval.textContent = String(settings.liveSummaryIntervalMin);
    renderLive(session);
    renderMinutes(session);
    if (visible) renderHints(session);
  }

  async function doLive(manual: boolean) {
    const session = deps.getSession();
    if (!session || liveRunning) return;
    const live = session.summary?.live;
    if (!manual && live && live.upToSegment >= session.segments.length) return;
    liveRunning = new AbortController();
    renderLive(session);
    try {
      await runLiveSummary(session.id, liveRunning.signal);
    } catch (e) {
      if (manual) setProgress(friendlyError(e), true);
      else el.liveMeta.textContent = `lỗi: ${friendlyError(e)}`;
    } finally {
      liveRunning = null;
      renderLive(deps.getSession());
    }
  }

  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = undefined;
  }

  el.liveNow.addEventListener('click', () => {
    setProgress('');
    void doLive(true);
  });

  el.liveAuto.addEventListener('change', () => {
    stopAuto();
    if (el.liveAuto.checked) {
      const ms = Math.max(1, deps.getSettings().liveSummaryIntervalMin) * 60_000;
      autoTimer = setInterval(() => {
        if (deps.isLiveSession()) void doLive(false);
      }, ms);
      void doLive(false);
    }
  });

  el.tplSelect.addEventListener('change', () => void saveSettings({ minutesTemplate: el.tplSelect.value as MinutesTemplateId }));
  el.langSelect.addEventListener('change', () => {
    void saveSettings({ minutesLanguage: el.langSelect.value });
    renderHints(deps.getSession());
  });

  el.genMinutes.addEventListener('click', async () => {
    const session = deps.getSession();
    if (!session || generating) return;
    if (session.summary?.minutesMeta?.edited && !el.genMinutes.dataset.confirm) {
      el.genMinutes.dataset.confirm = '1';
      el.genMinutes.textContent = '⚠ Ghi đè bản đã sửa? Bấm lần nữa';
      setTimeout(() => {
        delete el.genMinutes.dataset.confirm;
        renderMinutes(deps.getSession());
      }, 4000);
      return;
    }
    delete el.genMinutes.dataset.confirm;
    generating = new AbortController();
    renderMinutes(session);
    setProgress('Đang chuẩn bị…');
    try {
      await runMinutes(session.id, {
        template: el.tplSelect.value,
        language: el.langSelect.value,
        extraInstructions: el.extra.value,
        signal: generating.signal,
        onProgress: (p) => setProgress(progressText(p)),
      });
      setProgress('');
    } catch (e) {
      setProgress(friendlyError(e), (e as Error)?.name !== 'AbortError');
    } finally {
      generating = null;
      renderMinutes(deps.getSession());
    }
  });

  el.cancelGen.addEventListener('click', () => generating?.abort());

  el.openMinutes.addEventListener('click', () => {
    const session = deps.getSession();
    if (session) void chrome.tabs.create({ url: chrome.runtime.getURL(`minutes/index.html?session=${encodeURIComponent(session.id)}`) });
  });

  el.exportDocx.addEventListener('click', async () => {
    const session = deps.getSession();
    const m = session?.summary?.minutes;
    if (!session || !m) return;
    el.exportDocx.disabled = true;
    try {
      const { downloadMinutesDocx } = await import('../core/minutes/docx');
      await downloadMinutesDocx(m, {
        language: session.summary?.minutesMeta?.language ?? el.langSelect.value,
        session,
        includeTranscript: el.docxTranscript.checked,
      });
    } catch (e) {
      setProgress(friendlyError(e), true);
    } finally {
      el.exportDocx.disabled = false;
    }
  });

  return {
    render,
    setVisible(v: boolean) {
      visible = v;
      if (v) renderHints(deps.getSession());
    },
    /** Called when the viewed session changes. */
    reset() {
      generating?.abort();
      liveRunning?.abort();
      el.liveAuto.checked = false;
      stopAuto();
      setProgress('');
      render();
    },
  };
}
