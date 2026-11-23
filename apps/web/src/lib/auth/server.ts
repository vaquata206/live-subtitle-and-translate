import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, createDb, eq, gt, isNull, schema, type Database } from '@lst/db';

const { accounts, users, webSessions } = schema;
export const SESSION_COOKIE = 'lst_web_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const dbGlobal = globalThis as typeof globalThis & { lstWebAuthDb?: Database };

function getDb() {
  dbGlobal.lstWebAuthDb ??= createDb(undefined, { max: 5 });
  return dbGlobal.lstWebAuthDb;
}

function hashSession(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export type CurrentUser = Pick<typeof users.$inferSelect, 'id' | 'email' | 'name' | 'image' | 'role'>;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const [session] = await getDb()
    .select({ id: users.id, email: users.email, name: users.name, image: users.image, role: users.role })
    .from(webSessions)
    .innerJoin(users, eq(webSessions.userId, users.id))
    .where(
      and(
        eq(webSessions.tokenHash, hashSession(token)),
        gt(webSessions.expiresAt, new Date()),
        isNull(webSessions.revokedAt),
      ),
    )
    .limit(1);

  return session ?? null;
}

export async function createWebSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await getDb()
    .insert(webSessions)
    .values({
      userId,
      tokenHash: hashSession(token),
      expiresAt,
      lastUsedAt: new Date(),
    });
  return { token, expiresAt };
}

export async function revokeWebSession(token: string) {
  await getDb()
    .update(webSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(webSessions.tokenHash, hashSession(token)), isNull(webSessions.revokedAt)));
}

export class AccountLinkRequiredError extends Error {
  constructor() {
    super('Account needs an explicit sign-in link.');
    this.name = 'AccountLinkRequiredError';
  }
}

export async function findOrCreateGoogleUser(profile: {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}) {
  return getDb().transaction(async (tx) => {
    const [linkedAccount] = await tx
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, profile.sub)))
      .limit(1);
    if (linkedAccount) return linkedAccount.userId;

    const [matchingUser] = await tx
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);

    if (matchingUser?.passwordHash) throw new AccountLinkRequiredError();

    let userId = matchingUser?.id;
    if (!userId) {
      const [inserted] = await tx
        .insert(users)
        .values({
          email: profile.email,
          emailVerified: new Date(),
          name: profile.name,
          image: profile.picture,
        })
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id });

      if (inserted) userId = inserted.id;
      else {
        const [concurrentUser] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1);
        userId = concurrentUser?.id;
      }
    }

    if (!userId) throw new Error('Could not resolve Google user.');

    const [insertedAccount] = await tx
      .insert(accounts)
      .values({ userId, type: 'oauth', provider: 'google', providerAccountId: profile.sub })
      .onConflictDoNothing()
      .returning({ userId: accounts.userId });

    if (insertedAccount) return insertedAccount.userId;

    const [concurrentAccount] = await tx
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, profile.sub)))
      .limit(1);

    if (!concurrentAccount) throw new Error('Could not resolve Google account.');
    return concurrentAccount.userId;
  });
}
