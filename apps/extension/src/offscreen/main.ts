import { PcmDownsampler } from '../lib/audio/pcm';
import { broadcast, isOffscreenRequest, type OffscreenRequest } from '../lib/messages';
import type { Settings } from '../lib/settings';
import { createSttProvider } from '../lib/stt';
import type { SttProvider, SttStatus } from '../lib/stt/SttProvider';
import { createTranslator } from '@lst/core/translate';
import { TranslationQueue } from '@lst/core/translate/queue';
import type { CaptureStatus } from '@lst/core/types';

interface Pipeline {
  sessionId: string;
  stream: MediaStream;
  ctx: AudioContext;
  worklet: AudioWorkletNode;
  stt: SttProvider;
  queue: TranslationQueue | null;
  stopping: boolean;
}

let pipeline: Pipeline | null = null;

const STATUS_MAP: Record<SttStatus, CaptureStatus> = {
  connecting: 'connecting',
  listening: 'listening',
  reconnecting: 'reconnecting',
  error: 'error',
  closed: 'stopped',
};

async function start(streamId: string, sessionId: string, settings: Settings): Promise<void> {
  if (pipeline) await stop();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
    video: false,
  } as unknown as MediaStreamConstraints);

  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  // Capturing a tab mutes it for the user; route the audio back to the speakers.
  source.connect(ctx.destination);

  await ctx.audioWorklet.addModule(chrome.runtime.getURL('pcm-worklet.js'));
  const worklet = new AudioWorkletNode(ctx, 'pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2 });
  const silent = ctx.createGain();
  silent.gain.value = 0;
  source.connect(worklet);
  // Keep the worklet in the rendering graph without making it audible.
  worklet.connect(silent).connect(ctx.destination);

  const queue = settings.translateEnabled
    ? new TranslationQueue(createTranslator(settings), settings.targetLanguage)
    : null;
  const sourceHint = settings.sourceLanguage === 'multi' ? undefined : settings.sourceLanguage;

  let starting = true;
  const stt = createSttProvider(settings, {
    onInterim(segment) {
      broadcast({ type: 'SEGMENT_INTERIM', sessionId, segment });
    },
    onFinal(segments) {
      for (const segment of segments) {
        broadcast({ type: 'SEGMENT_FINAL', sessionId, segment });
        if (!queue) continue;
        queue
          .translate(segment.text, segment.language ?? sourceHint)
          .then((translation) => broadcast({ type: 'SEGMENT_TRANSLATED', sessionId, id: segment.id, translation }))
          .catch((e: unknown) =>
            broadcast({
              type: 'SEGMENT_TRANSLATED',
              sessionId,
              id: segment.id,
              error: e instanceof Error ? e.message : String(e),
            }),
          );
      }
    },
    onStatus(status, message) {
      // Startup failures are reported through the OFFSCREEN_START response instead.
      if (starting && status === 'error') return;
      if (pipeline?.stopping && status === 'closed') return;
      broadcast({ type: 'STATUS', status: STATUS_MAP[status], message, sessionId });
    },
  });

  const downsampler = new PcmDownsampler(ctx.sampleRate, stt.sampleRate);
  worklet.port.onmessage = (ev: MessageEvent<Float32Array>) => {
    const pcm = downsampler.process(ev.data);
    if (pcm.length) stt.sendAudio(pcm);
  };

  pipeline = { sessionId, stream, ctx, worklet, stt, queue, stopping: false };

  for (const track of stream.getAudioTracks()) {
    track.addEventListener('ended', () => {
      if (pipeline?.sessionId !== sessionId || pipeline.stopping) return;
      void stop().then(() =>
        broadcast({ type: 'STATUS', status: 'stopped', message: 'Luồng âm thanh của tab đã kết thúc.', sessionId }),
      );
    });
  }

  try {
    await stt.start();
  } catch (e) {
    await stop();
    throw e;
  } finally {
    starting = false;
  }
}

async function stop(): Promise<void> {
  const p = pipeline;
  if (!p || p.stopping) return;
  p.stopping = true;
  p.worklet.port.onmessage = null;
  try {
    await p.stt.stop();
  } catch {
    // ignore
  }
  p.queue?.dispose();
  p.stream.getTracks().forEach((t) => t.stop());
  await p.ctx.close().catch(() => undefined);
  if (pipeline === p) pipeline = null;
}

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if (!isOffscreenRequest(msg)) return;
  const req = msg as OffscreenRequest;
  if (req.type === 'OFFSCREEN_START') {
    start(req.streamId, req.sessionId, req.settings).then(
      () => sendResponse({ ok: true }),
      (e: unknown) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
    );
    return true;
  }
  if (req.type === 'OFFSCREEN_STOP') {
    stop().then(() => sendResponse({ ok: true }));
    return true;
  }
});
