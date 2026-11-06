import { Button, LiveBadge, TranscriptSegment } from '@lst/ui';

// Phase 1 placeholder: proves the design system, fonts and workspace packages work end to end.
// The real landing page is built in phase 2 with the frontend-design skill.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-10 px-6 py-16">
      <div className="flex flex-col gap-5">
        <LiveBadge label="Đang phát triển" className="self-start" />
        <h1 className="text-4xl font-extrabold text-balance sm:text-6xl">
          Phụ đề & dịch cuộc họp <span className="text-primary">trực tiếp</span>, chia sẻ cho mọi người.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
          Google Meet, Microsoft Teams, Zoom hay bất kỳ tab nào có âm thanh. Người xem chọn ngôn ngữ của riêng mình,
          biên bản được tạo tự động sau buổi họp.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg">Thêm vào Chrome</Button>
          <Button size="lg" variant="outline">
            Đăng nhập
          </Button>
        </div>
      </div>
      <section aria-label="Ví dụ phụ đề" className="rounded-xl border bg-card p-6 shadow-sm">
        <TranscriptSegment
          speaker="Lan"
          speakerIndex={0}
          time="00:05"
          text="Good morning everyone. Today we need to decide the launch date."
          translation="Chào buổi sáng mọi người. Hôm nay chúng ta cần chốt ngày ra mắt."
          translationLang="vi"
        />
        <TranscriptSegment
          speaker="Minh"
          speakerIndex={1}
          time="00:15"
          text="QA found two critical bugs, so I suggest moving the launch to the 20th."
          translation="QA phát hiện hai lỗi nghiêm trọng, nên tôi đề xuất lùi sang ngày 20."
          translationLang="vi"
        />
      </section>
    </main>
  );
}
