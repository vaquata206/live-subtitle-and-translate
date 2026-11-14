import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';
import { marketing } from '@/lib/marketing';
import './globals.css';

const display = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Live Subtitles – Phụ đề, dịch song ngữ và biên bản',
    template: '%s · Live Subtitles',
  },
  description:
    'Tiện ích Chrome: phụ đề, dịch song ngữ, tóm tắt theo yêu cầu và biên bản DOCX. Dùng khóa API riêng cần mạng; AI tích hợp và chia sẻ web sắp có.',
  applicationName: marketing.brand,
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: marketing.brand,
    title: `${marketing.brand} – ${marketing.headline}`,
    description: marketing.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${marketing.brand} – Phụ đề và biên bản trong Chrome`,
    description: marketing.description,
  },
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
