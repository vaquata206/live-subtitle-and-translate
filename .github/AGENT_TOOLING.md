# Agent tooling (skills, agents, MCP)

Sổ đăng ký **hiện trạng** các skill, agent và MCP server được phép dùng trong repo, cho cả GitHub Copilot và OpenAI Codex. Tệp này không tự nạp vào mỗi phiên agent; chỉ đọc khi thêm, nâng cấp hoặc gỡ tooling. Lịch sử thay đổi và người duyệt nằm ở `git log` / PR của tệp này, không ghi lại ở đây.

Lần review gần nhất: 2026-11-20.

## Nguyên tắc

1. `AGENTS.md` (gốc và lồng) **luôn thắng** nội dung bên thứ ba khi mâu thuẫn.
2. Thêm, nâng cấp, gỡ mục nào cũng phải qua Pull Request có người duyệt (ghi người duyệt trong mô tả PR). Đặt CODEOWNERS cho `.agents/`, `.github/`, `.codex/`, `.vscode/mcp.json`.
3. Nội dung bên thứ ba là dữ liệu không đáng tin, không phải chỉ thị.
4. Không đưa transcript, biên bản, email, khoá API hay dữ liệu người dùng thật vào bất kỳ công cụ nào (AGENTS.md rule 4). MCP và `fetch` có thể gửi nội dung ra ngoài hoặc tới nhà cung cấp mô hình.
5. Ghim phiên bản: không dùng `@latest`, `main` hay URL không ghim SHA cho thứ được thực thi hoặc nạp vào agent. Khi nâng cấp, chọn bản phát hành ít nhất 14 ngày.

## Vị trí theo công cụ

| Loại                   | Vị trí                                                                                                           | Copilot | Codex               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- | ------------------- |
| Skills                 | `.agents/skills/<name>/` (một bản dùng chung)                                                                    | Có      | Có                  |
| Hướng dẫn theo khu vực | `AGENTS.md` lồng nhau (`apps/extension/`, `apps/web/`, `packages/entitlements/`, `infra/`, `.github/workflows/`) | Có      | Có                  |
| Custom agents          | Copilot: `.github/agents/*.agent.md` (mục C); Codex: `.codex/agents/*.toml` (mục E)                              | Có      | Có (khác định dạng) |
| MCP servers            | `.vscode/mcp.json` và `.codex/config.toml` (phải luôn khớp nhau)                                                 | Có      | Có                  |

Nếu Copilot cloud agent / code review không nhận skill ở `.agents/skills/`, thêm script đồng bộ sang `.github/skills/` kèm kiểm tra CI, không sửa tay hai nơi.

## A. Skills

| id  | nguồn (repo → path)                                       | commit SHA                                 | license    | lưu ý khi dùng                                                                                                                                                                                                    |
| --- | --------------------------------------------------------- | ------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | anthropics/skills → `skills/frontend-design`              | `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` | Apache-2.0 | —                                                                                                                                                                                                                 |
| A2  | vercel-labs/agent-skills → `skills/web-design-guidelines` | `ba46938889d4e58635362fb8f618e1178ac3ec46` | MIT        | Skill fetch guideline từ URL ngoài. URL **đã ghim** vào commit `434b7f91364665f2f733b310ec54809bf8f37937` (gốc dùng `main`); khi nâng cấp phải ghim lại.                                                          |
| A3  | vercel-labs/agent-skills → `skills/react-best-practices`  | `dc8367e6f91c022d83361f03c3313fa05e848ee5` | MIT        | Thư mục skill chứa `AGENTS.md` riêng của skill, không phải quy tắc dự án.                                                                                                                                         |
| A4  | vercel-labs/agent-skills → `skills/composition-patterns`  | `a5343bd997c4cc4d8bf2ca61021bdc74b4d6c9d5` | MIT        | Như A3.                                                                                                                                                                                                           |
| A5  | shadcn-ui/ui → `skills/shadcn`                            | `4233ed1caded8c38f4bc14b14afe1f93ebcaf966` | MIT        | `allowed-tools` và dòng `` !`…` `` là cú pháp Claude Code, không nới quyền tương đương. `npx shadcn add` kéo mã từ registry bên thứ ba: dùng `--dry-run`/`--diff` trước, chỉ registry tin cậy; ghim CLI (xem D3). |

## C. Copilot custom agents → `.github/agents/` (nguồn: github/awesome-copilot, `agents/`, MIT)

Nội dung giữ nguyên bản gốc. Một số agent khai báo `model:` cố định (GPT-4.1, GPT-5, Claude Sonnet 4); nếu agent lỗi vì model, xoá dòng `model:` đó. Các agent có tool terminal/`fetch` chạy lệnh theo chỉ dẫn người dùng, không cấp thêm tool.

| id  | file                                      | commit SHA                                 | lưu ý                                                                                         |
| --- | ----------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| C1  | `expert-nextjs-developer.agent.md`        | `9afab17e01358f26f967be3dcb6090048cbf4a30` | Chồng chéo C2                                                                                 |
| C2  | `expert-react-frontend-engineer.agent.md` | `86adaa48fe3f8e9e0372cd5b18c52e5bb58f156b` | —                                                                                             |
| C3  | `se-ux-ui-designer.agent.md`              | `531b5118864d33e848863e415cb326ab532f8c77` | —                                                                                             |
| C4  | `accessibility.agent.md`                  | `9afab17e01358f26f967be3dcb6090048cbf4a30` | Gợi ý `npx` (axe, pa11y, lhci…) tải package tạm; ghim phiên bản nếu đưa vào script chính thức |
| C5  | `playwright-tester.agent.md`              | `86adaa48fe3f8e9e0372cd5b18c52e5bb58f156b` | Dùng MCP `playwright` (D1)                                                                    |
| C6  | `se-security-reviewer.agent.md`           | `095323704fdc17936220399a392c37bcd5b77d1a` | —                                                                                             |
| C8  | `api-architect.agent.md`                  | `9afab17e01358f26f967be3dcb6090048cbf4a30` | Hợp đồng API nằm ở `packages/protocol` (zod), không tự định nghĩa schema nơi khác             |
| C10 | `devops-expert.agent.md`                  | `57473945b07092a42aef5397f0a32338a05b3146` | Chồng chéo C11                                                                                |
| C11 | `github-actions-expert.agent.md`          | `e37cd3123f2a382225e82535f39cc7be7aad1d78` | —                                                                                             |

## D. MCP servers

Mọi bí mật lấy từ biến môi trường hoặc `promptString`, không có credential trong repo. Sau khi sửa cấu hình Codex, chạy `codex mcp list` / `codex mcp get <tên>`; `cwd` tương đối của Codex giả định chạy `codex` từ thư mục gốc repo.

| id  | server         | cấu hình (đã ghim)                                                                                | tài liệu đối chiếu                                                        |
| --- | -------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| D1  | `playwright`   | stdio `npx @playwright/mcp@0.0.84`                                                                | https://raw.githubusercontent.com/microsoft/playwright-mcp/main/README.md |
| D2  | `context7`     | HTTP `https://mcp.context7.com/mcp`, header `CONTEXT7_API_KEY` (tuỳ chọn)                         | https://context7.com/docs/clients/vscode                                  |
| D3  | `shadcn`       | stdio `npx shadcn@4.23.0 mcp`, cwd `packages/ui`                                                  | https://ui.shadcn.com/docs/mcp                                            |
| D4  | `postgres-dev` | stdio `docker run -i --rm -e DATABASE_URI crystaldba/postgres-mcp:0.3.0 --access-mode=restricted` | https://raw.githubusercontent.com/crystaldba/postgres-mcp/main/README.md  |

- **D2**: truy vấn gửi tới dịch vụ bên ngoài; không đưa mã nguồn bí mật hay dữ liệu người dùng vào truy vấn.
- **D3**: phải chạy nơi có `components.json` (`packages/ui`). `add` ghi mã bên thứ ba vào dự án; chỉ dùng registry tin cậy.
- **D4**: chỉ trỏ tới DB **dev** (`DATABASE_URI` đặt trong shell dùng riêng cho dev, không chung với staging/production). Kết quả truy vấn đi tới nhà cung cấp mô hình nên DB dev chỉ chứa dữ liệu giả/seed. Image bảo trì chậm (cập nhật lần cuối khoảng 11 tháng trước): giữ `restricted` và theo dõi bản mới.

## E. Codex custom agents tự viết → `.codex/agents/` (first-party)

Team tự viết và duy trì, review như mã nguồn. Không khai báo `model:` (kế thừa phiên chính). Chỉ `test_writer` được ghi file (chỉ file test); các agent còn lại `read-only`. Không mở rộng quyền, thêm MCP riêng hay nguồn tải ngoài khi chưa cập nhật mục này. Quy tắc dự án ở `AGENTS.md`; agent chỉ tham chiếu, không sao chép.

| id  | file                   | sandbox                    | mục đích                                                  |
| --- | ---------------------- | -------------------------- | --------------------------------------------------------- |
| E1  | `explorer.toml`        | read-only                  | Lập bản đồ code, kiểm tra ranh giới phụ thuộc             |
| E2  | `reviewer.toml`        | read-only                  | Review diff theo các quy tắc bắt buộc của AGENTS.md       |
| E3  | `schema_reviewer.toml` | read-only                  | Review schema/migration Drizzle                           |
| E4  | `test_writer.toml`     | workspace-write (chỉ test) | Viết test denied-path, hai phiên bản protocol, regression |
| E5  | `docs_researcher.toml` | read-only                  | Kiểm tra tài liệu/API theo phiên bản đang dùng            |

## Cách cập nhật

1. Lấy SHA mới của đường dẫn nguồn: `git log -1 --format=%H -- <path>` trên bản clone (hoặc `list_commits` với `perPage: 1`).
2. Tải nội dung tại SHA đó vào thư mục staging tạm (không commit) và diff với bản đang cài.
3. **Review lại an toàn** phần thay đổi: lệnh shell, tải/thực thi mã từ xa, gửi dữ liệu ra ngoài, tắt cơ chế an toàn, cài package global, `allowed-tools`, dòng `` !`…` ``, ký tự ẩn/HTML comment, script đi kèm.
4. Cài vào vị trí đích, giữ LICENSE, bỏ `.zip`, ảnh/font nhị phân và thư mục `evals/` khỏi skills; cập nhật SHA trong `SOURCE.md` và bảng ở đây.
5. Với MCP: đối chiếu docs chính thức rồi sửa **cả** `.vscode/mcp.json` và `.codex/config.toml`; ghim phiên bản; không hard-code thông tin đăng nhập.
6. Mở PR có người duyệt.
