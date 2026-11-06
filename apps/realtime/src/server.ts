import websocket from '@fastify/websocket';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  isProtocolSupported,
  parsePublisherMessage,
  PROTOCOL_VERSION,
  type HelloMessage,
  type PublisherEvent,
  type ServerToPublisher,
} from '@lst/protocol';

export interface Principal {
  userId: string;
}

export interface PublishSession {
  meetingId: string;
  /** Highest sequence number already durably stored. */
  ackedSeq: number;
}

export interface RealtimeDeps {
  /** Verifies the access token from `hello`; returns null when invalid/expired. */
  authenticate(token: string): Promise<Principal | null>;
  /** Creates or resumes a meeting for the principal; throws EntitlementError when not allowed. */
  openSession(principal: Principal, hello: HelloMessage): Promise<PublishSession>;
  /** Persists sequenced events (idempotent by meeting + seq/segment id) and fans them out. */
  handleEvents(session: PublishSession, events: PublisherEvent[]): Promise<void>;
}

export interface ServerOptions {
  deps: RealtimeDeps;
  logger?: FastifyServerOptions['logger'];
  /** Close connections that send no `hello` within this time. */
  helloTimeoutMs?: number;
  maxMessageBytes?: number;
}

/** Phase 1 default: nobody can publish until auth is implemented (phase 2). */
export const denyAllDeps: RealtimeDeps = {
  authenticate: async () => null,
  openSession: async () => {
    throw new Error('not implemented');
  },
  handleEvents: async () => undefined,
};

export async function buildServer({
  deps,
  logger = true,
  helloTimeoutMs = 10_000,
  maxMessageBytes = 64 * 1024,
}: ServerOptions) {
  const app = Fastify({ logger, trustProxy: true });
  await app.register(websocket, { options: { maxPayload: maxMessageBytes } });

  app.get('/health', async () => ({ status: 'ok', service: 'realtime', protocol: PROTOCOL_VERSION }));

  app.get('/v1/publish', { websocket: true }, (socket, req) => {
    const send = (msg: ServerToPublisher) => socket.send(JSON.stringify(msg));
    const fail = (code: Extract<ServerToPublisher, { type: 'error' }>['code'], message: string, fatal = true) => {
      send({ type: 'error', code, message, fatal });
      if (fatal) socket.close(code === 'unauthorized' ? 4401 : code === 'upgrade_required' ? 4426 : 4400, code);
    };

    let session: PublishSession | null = null;
    let handshaking = false;
    // Serialises event handling so acks stay in order.
    let queue: Promise<void> = Promise.resolve();
    const helloTimer = setTimeout(() => fail('unauthorized', 'hello timeout'), helloTimeoutMs);

    socket.on('close', () => clearTimeout(helloTimer));

    socket.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) return fail('invalid_message', 'binary frames are not supported');
      const parsed = parsePublisherMessage(data.toString('utf8'));
      if (!parsed.ok) return fail('invalid_message', parsed.error, false);
      const msg = parsed.message;

      if (msg.type === 'ping') return send({ type: 'pong', at: msg.at });

      if (msg.type === 'hello') {
        if (session || handshaking) return fail('invalid_message', 'duplicate hello', false);
        handshaking = true;
        clearTimeout(helloTimer);
        if (!isProtocolSupported(msg.protocol)) {
          return fail('upgrade_required', `Protocol ${msg.protocol} is not supported; please update the extension.`);
        }
        void (async () => {
          try {
            const principal = await deps.authenticate(msg.token);
            if (!principal) return fail('unauthorized', 'invalid or expired token');
            session = await deps.openSession(principal, msg);
            send({
              type: 'welcome',
              meetingId: session.meetingId,
              ackedSeq: session.ackedSeq,
              serverProtocol: PROTOCOL_VERSION,
            });
          } catch (e) {
            const err = e as Error & { reason?: string };
            if (err.name === 'EntitlementError') return fail('forbidden', err.message);
            req.log.error({ err }, 'openSession failed');
            fail('internal', 'could not open session');
          } finally {
            handshaking = false;
          }
        })();
        return;
      }

      if (!session) return fail('unauthorized', 'send hello first');
      const current = session;
      if (msg.type === 'segment.interim') {
        // Not persisted, not acknowledged.
        queue = queue.then(() => deps.handleEvents(current, [msg])).catch(() => undefined);
        return;
      }
      if (msg.seq <= current.ackedSeq) return send({ type: 'ack', seq: current.ackedSeq });
      queue = queue
        .then(async () => {
          if (msg.seq <= current.ackedSeq) return;
          await deps.handleEvents(current, [msg]);
          current.ackedSeq = msg.seq;
          send({ type: 'ack', seq: msg.seq });
        })
        .catch((err: unknown) => {
          req.log.error({ err }, 'handleEvents failed');
          fail('internal', 'could not store event', false);
        });
    });
  });

  return app;
}
