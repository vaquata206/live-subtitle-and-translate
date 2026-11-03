import type { Session, SessionMeta } from '../core/types';
import { toMeta } from '../core/transcript/session';

const INDEX_KEY = 'sessions:index';
const MAX_SESSIONS = 100;
const sessionKey = (id: string) => `session:${id}`;

let chain: Promise<unknown> = Promise.resolve();
let cache: Session | null = null;

/** Serialises storage mutations so concurrent messages don't clobber each other. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

async function readIndex(): Promise<SessionMeta[]> {
  const data = await chrome.storage.local.get(INDEX_KEY);
  return (data[INDEX_KEY] as SessionMeta[] | undefined) ?? [];
}

async function readSession(id: string): Promise<Session | null> {
  if (cache?.id === id) return cache;
  const data = await chrome.storage.local.get(sessionKey(id));
  return (data[sessionKey(id)] as Session | undefined) ?? null;
}

async function writeSession(session: Session): Promise<void> {
  cache = session;
  const index = (await readIndex()).filter((m) => m.id !== session.id);
  index.unshift(toMeta(session));
  index.sort((a, b) => b.startedAt - a.startedAt);
  const removed = index.splice(MAX_SESSIONS);
  await chrome.storage.local.set({ [sessionKey(session.id)]: session, [INDEX_KEY]: index });
  if (removed.length) await chrome.storage.local.remove(removed.map((m) => sessionKey(m.id)));
}

export const sessionStore = {
  create(session: Session): Promise<Session> {
    return serial(async () => {
      await writeSession(session);
      return session;
    });
  },

  get(id: string): Promise<Session | null> {
    return serial(() => readSession(id));
  },

  update(id: string, fn: (s: Session) => Session): Promise<Session | null> {
    return serial(async () => {
      const current = await readSession(id);
      if (!current) return null;
      const next = fn(current);
      if (next !== current) await writeSession(next);
      return next;
    });
  },

  list(): Promise<SessionMeta[]> {
    return serial(readIndex);
  },

  delete(id: string): Promise<void> {
    return serial(async () => {
      if (cache?.id === id) cache = null;
      const index = (await readIndex()).filter((m) => m.id !== id);
      await chrome.storage.local.set({ [INDEX_KEY]: index });
      await chrome.storage.local.remove(sessionKey(id));
    });
  },
};
