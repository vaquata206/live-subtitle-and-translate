import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { TranscriptSegment } from './transcript-segment';
import { MeetingIllustration } from './meeting-illustration';

export function ProductPreview() {
  return (
    <Card
      role="group"
      data-slot="product-preview"
      aria-label="Bản xem trước cuộc họp, nội dung minh họa"
      className="product-preview mx-auto max-w-3xl gap-0 overflow-hidden p-0"
    >
      <CardHeader className="gap-3 border-b bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Minh họa</Badge>
            <span className="text-xs font-medium text-muted-foreground">EN → VI</span>
          </div>
          <CardTitle lang="en" className="text-base">
            Weekly product sync
          </CardTitle>
          <CardDescription>Phụ đề song ngữ · Tóm tắt cuộc họp</CardDescription>
        </div>
        <span className="w-fit rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          03 người tham gia
        </span>
      </CardHeader>

      <div className="product-preview-scene">
        <MeetingIllustration />
        <div className="product-preview-signal" aria-hidden="true">
          {[12, 24, 16, 32, 20, 36, 16, 28, 12, 24, 32, 16, 24, 12, 20, 32].map((height, index) => (
            <span key={index} style={{ height, animationDelay: `${index * 45}ms` }} />
          ))}
        </div>
      </div>

      <CardContent className="grid gap-0 p-0 md:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="preview-transcript-title" className="p-5 sm:p-6">
          <h3 id="preview-transcript-title" className="mb-4 text-xs font-semibold text-muted-foreground">
            Bản ghi cuộc họp
          </h3>
          <div lang="en">
            <TranscriptSegment
              speaker="Minh"
              time="09:12"
              text="The pilot can start with the support team next Monday."
              translation="Tuần tới, dự án thử nghiệm có thể bắt đầu với nhóm hỗ trợ."
              translationLang="vi"
            />
            <TranscriptSegment
              speaker="Linh"
              time="09:14"
              text="Agreed. I’ll share the short onboarding guide by Friday."
              translation="Đồng ý. Tôi sẽ chia sẻ hướng dẫn bắt đầu ngắn gọn trước thứ Sáu."
              translationLang="vi"
            />
          </div>
        </section>

        <aside
          aria-labelledby="preview-summary-title"
          className="border-t bg-accent/30 p-5 sm:p-6 md:border-t-0 md:border-l"
        >
          <h3 id="preview-summary-title" className="mb-4 text-sm font-semibold text-foreground">
            Tóm tắt nhanh
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-foreground">
            Nhóm thống nhất thử nghiệm quy trình mới với đội hỗ trợ trước khi mở rộng.
          </p>
          <p className="mb-2 text-xs font-semibold text-foreground">Quyết định</p>
          <ul className="grid gap-2 text-sm leading-relaxed text-foreground">
            <li className="rounded-lg border border-accent-foreground/10 bg-background/80 p-3">
              Bắt đầu thử nghiệm vào thứ Hai tuần tới.
            </li>
            <li className="rounded-lg border border-accent-foreground/10 bg-background/80 p-3">
              Chia sẻ hướng dẫn trước thứ Sáu.
            </li>
          </ul>
        </aside>
      </CardContent>
    </Card>
  );
}
