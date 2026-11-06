import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';
import './globals.css';

const display = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Live Subtitles – Phụ đề & dịch cuộc họp trực tiếp', template: '%s · Live Subtitles' },
  description:
    'Phụ đề, dịch song ngữ và biên bản tự động cho Google Meet, Microsoft Teams, Zoom và mọi tab có âm thanh. Chia sẻ trực tiếp cho người khác bằng link và mã PIN.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfcfe' },
    { media: '(prefers-color-scheme: dark)', color: '#151821' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
