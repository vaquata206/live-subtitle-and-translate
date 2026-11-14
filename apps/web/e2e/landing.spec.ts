import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Landing', () => {
  const runtimeErrors = new WeakMap<object, string[]>();

  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    runtimeErrors.set(page, errors);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    expect(runtimeErrors.get(page), 'No page or console errors').toEqual([]);
  });

  test('Landing - required sections and internal anchor destinations exist', async ({ page }) => {
    await expect(page).toHaveTitle(/Live Subtitles/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    for (const id of ['trai-nghiem', 'tinh-nang', 'cach-dung', 'goi-cuoc', 'cau-hoi', 'cai-dat']) {
      await test.step(`Section #${id} is named and linked`, async () => {
        const section = page.locator(`section[id="${id}"]`);
        await expect(section).toHaveCount(1);
        await expect(section).toHaveAccessibleName(/\S/);
        await expect(section.getByRole('heading', { level: 2 })).toHaveCount(1);
        expect(await page.locator(`a[href="#${id}"]`).count()).toBeGreaterThan(0);
      });
    }

    const destinations = await page
      .locator('a[href^="#"]')
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')?.slice(1) ?? ''));
    expect(destinations.length).toBeGreaterThan(0);
    for (const id of new Set(destinations)) {
      expect(id, 'No placeholder anchors').not.toBe('');
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
  });

  test('Landing - install CTAs use real instructions, not fake auth or checkout', async ({ page }) => {
    const installLinks = page.getByRole('link', { name: /cài tiện ích/i });
    expect(await installLinks.count()).toBeGreaterThan(1);
    for (const link of await installLinks.all()) {
      await expect(link).toHaveAttribute('href', '#cai-dat');
    }
    await page.getByRole('navigation').getByRole('link', { name: 'Cài tiện ích', exact: true }).click();
    await expect(page).toHaveURL(/#cai-dat$/);
    const installation = page.locator('#cai-dat');
    await expect(installation.getByRole('heading', { level: 3 })).toHaveCount(4);
    await expect(installation.getByRole('link', { name: /kho mã nguồn trên GitHub/i })).toHaveAttribute(
      'href',
      /^https:\/\/github\.com\/vaquata206\/live-subtitle-and-translate$/,
    );

    await expect(page.getByRole('link', { name: /đăng nhập|đăng ký|mua ngay|thanh toán/i })).toHaveCount(0);
    const hrefs = await page
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    expect(hrefs.filter((href) => /(?:login|signin|signup|checkout|pricing\/buy)/i.test(href))).toEqual([]);
    await expect(page.getByRole('form')).toHaveCount(0);
  });

  test('Landing - three demo plans clearly disclose unavailable server features', async ({ page }) => {
    const pricing = page.locator('#goi-cuoc');
    await expect(pricing.getByRole('article')).toHaveCount(3);
    await expect(pricing.getByText(/minh họa, chưa áp dụng thanh toán/i)).toHaveCount(1);
    for (const name of ['Cá nhân', 'Chuyên nghiệp', 'Nhóm']) {
      const plan = pricing.getByRole('article', { name, exact: true });
      await expect(plan.getByRole('heading', { name, exact: true })).toHaveCount(1);
      expect(
        await plan
          .getByRole('listitem')
          .filter({ hasText: /quyền lợi máy chủ.*sắp có/i })
          .count(),
      ).toBeGreaterThan(0);
      await expect(plan.getByRole('link')).toHaveAttribute('href', /^#(?:cai-dat|cau-hoi)$/);
    }
    const upcoming = page.getByRole('complementary', { name: /Chia sẻ lên web/ });
    await expect(upcoming.getByText('Sắp ra mắt', { exact: true })).toHaveCount(1);
    await expect(upcoming).toContainText(/chưa khả dụng/i);
  });

  test('Landing - mobile menu supports keyboard Escape and restores trigger focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const navigation = page.getByRole('navigation', { name: 'Điều hướng chính' });
    const menu = navigation.getByText('Mục lục', { exact: true });
    const disclosure = navigation.getByRole('group');
    const featureLink = navigation.getByRole('link', { name: 'Tính năng', exact: true }).last();
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    await expect(featureLink).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(disclosure).not.toHaveAttribute('open');
    await expect(menu).toBeFocused();

    await menu.press('Space');
    await expect(disclosure).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#tinh-nang$/);
    await expect(disclosure).not.toHaveAttribute('open');
    await expect(featureLink).toBeHidden();
  });

  test('Landing - each FAQ opens and closes using Enter and Space', async ({ page }) => {
    const questions = page.locator('#cau-hoi').getByRole('group');
    await expect(questions).toHaveCount(6);
    for (const question of await questions.all()) {
      const summary = question.locator('summary');
      const answer = question.getByRole('paragraph');
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(question).toHaveAttribute('open', '');
      await expect(answer).toBeVisible();
      await page.keyboard.press('Space');
      await expect(question).not.toHaveAttribute('open');
      await expect(answer).toBeHidden();
      await expect(summary).toBeFocused();
    }
  });

  test('Landing - first Tab reveals skip link and activation focuses main', async ({ page }) => {
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Chuyển đến nội dung chính' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('Landing - English source captions have English language semantics', async ({ page }) => {
    const preview = page.locator('#trai-nghiem');
    await expect(preview.getByRole('heading', { level: 3, name: /Weekly product sync/i })).toHaveAttribute(
      'lang',
      'en',
    );
    const captions = preview.getByRole('article');
    await expect(captions).toHaveCount(2);
    for (const caption of await captions.all()) {
      const paragraphs = caption.getByRole('paragraph');
      await expect(paragraphs).toHaveCount(2);
      await expect(paragraphs.first()).not.toBeEmpty();
      expect(await paragraphs.first().evaluate((element) => element.closest('[lang]')?.getAttribute('lang'))).toBe(
        'en',
      );
      await expect(paragraphs.last()).toHaveAttribute('lang', 'vi');
    }
  });

  test('Landing - meeting artwork and finite animation respect reduced motion', async ({ page }) => {
    const artwork = page.locator('#trai-nghiem .meeting-illustration');
    await expect(artwork).toHaveCount(1);
    await expect(artwork).toHaveAttribute('aria-hidden', 'true');
    const signal = page.locator('.product-preview-signal span');
    await expect(signal).toHaveCount(16);
    for (const element of await signal.all()) {
      expect(await element.evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
    }

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const animation = await signal.first().evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        name: style.animationName,
        iterations: Number(style.animationIterationCount),
        duration: style.animationDuration,
      };
    });
    expect(animation.name).toBe('preview-signal');
    expect(animation.iterations).toBe(4);
    expect(parseFloat(animation.duration) * animation.iterations).toBeLessThan(5);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await signal.first().evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [320, 390, 768, 1440]) {
      test(`Landing - no overflow at ${width}px in ${theme} with reduced motion`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page
          .locator('html')
          .evaluate((element, dark) => element.classList.toggle('dark', dark), theme === 'dark');
        expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
        expect(await page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(
          theme === 'dark',
        );
        await expect
          .poll(() =>
            page.evaluate(() => {
              const root = document.documentElement;
              return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
            }),
          )
          .toBeLessThanOrEqual(0);
        expect(await page.locator('html').evaluate((element) => getComputedStyle(element).scrollBehavior)).toBe('auto');
        await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
      });
    }

    for (const width of [390, 1440]) {
      test(`Landing - WCAG 2.2 AA at ${width}px in ${theme}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page
          .locator('html')
          .evaluate((element, dark) => element.classList.toggle('dark', dark), theme === 'dark');
        const audit = async (state: string) => {
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();
          await testInfo.attach(`axe-${state}`, {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
          });
          expect(results.violations, `WCAG violations with ${state}`).toEqual([]);
        };
        await audit('closed-disclosures');
        if (width < 768) {
          await page.getByRole('navigation').getByText('Mục lục', { exact: true }).click();
        }
        for (const summary of await page.locator('#cau-hoi summary').all()) {
          await summary.click();
        }
        await audit('open-disclosures');
      });
    }
  }
});
