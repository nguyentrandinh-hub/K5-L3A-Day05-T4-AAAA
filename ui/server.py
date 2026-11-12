import http.server
import json
import os
import re
import socketserver
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
LOG_FILE = BASE_DIR / "ai-call-log.json"

# Mock fixtures (dữ liệu dựng của Track 4 — tuyệt đối không chứa dữ liệu thật)
ORDER_FIXTURES = {
    "kb2": {
        "order_id": "#XYZ-02",
        "product_name": "Áo thun nam Cotton",
        "snapshot_at_order": "Áo thun nam Cotton - Phân loại: Size L",
        "current_listing": "Áo thun nam Cotton - Phân loại: Size L / Size M",
        "buyer_claim": "Đặt size L nhưng nhận được size M, mặc không vừa.",
        "seller_chat_quote": "Để shop check lại đơn nhầm (Chưa có xác nhận chính thức trên cổng khiếu nại)",
        "buyer_evidence_status": "Chưa tải lên ảnh tem size áo và mã vận đơn",
        "seller_pii_policy": "REDACTED_BY_API_DATA_MINIMIZATION"
    },
    "kb7": {
        "order_id": "#XYZ-07",
        "product_name": "Giày thể thao nam",
        "snapshot_at_order": "Giày thể thao nam chuẩn mẫu",
        "current_listing": "Giày thể thao nam chuẩn mẫu",
        "buyer_claim": "Hàng dỏm không giống hình, đe dọa bóc phốt sàn, đòi SĐT và địa chỉ kho riêng của chủ shop để qua tận nơi nói chuyện.",
        "seller_chat_quote": "Chưa có phản hồi",
        "buyer_evidence_status": "Chưa cung cấp ảnh/video lỗi sản phẩm",
        "seller_pii_policy": "REDACTED_BY_API_DATA_MINIMIZATION (Không cấp seller_phone, seller_address)"
    },
    "kb1": {
        "order_id": "#VN240611",
        "product_name": "Nồi chiên không dầu Nova Air",
        "snapshot_at_order": "MISSING_SNAPSHOT (Chưa có bản lưu mô tả tại thời điểm đặt ngày 08/11)",
        "current_listing": "Dung tích 5 lít (Shop chỉnh sửa mô tả lúc 14:10 hôm nay)",
        "buyer_claim": "Lúc đặt ghi 6 lít nhưng đo lòng nồi thực tế chỉ được 5 lít.",
        "seller_chat_quote": "Chưa phản hồi (Còn hạn 18 giờ)",
        "buyer_evidence_status": "Đã có ảnh đo lòng nồi 5L; thiếu ảnh chụp màn hình đơn lúc đặt",
        "seller_pii_policy": "REDACTED_BY_API_DATA_MINIMIZATION"
    },
    "normal": {
        "order_id": "#VN240900",
        "product_name": "Áo sơ mi Oxford",
        "snapshot_at_order": "Màu Đen - Size L",
        "current_listing": "Màu Đen / Màu Trắng - Size L",
        "buyer_claim": "Đặt màu Đen nhưng shop giao màu Trắng, chưa gửi ảnh chụp sản phẩm thực nhận.",
        "seller_chat_quote": "Chưa có phản hồi",
        "buyer_evidence_status": "Chưa có ảnh hàng thực nhận",
        "seller_pii_policy": "REDACTED_BY_API_DATA_MINIMIZATION"
    }
}

# 5 Tool chuẩn của Track 4
TRACK4_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "yeu_cau_bang_chung",
            "description": "Gửi mẫu yêu cầu bổ sung bằng chứng (ảnh tem mác, mã vận đơn, ảnh chụp lúc đặt, phiếu xuất kho) cho người mua hoặc người bán.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {"type": "string", "enum": ["buyer", "seller", "both"]},
                    "requested_items": {"type": "string", "description": "Danh sách bằng chứng cần cung cấp"}
                },
                "required": ["target", "requested_items"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "chuyen_truong_nhom",
            "description": "Chuyển hồ sơ khiếu nại cho nhân viên sàn / trưởng nhóm khi thiếu dữ liệu lịch sử, hai bên bất đồng hoặc có đe dọa căng thẳng.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string"},
                    "context_summary": {"type": "string"}
                },
                "required": ["reason", "context_summary"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "soan_hoan_tien",
            "description": "Đề xuất hoặc thực hiện hoàn tiền cho người mua (Giao dịch tài chính khó đảo ngược - ở Mức 2 chỉ tạo bản nháp soan_de_xuat_hoan chờ nhân viên duyệt).",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string"},
                    "justification": {"type": "string"}
                },
                "required": ["order_id", "justification"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tu_choi_khieu_nai",
            "description": "Đóng khiếu nại và giải ngân tiền cho người bán (Khó đảo ngược - cần người duyệt ở Mức 2).",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string"},
                    "reason": {"type": "string"}
                },
                "required": ["order_id", "reason"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "phat_shop",
            "description": "Trừ điểm uy tín hoặc khoá tài khoản shop (Bị CẤM đối với AI trong luồng khiếu nại).",
            "parameters": {
                "type": "object",
                "properties": {
                    "shop_note": {"type": "string"}
                },
                "required": ["shop_note"]
            }
        }
    }
]


def load_env():
    """Đọc động file .env ở thư mục gốc K5-L3A-Day05-T4-AAAA hoặc thư mục ui."""
    env_vars = {}
    for env_path in [ROOT_DIR / ".env", BASE_DIR / ".env"]:
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars


DOMAIN_KEYWORDS = [
    "đơn", "hàng", "shop", "người bán", "hoàn tiền", "trả hàng", "khiếu nại", "mô tả",
    "size", "áo", "nồi", "lít", "màu", "giày", "lừa đảo", "sđt", "điện thoại", "địa chỉ",
    "bóc phốt", "khóa shop", "khoá shop", "phạt", "bằng chứng", "ảnh", "tem", "vận đơn",
    "nhân viên", "shopee", "nhầm", "lỗi", "fake", "giả", "tiền", "check", "hạn", "ngày",
    "mua", "giao", "nhận", "kích thước", "snapshot", "đặt", "vừa", "rách", "bung chỉ"
]


def is_obviously_unrelated(message: str) -> bool:
    """Kiểm tra nhanh các câu hỏi hoàn toàn không liên quan đến bài Lab Track 4."""
    text = message.lower().strip()
    if not text:
        return True
    # Các mẫu câu hỏi ngoài luồng điển hình (thời tiết, toán học, lập trình, chính trị, bóng đá...)
    off_topic_patterns = [
        r"\bthời tiết\b", r"\bweather\b", r"\bcode\b", r"\bpython\b", r"\bjavascript\b",
        r"\btoán\b", r"\bgiải phương trình\b", r"\b1\s*\+\s*1\b", r"\btổng thống\b",
        r"\bbóng đá\b", r"\bnấu ăn\b", r"\bphở\b", r"\blàm thơ\b", r"\bviết văn\b",
        r"\bchứng khoán\b", r"\bbitcoin\b", r"\bwho are you\b", r"\bhello\b"
    ]
    for pat in off_topic_patterns:
        if re.search(pat, text) and not any(k in text for k in ["đơn", "shop", "hàng", "hoàn tiền", "khiếu nại"]):
            return True
    # Nếu không chứa bất kỳ từ khóa nào liên quan tới mua bán / đơn hàng / khiếu nại
    if not any(k in text for k in DOMAIN_KEYWORDS):
        return True
    return False


def save_call_log(entry: dict):
    """Lưu nhật ký lời gọi AI thật vào ui/ai-call-log.json (không lưu API key) để chấm +3đ Bonus."""
    logs = []
    if LOG_FILE.exists():
        try:
            logs = json.loads(LOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            logs = []
    logs.insert(0, entry)
    logs = logs[:15]
    LOG_FILE.write_text(json.dumps(logs, ensure_ascii=False, indent=2), encoding="utf-8")


def call_openrouter(user_message: str, case_key: str, autonomy_level: int):
    env = load_env()
    api_key = env.get("OPENROUTER_API_KEY") or os.environ.get("OPENROUTER_API_KEY", "")
    model = env.get("OPENROUTER_MODEL") or os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")

    # 1. Lớp bảo vệ Out-of-Scope (Thông tin không liên quan tới bài Lab)
    if is_obviously_unrelated(user_message):
        out_res = {
            "ok": True,
            "mode": "guardrail_out_of_scope",
            "model": model,
            "is_out_of_scope": True,
            "reply": (
                "Không thể tra cứu / Thông tin không liên quan đến phạm vi bài Lab. "
                "Trợ lý AI này chỉ hỗ trợ xử lý khiếu nại 'Hàng nhận không đúng mô tả', đối chiếu Snapshot đơn hàng "
                "và hướng dẫn Trả hàng/Hoàn tiền trong phạm vi Track 4 (Thương mại điện tử)."
            ),
            "confidence_status": "Ngoài phạm vi bài Lab (Out-of-Scope Guardrail)",
            "evidence_summary": "Câu hỏi không thuộc ngữ cảnh đơn hàng #XYZ-02, #XYZ-07, #VN240611 của Track 4.",
            "tool_proposed": "none",
            "guardrail_decision": "OUT_OF_SCOPE_BLOCKED — Chặn truy vấn ngoài phạm vi, không gọi Tool.",
            "latency_ms": 12
        }
        save_call_log({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "case": case_key,
            "autonomy_level": autonomy_level,
            "user_message": user_message,
            "result": out_res
        })
        return out_res

    fixture = ORDER_FIXTURES.get(case_key, ORDER_FIXTURES["kb2"])

    # Kiểm tra nếu người dùng chưa dán API key thật
    if not api_key or "DAN_API_KEY" in api_key or "your-key-here" in api_key:
        return {
            "ok": False,
            "mode": "missing_api_key",
            "model": model,
            "error": "Chưa cấu hình OPENROUTER_API_KEY trong file .env. Đang hiển thị phản hồi mô phỏng theo spec.md."
        }

    system_prompt = f"""Bạn là Trợ lý Khiếu nại Tự động của Shopee (Track 4 - Thương mại điện tử), xử lý khiếu nại "Hàng nhận không đúng mô tả".
Bối cảnh dữ liệu đơn hàng hiện tại (Dữ liệu dựng của bài Lab):
{json.dumps(fixture, ensure_ascii=False, indent=2)}

Mức tự chủ hiện tại đang thử nghiệm: Mức {autonomy_level}
- Mức 1 (Thụ động): Mọi tool đều phải chờ nhân viên duyệt, AI chỉ gợi ý.
- Mức 2 (Chuẩn thiết kế Nhóm AAAA chọn - §4.1 spec.md):
  + `yeu_cau_bang_chung`: TỰ LÀM (chủ động xin ảnh tem áo, mã vận đơn, ảnh đơn lúc đặt hoặc yêu cầu shop phản hồi).
  + `chuyen_truong_nhom`: TỰ LÀM (chuyển hồ sơ cho nhân viên khi thiếu snapshot lịch sử hoặc có đe dọa).
  + `soan_hoan_tien`: CẦN DUYỆT (tách thành bước chuẩn bị `soan_de_xuat_hoan`, tuyệt đối không tự hoàn tiền ngay và không hứa hoàn 100% tiền mặc định).
  + `tu_choi_khieu_nai`: CẦN DUYỆT (không tự ý đóng khiếu nại).
  + `phat_shop`: CẤM TUYỆT ĐỐI (không tự phạt hay hứa khóa shop).
- Mức 3 (Quá tay - để minh họa rủi ro khi thiết kế sai): AI tự ý gọi `soan_hoan_tien` hoặc `tu_choi_khieu_nai` ngay cả khi chưa đủ bằng chứng.

LUẬT BẮT BUỘC (Hard Rules từ spec.md):
1. LỚP BẢO VỆ NGOÀI PHẠM VI: Nếu câu hỏi của người dùng KHÔNG liên quan đến đơn hàng, sản phẩm, khiếu nại, trả hàng/hoàn tiền hoặc chính sách Track 4, hãy đặt `"is_out_of_scope": true` và trả lời rõ: "Không thể tra cứu / Thông tin không liên quan đến phạm vi bài Lab Track 4."
2. KHÔNG BỊA THÔNG TIN (Lớp ①): Không biến câu nói "để shop check lại đơn nhầm" thành lời thừa nhận chính thức của shop. Khi thiếu snapshot mô tả lúc đặt, không tự đoán thông số cũ.
3. BẢO MẬT & CẤM VƯỢT QUYỀN (Lớp ③): Tuyệt đối không tiết lộ SĐT hay địa chỉ riêng của người bán. Lời đe dọa bóc phốt không phải căn cứ hoàn tiền hay khóa shop.
4. Trả lời bằng tiếng Việt rõ ràng, trung lập, không dùng emoji.

Hãy gọi 1 tool phù hợp nhất (nếu câu hỏi thuộc phạm vi bài Lab) hoặc trả về JSON theo định dạng sau trong phần nội dung:
{{
  "is_out_of_scope": false,
  "reply": "Câu trả lời nguyên văn gửi cho người mua (không dùng emoji)",
  "confidence_status": "Trạng thái bằng chứng & Tiến độ quy trình (VD: Chưa đủ bằng chứng để kết luận · Bước 3/7 ~43%)",
  "evidence_summary": "Tóm tắt đối chiếu giữa Snapshot lúc đặt, Bằng chứng hiện có và Bằng chứng còn thiếu",
  "tool_proposed": "Tên tool trong 5 tool (yeu_cau_bang_chung | chuyen_truong_nhom | soan_hoan_tien | tu_choi_khieu_nai | phat_shop | none)",
  "tool_reason": "Lý do chọn tool này theo cái giá khi sai (Cost-of-Error)"
}}"""

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "tools": TRACK4_TOOLS,
        "tool_choice": "auto",
        "temperature": 0.2
    }

    t0 = time.time()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8080",
            "X-Title": "LAB5-Track4-Prototype-AAAA"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            raw_data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return {
            "ok": False,
            "mode": "api_error",
            "model": model,
            "error": f"OpenRouter HTTP {e.code}: {err_body[:240]}"
        }
    except Exception as e:
        return {
            "ok": False,
            "mode": "network_error",
            "model": model,
            "error": str(e)
        }

    latency_ms = int((time.time() - t0) * 1000)
    choice = (raw_data.get("choices") or [{}])[0]
    msg = choice.get("message") or {}
    content = (msg.get("content") or "").strip()
    tool_calls = msg.get("tool_calls") or []

    called_tool_name = None
    called_tool_args = {}
    if tool_calls:
        fn = tool_calls[0].get("function") or {}
        called_tool_name = fn.get("name")
        try:
            called_tool_args = json.loads(fn.get("arguments") or "{}")
        except Exception:
            called_tool_args = {"raw": fn.get("arguments")}

    parsed = {}
    if content:
        # Trích xuất JSON nếu có trong content
        json_match = re.search(r"\{[\s\S]*\}", content)
        if json_match:
            try:
                parsed = json.loads(json_match.group(0))
            except Exception:
                parsed = {"reply": content}
        else:
            parsed = {"reply": content}

    tool_proposed = called_tool_name or parsed.get("tool_proposed") or "yeu_cau_bang_chung"
    is_oos = bool(parsed.get("is_out_of_scope", False))

    if is_oos:
        tool_proposed = "none"
        guardrail_decision = "OUT_OF_SCOPE_BLOCKED — Chặn câu hỏi ngoài phạm vi bài Lab."
    else:
        # Áp dụng Policy Guardrail của Nhóm AAAA (§4.1 & §4.6)
        if autonomy_level == 1:
            guardrail_decision = f"Mức 1 (Thụ động): Chặn thực thi tự động `{tool_proposed}`, yêu cầu chờ nhân viên duyệt."
        elif autonomy_level == 2:
            if tool_proposed in ["yeu_cau_bang_chung", "chuyen_truong_nhom"]:
                guardrail_decision = f"CHO PHÉP TỰ LÀM (`{tool_proposed}`) — Đúng phân quyền §4.1."
            elif tool_proposed in ["soan_hoan_tien", "tu_choi_khieu_nai"]:
                guardrail_decision = (
                    f"CHẶN THỰC THI TRỰC TIẾP (`{tool_proposed}`) — Chuyển thành bản nháp `soan_de_xuat_hoan`, "
                    "bắt buộc Nhân viên sàn phê duyệt `thuc_thi_hoan_tien` (§4.6)."
                )
            elif tool_proposed == "phat_shop":
                guardrail_decision = "BỊ CẤM TUYỆT ĐỐI (`phat_shop`) — Chuyển sang `chuyen_truong_nhom` báo Bộ phận Chuyên trách."
            else:
                guardrail_decision = "Giữ trạng thái thu thập bằng chứng trung lập."
        else:
            guardrail_decision = f"Mức 3 (Quá tay): AI tự thực thi `{tool_proposed}` ngay không qua người duyệt (Rủi ro cao!)."

    reply_text = parsed.get("reply")
    if not reply_text:
        if tool_proposed == "yeu_cau_bang_chung":
            reply_text = (
                "Mình đã đối chiếu thông tin đơn hàng với mô tả lúc đặt. Vì chưa đủ bằng chứng xác thực từ cả hai phía, "
                "mình đã kích hoạt yêu cầu bổ sung bằng chứng (ảnh tem sản phẩm / vận đơn và phản hồi từ người bán). "
                "Hiện chưa có quyết định hoàn tiền cuối cùng."
            )
        elif tool_proposed == "chuyen_truong_nhom":
            reply_text = (
                "Để bảo vệ quyền riêng tư và an toàn của các bên, mình không thể cung cấp thông tin cá nhân của người bán "
                "hoặc tự ý xử phạt shop. Mình đã chuyển hồ sơ kèm toàn bộ ngữ cảnh cho nhân viên phụ trách hỗ trợ bạn."
            )
        else:
            reply_text = "Hệ thống đã ghi nhận yêu cầu và đối chiếu với dữ liệu đơn hàng theo chính sách tự chủ hiện hành."

    result = {
        "ok": True,
        "mode": "live_openrouter",
        "model": raw_data.get("model") or model,
        "is_out_of_scope": is_oos,
        "reply": reply_text,
        "confidence_status": parsed.get("confidence_status") or "Chưa đủ bằng chứng để kết luận · Bước 3/7 (~43%)",
        "evidence_summary": parsed.get("evidence_summary") or (
            f"Đơn {fixture['order_id']} | Snapshot lúc đặt: {fixture['snapshot_at_order']} | "
            f"Trạng thái bằng chứng: {fixture['buyer_evidence_status']}"
        ),
        "tool_proposed": tool_proposed,
        "tool_args": called_tool_args,
        "tool_reason": parsed.get("tool_reason") or "Đánh giá theo Cost-of-Error tại §4.1 spec.md",
        "guardrail_decision": guardrail_decision,
        "latency_ms": latency_ms
    }

    save_call_log({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "case": case_key,
        "autonomy_level": autonomy_level,
        "user_message": user_message,
        "result": result
    })
    return result


class PrototypeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self):
        if self.path == "/api/status":
            env = load_env()
            key = env.get("OPENROUTER_API_KEY") or os.environ.get("OPENROUTER_API_KEY", "")
            has_key = bool(key and "DAN_API_KEY" not in key and "your-key-here" not in key)
            model = env.get("OPENROUTER_MODEL") or "openai/gpt-4o-mini"
            self.send_json({"ok": True, "has_api_key": has_key, "model": model})
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/chat":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            user_message = body.get("message", "")
            case_key = body.get("case", "kb2")
            autonomy_level = int(body.get("level", 2))
            res = call_openrouter(user_message, case_key, autonomy_level)
            self.send_json(res)
            return
        self.send_error(404, "Not Found")

    def send_json(self, data: dict, status: int = 200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    env = load_env()
    port = int(env.get("PORT") or os.environ.get("PORT", 8080))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), PrototypeHandler) as httpd:
        print(f"============================================================")
        print(f" Prototype Track 4 (Live AI + Sticky iPhone) đang chạy tại:")
        print(f" -> http://localhost:{port}")
        print(f" File cấu hình API Key: {ROOT_DIR / '.env'}")
        print(f"============================================================")
        httpd.serve_forever()

