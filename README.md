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

## Cài đặt (build từ source)

Yêu cầu: Node.js 20+, Chrome 116+.

```powershell
npm install
npm run build
```

1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked** và chọn thư mục `dist`.
3. Mở **Cài đặt** của extension (chuột phải icon → Options, hoặc nút ⚙ trong panel):
   - Nhập **Deepgram API key** (tạo miễn phí tại <https://console.deepgram.com/>), rồi bấm *Kiểm tra kết nối*.
   - Chọn ngôn ngữ nói, ngôn ngữ đích (mặc định: Tự động → Tiếng Việt) và dịch vụ dịch.

## Sử dụng

1. Mở tab cuộc họp hoặc tab có âm thanh (YouTube, Facebook video…).
2. **Bấm icon extension trên chính tab đó** để mở Side Panel. Chrome chỉ cho ghi âm tab sau khi bạn bấm icon (hoặc phím tắt) trên tab đó, gọi là quyền `activeTab`. Nên ghim icon lên thanh công cụ (biểu tượng 🧩 → 📌).
3. Bấm **▶ Bắt đầu**. Phụ đề tạm thời hiện ở cuối panel, câu hoàn chỉnh kèm bản dịch hiện trong danh sách.
4. Bấm **■ Dừng** để kết thúc. Phiên tự dừng khi tab bị đóng.

Panel vẫn mở khi bạn chuyển sang tab khác. Muốn ghi âm tab mới, hãy **bấm icon extension một lần trên tab mới** rồi bấm Bắt đầu. Nếu bạn bấm Bắt đầu trước và gặp thông báo cấp quyền, chỉ cần bấm icon: phụ đề sẽ tự bắt đầu. Quyền này mất khi tab tải sang trang khác; khi đó chỉ cần bấm icon lại.

Phím tắt: **Alt+Shift+S** bật/tắt phụ đề trên tab hiện tại. Có thể đổi tại `chrome://extensions/shortcuts`.

> Side Panel mặc định nằm bên phải. Muốn chuyển sang trái: `chrome://settings/appearance` → *Side panel position* → *Show on left*.

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

| Thư mục | Nội dung |
|---|---|
| `src/background/` | Service worker: điều phối capture, offscreen document, lưu phiên |
| `src/offscreen/` | Pipeline âm thanh, STT, dịch |
| `src/sidepanel/` | Giao diện phụ đề |
| `src/options/` | Trang cài đặt |
| `src/core/stt/` | Interface `SttProvider` + Deepgram |
| `src/core/translate/` | Interface `Translator`, các provider, hàng đợi dịch (cache, retry, giới hạn đồng thời) |
| `src/core/transcript/` | Xử lý phiên, xuất TXT/SRT |
| `public/` | `manifest.json`, `pcm-worklet.js`, icons |

Thêm provider mới: implement `SttProvider` (`src/core/stt/SttProvider.ts`) hoặc `Translator` (`src/core/translate/Translator.ts`), rồi đăng ký trong `createSttProvider` / `createTranslator` và trang Options.

## Phát triển

```powershell
npm run dev        # vite build --watch → dist (bấm reload trong chrome://extensions)
npm test           # unit tests (Vitest)
npm run typecheck
npm run icons      # tạo lại icon PNG
```

## Giới hạn & lưu ý

- Chỉ ghi âm **âm thanh của tab**, tức giọng những người khác. Giọng nói từ micro của bạn không được ghi.
- Nếu báo cần cấp quyền ghi âm cho tab: bấm icon extension (hoặc Alt+Shift+S) khi đang ở tab đó, phụ đề sẽ tự bắt đầu.
- Không thể ghi âm các trang `chrome://` và Chrome Web Store.
- API key được lưu cục bộ trong `chrome.storage.local` và gửi trực tiếp tới Deepgram/OpenAI.
- Với Chrome built-in Translator, cần bấm **Tải mô hình Chrome** trong Cài đặt cho từng cặp ngôn ngữ trước khi dùng.
- Hãy thông báo và xin phép người tham gia trước khi ghi/chép lời cuộc họp.
