# Prototype — Track 4: Trợ lý Khiếu nại Thương mại điện tử (Nhóm AAAA)

Prototype đồng bộ 100% với `spec.md` (§1–§7) và tích hợp đầy đủ các hạng mục **Điểm Bonus (+8 điểm)** theo `04-rubric.md` và `tracks/t4-ecommerce.md`:
1. **Khung iPhone Sticky Toàn Chiều Cao (`100vh`) ở cột trái:** Cố định khi cuộn trang, toàn bộ thao tác kéo/cuộn diễn ra mượt mà bên trong khung hội thoại giống điện thoại thật.
2. **100% Vector SVG Icons:** Không sử dụng bất kỳ emoji nào trên giao diện.
3. **Gọi AI thật qua OpenRouter (`openai/gpt-4o-mini`) + 5 Tool Calling:** Tự động đối chiếu khiếu nại với Snapshot lúc đặt hàng, kiểm soát theo mức tự chủ và ghi log thực tế vào `ui/ai-call-log.json` (không lộ API key).
4. **Lớp bảo vệ chặn ngoài phạm vi (Out-of-Scope Guardrail):** Tự động từ chối các câu hỏi không liên quan đến bài Lab Track 4 (`tool_proposed: none`).
5. **Màn hình Phía Người Bán (Seller View — Bonus Track 4):** Chuyển đổi trực tiếp ngay trên đỉnh màn hình iPhone để xem thông báo khiếu nại và đồng hồ hạn phản hồi 18 giờ.

---

## 1. Cách cấu hình API Key và chạy Live AI Server

1. Mở file [`.env`](../.env) ở thư mục gốc `K5-L3A-Day05-T4-AAAA/.env` và dán API Key OpenRouter của bạn vào:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxx...
   OPENROUTER_MODEL=openai/gpt-4o-mini
   PORT=8080
   ```
   *(File `.env` đã được đưa vào `.gitignore` để không bao giờ bị đẩy lên GitHub).*

2. Chạy server Python tại thư mục `ui/`:
   ```powershell
   cd c:\Users\buida\vivnuni_day05_lab\K5-L3A-Day05-T4-AAAA\ui
   python server.py
   ```
   *(Bạn có thể dán key vào `.env` bất cứ lúc nào mà không cần khởi động lại `server.py` — server tự động đọc lại `.env` ở mỗi lần gọi).*

3. Mở trình duyệt truy cập: **`http://localhost:8080`**

---

## 2. Cách trình diễn Điểm Bonus khi Demo

- **Thử gọi AI thật (`openai/gpt-4o-mini`):** Bấm nút **"Phân tích bằng AI thật"** ngay trên thanh nhập chat của chiếc iPhone (hoặc gõ câu khiếu nại bất kỳ rồi bấm **Gửi AI**). Quan sát bảng **Live AI Decision & Tool Calling Log** bên phải cập nhật thời gian phản hồi, tool được gọi và quyết định chặn/mở của Guardrail.
- **Thử lớp bảo vệ Out-of-Scope:** Bấm nút **"Thử hỏi ngoài phạm vi Lab"** (hoặc gõ câu hỏi về thời tiết, toán học, lập trình...) để thấy hệ thống trả về thông báo *"Không thể tra cứu / Thông tin không liên quan"* và chặn toàn bộ tool.
- **Thử màn hình Phía Người bán (Bonus Track 4):** Bấm tab **"Phía Người bán (Bonus)"** ngay trên đầu màn hình iPhone để thấy thông báo yêu cầu bằng chứng gửi từ `yeu_cau_bang_chung` và đồng hồ đếm ngược hạn phản hồi.
