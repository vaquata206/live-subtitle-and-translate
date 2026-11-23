import { NextResponse, type NextRequest } from 'next/server';
import { revokeWebSession, SESSION_COOKIE } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  let origin: string;
  try {
    origin = new URL(configuredUrl ?? request.nextUrl.origin).origin;
  } catch {
    origin = request.nextUrl.origin;
  }

  const requestOrigin = request.headers.get('origin');
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).origin !== origin) return new Response(null, { status: 403 });
    } catch {
      return new Response(null, { status: 403 });
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && token.length <= 128) {
    try {
      await revokeWebSession(token);
    } catch {
      // Clearing the browser cookie still signs the user out on this device.
    }
  }

  const response = NextResponse.redirect(new URL('/login?signedOut=1', origin), 303);
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    priority: 'high',
  });
  return response;
}
