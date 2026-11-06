import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { PROTOCOL_VERSION, type PublisherEvent } from '@lst/protocol';
import { buildServer, denyAllDeps, type RealtimeDeps } from '../src/server';

const MEETING = '3f1c2b7e-8a4d-4c1e-9f2a-6b5d4e3c2a10';
let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  await close?.();
  close = undefined;
});

async function start(deps: RealtimeDeps) {
  const app = await buildServer({ deps, logger: false, helloTimeoutMs: 300 });
  await app.listen({ port: 0, host: '127.0.0.1' });
  close = () => app.close();
  const { port } = app.server.address() as AddressInfo;
  return `ws://127.0.0.1:${port}/v1/publish`;
}

function connect(url: string) {
  const ws = new WebSocket(url);
  const inbox: Array<Record<string, unknown>> = [];
  const waiters: Array<() => void> = [];
  ws.on('message', (d) => {
    inbox.push(JSON.parse(d.toString()));
    waiters.splice(0).forEach((w) => w());
  });
  const next = async (pred: (m: Record<string, unknown>) => boolean = () => true) => {
    for (;;) {
      const i = inbox.findIndex(pred);
      if (i >= 0) return inbox.splice(i, 1)[0];
      await new Promise<void>((r) => waiters.push(r));
    }
  };
  const closed = new Promise<number>((r) => ws.on('close', (code) => r(code)));
  const open = new Promise<void>((r) => ws.on('open', () => r()));
  return { ws, next, closed, open, send: (m: unknown) => ws.send(JSON.stringify(m)) };
}

const hello = (extra: Record<string, unknown> = {}) => ({
  type: 'hello',
  protocol: PROTOCOL_VERSION,
  clientVersion: '0.2.0',
  token: 'good',
  ...extra,
});

function fakeDeps() {
  const stored: PublisherEvent[] = [];
  const deps: RealtimeDeps = {
    authenticate: async (t) => (t === 'good' ? { userId: 'u1' } : null),
    openSession: async () => ({ meetingId: MEETING, ackedSeq: 2 }),
    handleEvents: async (_s, events) => {
      stored.push(...events);
    },
  };
  return { deps, stored };
}

const final = (seq: number) => ({
  type: 'segment.final',
  seq,
  segment: { id: `s${seq}`, speaker: 0, text: `line ${seq}`, start: seq, end: seq + 1 },
});

describe('realtime publish endpoint', () => {
  it('answers health checks', async () => {
    const app = await buildServer({ deps: denyAllDeps, logger: false });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.json()).toMatchObject({ status: 'ok', protocol: PROTOCOL_VERSION });
    await app.close();
  });

  it('handshakes, acks in order and skips already-acked events', async () => {
    const { deps, stored } = fakeDeps();
    const c = connect(await start(deps));
    await c.open;
    c.send(hello());
    expect(await c.next()).toMatchObject({ type: 'welcome', meetingId: MEETING, ackedSeq: 2 });
    c.send(final(2)); // duplicate of already stored data
    c.send(final(3));
    c.send(final(4));
    expect(await c.next()).toEqual({ type: 'ack', seq: 2 });
    expect(await c.next()).toEqual({ type: 'ack', seq: 3 });
    expect(await c.next()).toEqual({ type: 'ack', seq: 4 });
    expect(stored.map((e) => ('seq' in e ? e.seq : -1))).toEqual([3, 4]);
    c.send({ type: 'ping', at: 5 });
    expect(await c.next()).toEqual({ type: 'pong', at: 5 });
    c.ws.close();
  });

  it('rejects bad tokens, old protocols and events before hello', async () => {
    const { deps } = fakeDeps();
    const url = await start(deps);

    const a = connect(url);
    await a.open;
    a.send(hello({ token: 'bad' }));
    expect(await a.next()).toMatchObject({ type: 'error', code: 'unauthorized', fatal: true });
    expect(await a.closed).toBe(4401);

    const b = connect(url);
    await b.open;
    b.send(hello({ protocol: PROTOCOL_VERSION + 1 }));
    expect(await b.next()).toMatchObject({ type: 'error', code: 'upgrade_required' });
    expect(await b.closed).toBe(4426);

    const c = connect(url);
    await c.open;
    c.send(final(1));
    expect(await c.next()).toMatchObject({ type: 'error', code: 'unauthorized' });
  });

  it('reports invalid messages without closing, and times out silent clients', async () => {
    const { deps } = fakeDeps();
    const url = await start(deps);
    const a = connect(url);
    await a.open;
    a.send(hello());
    await a.next((m) => m.type === 'welcome');
    a.send({ type: 'segment.final', seq: 9, segment: { id: 'x' } });
    expect(await a.next()).toMatchObject({ type: 'error', code: 'invalid_message', fatal: false });
    a.ws.close();

    const b = connect(url);
    await b.open;
    expect(await b.closed).toBe(4401);
  });

  it('maps entitlement errors to forbidden', async () => {
    const { deps } = fakeDeps();
    deps.openSession = async () => {
      const e = new Error('Gói hiện tại chưa có tính năng publish.live');
      e.name = 'EntitlementError';
      throw e;
    };
    const c = connect(await start(deps));
    await c.open;
    c.send(hello());
    expect(await c.next()).toMatchObject({ type: 'error', code: 'forbidden' });
  });
});
