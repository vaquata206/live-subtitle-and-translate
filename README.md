# Live Subtitles & Translate

Phụ đề trực tiếp, dịch song ngữ và biên bản cuộc họp cho Google Meet, Microsoft Teams, Zoom web và mọi tab có âm thanh. Gồm:

- **Chrome extension** ([apps/extension](apps/extension/README.md)): bắt âm thanh tab, phụ đề, dịch, tóm tắt, xuất biên bản DOCX. Chạy độc lập trên máy, không cần tài khoản.
- **Phân hệ web** (đang phát triển): phát cuộc họp lên web theo thời gian thực, chia sẻ bằng link + mã PIN, landing page, trang quản trị người dùng, gói cước.

## Cấu trúc

| Thư mục                 | Nội dung                                                                      |
| ----------------------- | ----------------------------------------------------------------------------- |
| `apps/extension`        | Chrome extension (Vite) → file zip cho Chrome Web Store                       |
| `apps/web`              | Next.js 16: landing, dashboard `/app`, người xem `/m/[slug]`, admin, REST     |
| `apps/realtime`         | Fastify + WebSocket: nhận dữ liệu từ extension, phát SSE cho người xem        |
| `apps/worker`           | BullMQ: dịch cho người xem, AI managed, email, dọn dữ liệu                    |
| `packages/core`         | Logic dùng chung: kiểu dữ liệu, transcript, tạo biên bản, DOCX, dịch, tóm tắt |
| `packages/protocol`     | Schema zod có phiên bản cho giao thức realtime/REST                           |
| `packages/entitlements` | Danh mục tính năng, gói cước, hàm kiểm tra quyền                              |
| `packages/db`           | Chỉ dùng phía server: schema Drizzle, migration                               |
| `packages/ui`           | Design system: token Tailwind v4, component kiểu shadcn/ui, Storybook         |
| `packages/config`       | tsconfig / ESLint / Prettier dùng chung                                       |
| `infra/`                | Docker Compose cho môi trường dev, Dockerfile                                 |

Quy tắc phụ thuộc, lệnh và quy ước cho người và AI agent: xem [AGENTS.md](AGENTS.md). Công cụ cho agent (skills, instructions, agents, MCP): [.github/AGENT_TOOLING.md](.github/AGENT_TOOLING.md).

## Bắt đầu

Yêu cầu: Node.js 22+ (khuyến nghị 24), Docker Desktop (cho Postgres/Redis), Chrome 116+.

```powershell
# pnpm qua corepack (không cần cài toàn cục). Nếu `corepack enable` báo EPERM,
# cài shim vào thư mục người dùng và thêm vào PATH:
New-Item -ItemType Directory -Force "$env:USERPROFILE\.corepack-shims" | Out-Null
corepack enable pnpm --install-directory "$env:USERPROFILE\.corepack-shims"
$env:PATH = "$env:USERPROFILE\.corepack-shims;$env:PATH"

pnpm install
Copy-Item .env.example .env        # sửa giá trị nếu cần
pnpm infra:up                      # Postgres, Redis, Mailpit (http://localhost:8025), MinIO
pnpm --filter @lst/db db:migrate   # tạo bảng + đồng bộ danh mục tính năng + gói Free
pnpm dev                           # chạy song song web (:3000), realtime (:4000), worker, extension (watch)
```

| Lệnh                                   | Mô tả                                       |
| -------------------------------------- | ------------------------------------------- |
| `pnpm turbo run lint typecheck test`   | Kiểm tra toàn bộ                            |
| `pnpm build`                           | Build mọi app                               |
| `pnpm --filter @lst/<tên> <script>`    | Chạy script của một workspace               |
| `pnpm --filter @lst/ui storybook`      | Xem design system tại http://localhost:6006 |
| `pnpm --filter @lst/extension package` | Đóng gói extension cho Chrome Web Store     |
| `pnpm --filter @lst/db db:generate`    | Sinh migration sau khi sửa schema           |

## Trang giới thiệu công khai

Trang `/` trong `apps/web` giới thiệu các tính năng tiện ích hiện có, bản xem trước song ngữ tĩnh, quy trình sử dụng và hướng dẫn cài từ mã nguồn. Nội dung tập trung tại `apps/web/src/lib/marketing.ts`; các gói minh họa được truyền qua props, chưa kết nối thanh toán, tài khoản hay cơ sở dữ liệu.

Giao diện dùng minh họa vector cuộc họp tự thiết kế, bảng màu xanh–tím và các khối tính năng có điểm nhấn. Sóng âm minh họa và hiệu ứng mở trang chỉ chạy một lượt ngắn dưới 5 giây, không thu âm hay phát dữ liệu thật; hiệu ứng tự tắt khi bật chế độ giảm chuyển động của hệ điều hành.

Chạy riêng trang web bằng `corepack pnpm --filter @lst/web dev`. Không cần Postgres hoặc Redis cho trang giới thiệu. Dữ liệu mô phỏng không thu âm hay gọi dịch vụ AI; dùng tiện ích thật với dịch vụ AI qua API cần mạng và khóa riêng. Chia sẻ lên web và AI do nền tảng cung cấp vẫn là tính năng sắp ra mắt.

Khi triển khai, đặt `NEXT_PUBLIC_APP_URL` thành URL công khai của trang web trong môi trường **trước khi build** để liên kết ảnh Open Graph dùng đúng tên miền. Môi trường phát triển mặc định dùng `http://localhost:3000`.

Kiểm thử giao diện: chạy `corepack pnpm --filter @lst/web test:e2e:install` một lần, rồi `corepack pnpm --filter @lst/web test:e2e`. Playwright tự chạy web dev nếu chưa có server; CI kiểm thử bản production sau build. Bộ kiểm thử bao gồm điều hướng bàn phím, gói demo, responsive và axe WCAG 2.2 AA ở chế độ sáng/tối. Nếu chính sách Windows chặn Chromium, cần môi trường kiểm thử được cho phép; không vô hiệu hóa chính sách bảo vệ.

## Lộ trình

1. **Nền tảng** (đã xong): monorepo, tách package dùng chung, khung các app, design system, Docker dev, CI, công cụ cho agent.
2. **MVP chia sẻ live**: đăng nhập, kết nối extension, phát cuộc họp lên web, trang người xem có PIN, dashboard, kiểm tra quyền theo gói.
3. Trải nghiệm người xem và lịch sử: dịch theo ngôn ngữ người xem, biên bản trên web, tìm kiếm.
4. AI hybrid và hạn mức: token Deepgram tạm thời, LLM do server quản lý.
5. Hoàn thiện, bảo mật, phát hành.
