import { newId } from '@lst/core/id';
import type { SttCallbacks, SttProvider } from './SttProvider';
import { buildDeepgramUrl, parseDeepgramResults, type DeepgramOptions, type DeepgramResults } from './deepgram-parse';

const KEEPALIVE_MS = 8000;
const MAX_RECONNECTS = 6;

/** Deepgram live streaming over WebSocket (auth via the `token` subprotocol). */
export class DeepgramStt implements SttProvider {
  readonly id = 'deepgram';
  readonly sampleRate: number;
  private ws: WebSocket | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private reconnects = 0;
  private samplesSent = 0;
  /** Seconds of audio sent before the current connection opened; Deepgram timestamps restart per connection. */
  private connectionOffset = 0;

  constructor(
    private readonly apiKey: string,
    private readonly opts: Omit<DeepgramOptions, 'sampleRate'> & { sampleRate?: number },
    private readonly cb: SttCallbacks,
  ) {
    this.sampleRate = opts.sampleRate ?? 16000;
  }

  async start(): Promise<void> {
    if (!this.apiKey) throw new Error('Chưa cấu hình Deepgram API key (mở trang Cài đặt).');
    this.stopped = false;
    await this.connect();
  }

  private connect(): Promise<void> {
    this.cb.onStatus(this.reconnects ? 'reconnecting' : 'connecting');
    const url = buildDeepgramUrl({ ...this.opts, sampleRate: this.sampleRate });
    return new Promise((resolve, reject) => {
      let opened = false;
      const ws = new WebSocket(url, ['token', this.apiKey]);
      ws.binaryType = 'arraybuffer';
      this.ws = ws;

      ws.onopen = () => {
        opened = true;
        this.reconnects = 0;
        this.connectionOffset = this.samplesSent / this.sampleRate;
        this.startKeepAlive();
        this.cb.onStatus('listening');
        resolve();
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') return;
        let msg: { type?: string };
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type !== 'Results') return;
        const parsed = parseDeepgramResults(msg as DeepgramResults, this.connectionOffset, () => newId('s'));
        if (!parsed.segments.length) return;
        if (parsed.isFinal) this.cb.onFinal(parsed.segments);
        else this.cb.onInterim(parsed.segments[0]);
      };

      ws.onerror = () => {
        // Details arrive in onclose.
      };

      ws.onclose = (ev) => {
        this.stopKeepAlive();
        if (this.ws === ws) this.ws = null;
        if (this.stopped) {
          this.cb.onStatus('closed');
          return;
        }
        if (!opened && this.reconnects === 0) {
          const reason = `Không kết nối được Deepgram (code ${ev.code}${ev.reason ? `: ${ev.reason}` : ''}). Kiểm tra API key, model và kết nối mạng.`;
          this.cb.onStatus('error', reason);
          reject(new Error(reason));
          return;
        }
        this.scheduleReconnect();
      };
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnects >= MAX_RECONNECTS) {
      this.cb.onStatus('error', 'Mất kết nối Deepgram và không thể kết nối lại.');
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnects, 15000);
    this.reconnects++;
    this.cb.onStatus('reconnecting', `Đang kết nối lại (lần ${this.reconnects})…`);
    setTimeout(() => {
      if (this.stopped) return;
      // Failures of a reconnect attempt are handled by onclose → scheduleReconnect.
      this.connect().catch(() => undefined);
    }, delay);
  }

  sendAudio(pcm: Int16Array): void {
    // Count all audio, including what's dropped while reconnecting, so timestamps stay aligned with wall-clock.
    this.samplesSent += pcm.length;
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(pcm.buffer as ArrayBuffer);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.stopKeepAlive();
    const ws = this.ws;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'CloseStream' }));
      } catch {
        // ignore
      }
      // Give Deepgram a moment to flush the last final results.
      await new Promise((r) => setTimeout(r, 800));
    }
    ws.close();
    this.ws = null;
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAlive = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
    }, KEEPALIVE_MS);
  }

  private stopKeepAlive(): void {
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = null;
  }
}

/** Opens a short-lived connection to verify the API key. */
export function testDeepgramKey(apiKey: string, model: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = buildDeepgramUrl({ model, language: 'en', diarize: false, sampleRate: 16000 });
    const ws = new WebSocket(url, ['token', apiKey]);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Hết thời gian chờ kết nối Deepgram.'));
    }, 8000);
    ws.onopen = () => {
      clearTimeout(timer);
      ws.send(JSON.stringify({ type: 'CloseStream' }));
      ws.close();
      resolve();
    };
    ws.onclose = (ev) => {
      clearTimeout(timer);
      reject(new Error(`Deepgram từ chối kết nối (code ${ev.code}). Kiểm tra API key / model.`));
    };
  });
}
