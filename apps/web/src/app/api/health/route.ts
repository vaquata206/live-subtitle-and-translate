import { PROTOCOL_VERSION } from '@lst/protocol';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok', service: 'web', protocol: PROTOCOL_VERSION, time: new Date().toISOString() });
}
