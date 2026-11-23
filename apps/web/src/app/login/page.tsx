import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AudioLines, ArrowLeft, LockKeyhole } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/server';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập Live Subtitles bằng tài khoản Google.',
  robots: { index: false, follow: false },
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={styles.googleMark}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.93c-.58 2.96-2.26 5.48-4.74 7.18l7.73 6C44.43 37.99 46.98 31.84 46.98 24.55Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) redirect('/app');

  return (
    <main className={styles.page}>
      <h1 className="sr-only">Đăng nhập Live Subtitles</h1>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft aria-hidden="true" size={17} />
        Về trang chủ
      </Link>

      <section className={styles.shell} aria-label="Đăng nhập Live Subtitles">
        <aside className={styles.story} aria-label="Phụ đề song ngữ trực tiếp">
          <Link className={styles.brand} href="/" aria-label="Live Subtitles, về trang chủ">
            <span className={styles.brandIcon}>
              <AudioLines aria-hidden="true" size={21} />
            </span>
            <span>Live Subtitles</span>
          </Link>

          <div className={styles.storyContent}>
            <div className={styles.waveform} aria-hidden="true">
              {Array.from({ length: 31 }, (_, index) => (
                <span key={index} style={{ '--bar': `${18 + ((index * 19 + 13) % 58)}%` } as React.CSSProperties} />
              ))}
            </div>
            <p className={styles.storyEyebrow}>Nghe rõ hơn. Kết nối nhiều hơn.</p>
            <h2>Cuộc trò chuyện không còn rào cản ngôn ngữ.</h2>
            <div className={styles.caption}>
              <p lang="en">Let’s make sure everyone is on the same page.</p>
              <p lang="vi">Hãy cùng đảm bảo mọi người đều hiểu như nhau.</p>
            </div>
          </div>

          <p className={styles.storyFootnote}>Phụ đề trực tiếp · Dịch song ngữ · Biên bản cuộc họp</p>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.formContent}>
            <p className={styles.mobileBrand}>
              <AudioLines aria-hidden="true" size={20} /> Live Subtitles
            </p>
            <p className={styles.kicker}>Chào mừng bạn</p>
            <h2>Đăng nhập</h2>
            <p className={styles.intro}>Đăng nhập để tiếp tục đến không gian làm việc của bạn.</p>

            {params.google ? (
              <p className={styles.authMessage} role="status">
                {params.google === 'not_configured'
                  ? 'Đăng nhập Google chưa được cấu hình cho môi trường này.'
                  : 'Không thể đăng nhập bằng Google. Vui lòng thử lại.'}
              </p>
            ) : null}

            <Link className={styles.googleButton} href="/api/auth/google?returnTo=%2Fapp">
              <GoogleMark />
              <span>Tiếp tục với Google</span>
            </Link>

            <div className={styles.divider} aria-hidden="true">
              <span>hoặc</span>
            </div>

            <button type="button" className={styles.personalButton} disabled aria-describedby="personal-status">
              <LockKeyhole aria-hidden="true" size={17} />
              <span>Đăng nhập bằng tài khoản cá nhân</span>
              <span className={styles.comingSoon}>Sắp ra mắt</span>
            </button>
            <p id="personal-status" className={styles.accountNote}>
              Đăng nhập bằng email và mật khẩu sẽ sớm khả dụng.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
