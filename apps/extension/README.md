# Meeting Live Subtitles & Translate (Chrome Extension)

Chrome extension (Manifest V3) hiển thị **phụ đề trực tiếp**, **nhận diện người nói** và **bản dịch song ngữ** cho cuộc họp trên trình duyệt (Google Meet, Microsoft Teams web, Zoom web client) hoặc **bất kỳ tab nào đang phát âm thanh** (YouTube, webinar…). Phụ đề hiển thị trong **Chrome Side Panel**.

## Tính năng

- 🎧 Ghi âm âm thanh của tab hiện tại (`chrome.tabCapture`). Âm thanh vẫn phát ra loa bình thường.
- 📝 Nhận dạng giọng nói realtime bằng **Deepgram** streaming. Có kết quả tạm thời (interim), tự kết nối lại khi mất mạng.
- 🗣️ Nhận diện người nói (diarization). Bấm vào tên `Speaker N` để đổi tên.
- 🌐 Dịch tự động, cắm được nhiều dịch vụ:
  - **Google Translate**: miễn phí, không cần key (endpoint không chính thức, có thể bị giới hạn tần suất).
  - **Chrome built-in AI Translator**: dịch on-device, cần Chrome 138+ và phải tải mô hình trước.
  - **OpenAI**: cần API key, dịch tự nhiên hơn.
- 👀 3 chế độ xem: Song ngữ / Bản gốc / Bản dịch. Có chỉnh cỡ chữ, ẩn/hiện thời gian và giao diện sáng/tối theo hệ thống.
- 💾 Tự động lưu transcript (tối đa 100 phiên gần nhất). Có thể xem lại, sao chép, xuất **TXT** / **SRT** hoặc xoá.
- 🧾 **Tóm tắt & Biên bản cuộc họp** (tab _Tóm tắt & Biên bản_ trong Side Panel):
  - **Tóm tắt nhanh**: chỉ chạy khi bấm _⚡ Tóm tắt ngay_. Có thể bật _Tự cập nhật_ theo chu kỳ (mặc định tắt). Mỗi lần chỉ xử lý phần transcript mới.
  - **Biên bản**: tóm tắt, thành phần tham dự, nội dung thảo luận, quyết định, công việc cần làm (người phụ trách, thời hạn), vấn đề còn tồn đọng, bước tiếp theo. Mỗi mục có mốc thời gian để đối chiếu transcript.
  - Mẫu: tiêu chuẩn, tóm tắt ngắn, daily stand-up, phỏng vấn/khách hàng, bài giảng/video. Có ô _Yêu cầu thêm_ để ghi chỉ dẫn riêng.
  - **Trang Biên bản** để chỉnh sửa (tự lưu), bấm mốc thời gian để xem đoạn transcript tương ứng.
  - **Xuất DOCX**, tuỳ chọn kèm toàn bộ transcript làm phụ lục.
  - Dịch vụ tóm tắt: **OpenAI hoặc API tương thích OpenAI** (Azure OpenAI, Gemini, Ollama, LM Studio…) hoặc **Gemini Nano** có sẵn trong Chrome (on-device, miễn phí).

## Cài đặt (build từ source)

Yêu cầu: Node.js 22+, Chrome 116+. Chạy các lệnh từ thư mục gốc của repo (xem [README gốc](../../README.md) để cài pnpm):

```powershell
pnpm install
pnpm --filter @lst/extension build
```

1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked** và chọn thư mục `apps/extension/dist`.
3. Mở **Cài đặt** của extension (chuột phải icon → Options, hoặc nút ⚙ trong panel):
   - Nhập **Deepgram API key** (tạo miễn phí tại <https://console.deepgram.com/>), rồi bấm _Kiểm tra kết nối_.
   - Chọn ngôn ngữ nói, ngôn ngữ đích (mặc định: Tự động → Tiếng Việt) và dịch vụ dịch.

## Sử dụng

1. Mở tab cuộc họp hoặc tab có âm thanh (YouTube, Facebook video…).
2. **Bấm icon extension trên chính tab đó** để mở Side Panel. Chrome chỉ cho ghi âm tab sau khi bạn bấm icon (hoặc phím tắt) trên tab đó, gọi là quyền `activeTab`. Nên ghim icon lên thanh công cụ (biểu tượng 🧩 → 📌).
3. Bấm **▶ Bắt đầu**. Phụ đề tạm thời hiện ở cuối panel, câu hoàn chỉnh kèm bản dịch hiện trong danh sách.
4. Bấm **■ Dừng** để kết thúc. Phiên tự dừng khi tab bị đóng.

Panel vẫn mở khi bạn chuyển sang tab khác. Muốn ghi âm tab mới, hãy **bấm icon extension một lần trên tab mới** rồi bấm Bắt đầu. Nếu bạn bấm Bắt đầu trước và gặp thông báo cấp quyền, chỉ cần bấm icon: phụ đề sẽ tự bắt đầu. Quyền này mất khi tab tải sang trang khác; khi đó chỉ cần bấm icon lại.

Phím tắt: **Alt+Shift+S** bật/tắt phụ đề trên tab hiện tại. Có thể đổi tại `chrome://extensions/shortcuts`.

### Tóm tắt & xuất biên bản

1. Vào **Cài đặt → Tóm tắt & Biên bản**:
   - **OpenAI**: nhập API key (hoặc để trống để dùng key ở mục Dịch) và model (mặc định `gpt-4o-mini`).
   - **API tương thích khác**: đổi _Base URL_, ví dụ Gemini `https://generativelanguage.googleapis.com/v1beta/openai` hoặc Ollama `http://localhost:11434/v1`. Bấm **Kiểm tra kết nối & thử tóm tắt**; Chrome sẽ hỏi cấp quyền truy cập địa chỉ đó.
   - **Gemini Nano**: bấm _Tải Gemini Nano_. Nano chỉ viết tốt tiếng Anh/Tây Ban Nha/Nhật, nên biên bản được soạn bằng tiếng Anh rồi dịch sang ngôn ngữ đã chọn.
2. Trước khi tạo biên bản, nên đổi tên `Speaker N` ở tab _Phụ đề_ để biên bản ghi đúng người tham dự.
3. Ở tab **Tóm tắt & Biên bản**, chọn mẫu và ngôn ngữ, rồi bấm **📝 Tạo biên bản**. Có thể huỷ giữa chừng.
4. Bấm **✎ Mở & chỉnh sửa** để sửa biên bản, rồi bấm **⬇ Xuất DOCX**.

Cuộc họp dài được chia thành nhiều đoạn, ghi chú từng đoạn rồi gộp lại. Ghi chú của các đoạn được lưu lại, nên khi tạo lại chỉ phần mới được gửi đi.

> Side Panel mặc định nằm bên phải. Muốn chuyển sang trái: `chrome://settings/appearance` → _Side panel position_ → _Show on left_.

## Kiến trúc

```
Side Panel ──START──▶ Service Worker ──tabCapture.getMediaStreamId──▶ streamId
                              │
                              ▼
                     Offscreen Document
       getUserMedia(tab) → AudioContext ─┬─▶ loa (giữ âm thanh cho người dùng)
                                         └─▶ AudioWorklet → PCM16 16 kHz → Deepgram WebSocket
                     transcript (interim/final, speaker) → TranslationQueue → Translator
                              │ runtime messages
                              ▼
         Service Worker (lưu chrome.storage)  +  Side Panel (hiển thị realtime)
```

| Thư mục                         | Nội dung                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `src/background/`               | Service worker: điều phối capture, offscreen document, lưu phiên                       |
| `src/offscreen/`                | Pipeline âm thanh, STT, dịch                                                           |
| `src/sidepanel/`                | Giao diện phụ đề, tab Tóm tắt & Biên bản                                               |
| `src/minutes/`                  | Trang chỉnh sửa và xuất biên bản                                                       |
| `src/options/`                  | Trang cài đặt                                                                          |
| `src/lib/stt/`                  | Interface `SttProvider` + Deepgram                                                     |
| `src/lib/`                      | Thông điệp nội bộ, lưu cài đặt (`chrome.storage`), tạo biên bản, xử lý âm thanh        |
| `packages/core/src/translate/`  | Interface `Translator`, các provider, hàng đợi dịch (cache, retry, giới hạn đồng thời) |
| `packages/core/src/summarize/`  | Interface `Summarizer`: API tương thích OpenAI, Chrome Prompt API (Gemini Nano)        |
| `packages/core/src/minutes/`    | Chia đoạn transcript, prompt/mẫu, map-reduce, chuẩn hoá kết quả, xuất DOCX             |
| `packages/core/src/transcript/` | Xử lý phiên, xuất TXT/SRT                                                              |
| `public/`                       | `manifest.json`, `pcm-worklet.js`, icons                                               |

Phần logic dùng chung (`packages/core`) được dùng cả ở extension và các app web. Thêm provider mới: implement `SttProvider` (`src/lib/stt/SttProvider.ts`) hoặc `Translator` (`packages/core/src/translate/Translator.ts`), rồi đăng ký trong `createSttProvider` / `createTranslator` và trang Options.

## Phát triển

```powershell
pnpm --filter @lst/extension dev        # vite build --watch → dist (bấm reload trong chrome://extensions)
pnpm --filter @lst/extension test       # unit tests (Vitest)
pnpm --filter @lst/extension typecheck
pnpm --filter @lst/extension icons      # tạo lại icon PNG
pnpm --filter @lst/extension package    # đóng gói zip cho Chrome Web Store → dist-zip/
```

## Giới hạn & lưu ý

- Chỉ ghi âm **âm thanh của tab**, tức giọng những người khác. Giọng nói từ micro của bạn không được ghi.
- Nếu báo cần cấp quyền ghi âm cho tab: bấm icon extension (hoặc Alt+Shift+S) khi đang ở tab đó, phụ đề sẽ tự bắt đầu.
- Không thể ghi âm các trang `chrome://` và Chrome Web Store.
- API key được lưu cục bộ trong `chrome.storage.local` và gửi trực tiếp tới Deepgram/OpenAI.
- Với Chrome built-in Translator, cần bấm **Tải mô hình Chrome** trong Cài đặt cho từng cặp ngôn ngữ trước khi dùng.
- Hãy thông báo và xin phép người tham gia trước khi ghi/chép lời cuộc họp.
- Khi tóm tắt bằng dịch vụ đám mây, transcript được gửi tới máy chủ đó; panel luôn ghi rõ địa chỉ nhận. Với cuộc họp nhạy cảm, nên dùng Gemini Nano hoặc LLM chạy trên máy (Ollama).
- Biên bản do AI tạo có thể sai hoặc thiếu; hãy rà soát (bấm mốc thời gian để đối chiếu transcript) trước khi phát hành.
- Phiên bản này chỉ xuất biên bản dạng DOCX với bố cục mặc định. Mẫu riêng của công ty sẽ bổ sung sau; bố cục nằm ở `buildMinutesDocument` trong `packages/core/src/minutes/docx.ts`.
