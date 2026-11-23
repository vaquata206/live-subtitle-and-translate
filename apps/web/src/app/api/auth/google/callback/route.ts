import { timingSafeEqual } from 'node:crypto';
import { GoogleOAuthCallbackSchema, GoogleTokenResponseSchema, GoogleUserInfoSchema } from '@lst/protocol/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { createWebSession, findOrCreateGoogleUser, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/server';

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth/google',
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

function clearOAuthCookies(response: NextResponse) {
  for (const name of ['google_oauth_state', 'google_oauth_verifier']) {
    response.cookies.set(name, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  }
  return response;
}

function redirectToLogin(request: NextRequest, status: 'failed' | 'not_configured') {
  const origin = appOrigin(request) ?? request.nextUrl.origin;
  return clearOAuthCookies(NextResponse.redirect(new URL(`/login?google=${status}`, origin)));
}

function stateMatches(received: string, stored: string) {
  const receivedBytes = Buffer.from(received);
  const storedBytes = Buffer.from(stored);
  return receivedBytes.length === storedBytes.length && timingSafeEqual(receivedBytes, storedBytes);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.getAll('state').length !== 1 || params.getAll('code').length > 1 || params.getAll('error').length > 1) {
    return redirectToLogin(request, 'failed');
  }

  const stateCookie = request.cookies.get('google_oauth_state')?.value;
  const verifier = request.cookies.get('google_oauth_verifier')?.value;
  const parsed = GoogleOAuthCallbackSchema.safeParse({
    code: params.get('code') ?? undefined,
    state: params.get('state'),
    error: params.get('error') ?? undefined,
  });
  if (!parsed.success || !stateCookie || !verifier || !stateMatches(parsed.data.state, stateCookie)) {
    return redirectToLogin(request, 'failed');
  }
  if (parsed.data.error) return redirectToLogin(request, 'failed');

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const origin = appOrigin(request);
  if (!clientId || !clientSecret || !process.env.DATABASE_URL || !origin || !parsed.data.code) {
    return redirectToLogin(request, 'not_configured');
  }

  try {
    const callbackUrl = new URL('/api/auth/google/callback', origin).toString();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: parsed.data.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) return redirectToLogin(request, 'failed');
    const tokenData = GoogleTokenResponseSchema.safeParse(await tokenResponse.json());
    if (!tokenData.success) return redirectToLogin(request, 'failed');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.data.access_token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!profileResponse.ok) return redirectToLogin(request, 'failed');
    const profile = GoogleUserInfoSchema.safeParse(await profileResponse.json());
    if (!profile.success || !profile.data.email_verified) return redirectToLogin(request, 'failed');

    const userId = await findOrCreateGoogleUser({
      sub: profile.data.sub,
      email: profile.data.email,
      name: profile.data.name ?? null,
      picture: profile.data.picture ?? null,
    });
    const session = await createWebSession(userId);
    const response = NextResponse.redirect(new URL('/app', origin));
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
      maxAge: SESSION_TTL_SECONDS,
      priority: 'high',
    });
    return clearOAuthCookies(response);
  } catch {
    return redirectToLogin(request, 'failed');
  }
}
