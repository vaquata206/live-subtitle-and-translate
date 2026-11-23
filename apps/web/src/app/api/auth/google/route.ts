import { createHash, randomBytes } from 'node:crypto';
import { GoogleLoginQuerySchema } from '@lst/protocol/auth';
import { NextResponse, type NextRequest } from 'next/server';

const OAUTH_PATH = '/api/auth/google';
const CALLBACK_PATH = `${OAUTH_PATH}/callback`;
const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: OAUTH_PATH,
  maxAge: 600,
  priority: 'high' as const,
};

function appOrigin(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === 'production' && !configuredUrl) return null;

  try {
    const origin = new URL(configuredUrl ?? request.nextUrl.origin);
    if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') return null;
    return origin.origin;
  } catch {
    return null;
  }
}

function loginRedirect(request: NextRequest, status: 'not_configured' | 'failed') {
  const origin = appOrigin(request) ?? request.nextUrl.origin;
  const response = NextResponse.redirect(new URL(`/login?google=${status}`, origin));
  for (const name of ['google_oauth_state', 'google_oauth_verifier']) {
    response.cookies.set(name, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  }
  return response;
}

function createPkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export async function GET(request: NextRequest) {
  const queryParams = request.nextUrl.searchParams;
  if (queryParams.getAll('returnTo').length > 1) return loginRedirect(request, 'failed');
  const parsedQuery = GoogleLoginQuerySchema.safeParse({ returnTo: queryParams.get('returnTo') ?? undefined });
  if (!parsedQuery.success || (parsedQuery.data.returnTo && parsedQuery.data.returnTo !== '/app')) {
    return loginRedirect(request, 'failed');
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const origin = appOrigin(request);
  if (!clientId || !process.env.AUTH_GOOGLE_SECRET || !process.env.DATABASE_URL || !origin) {
    return loginRedirect(request, 'not_configured');
  }

  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const callbackUrl = new URL(CALLBACK_PATH, origin).toString();
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: createPkceChallenge(verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set('google_oauth_state', state, OAUTH_COOKIE_OPTIONS);
  response.cookies.set('google_oauth_verifier', verifier, OAUTH_COOKIE_OPTIONS);
  return response;
}
