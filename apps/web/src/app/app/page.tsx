import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AudioLines, LogOut } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/server';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Không gian làm việc',
  robots: { index: false, follow: false },
};

export default async function AppDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Fapp');

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Live Subtitles, về trang chủ">
          <span>
            <AudioLines aria-hidden="true" size={20} />
          </span>
          Live Subtitles
        </Link>
        <form action="/api/auth/signout" method="post">
          <button className={styles.signOut} type="submit">
            <LogOut aria-hidden="true" size={17} />
            Đăng xuất
          </button>
        </form>
      </header>
      <section className={styles.welcome} aria-labelledby="welcome-title">
        <p className={styles.eyebrow}>Không gian làm việc</p>
        <h1 id="welcome-title">Xin chào{user.name ? `, ${user.name}` : ''}.</h1>
        <p className={styles.description}>Bạn đã đăng nhập thành công bằng Google.</p>
        <div className={styles.account}>
          <span className={styles.accountMark} aria-hidden="true">
            {user.name?.slice(0, 1).toLocaleUpperCase() ?? user.email.slice(0, 1).toLocaleUpperCase()}
          </span>
          <div>
            <p>{user.name ?? 'Tài khoản Google'}</p>
            <p>{user.email}</p>
          </div>
        </div>
        <p className={styles.comingSoon}>Các công cụ quản lý cuộc họp sẽ sớm có mặt tại đây.</p>
      </section>
    </main>
  );
}
