import { ImageResponse } from 'next/og';
import { marketing } from '@/lib/marketing';

export const alt = 'Live Subtitles – Phụ đề, dịch song ngữ và biên bản DOCX trong Chrome';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 72,
        background: '#fbfcfe',
        color: '#151821',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', color: '#315be8', fontSize: 36, fontWeight: 700 }}>{marketing.brand}</div>
      <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}>{marketing.headline}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 30 }}>Phụ đề · Dịch song ngữ · Biên bản DOCX</div>
        <div style={{ display: 'flex', color: '#8d5b00', fontSize: 25 }}>Tiện ích Chrome · Dùng khóa API của bạn</div>
      </div>
    </div>,
    size,
  );
}
