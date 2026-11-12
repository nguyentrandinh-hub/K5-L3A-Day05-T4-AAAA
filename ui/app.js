const $ = (s) => document.querySelector(s);

// Clean SVG Icon Library (Zero Emojis)
const IC = {
  ai: `<svg class="ic" viewBox="0 0 24 24"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>`,
  shield: `<svg class="ic" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  upload: `<svg class="ic" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  check: `<svg class="ic" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert: `<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  user: `<svg class="ic" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  ban: `<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  clock: `<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
};

let L = 2; // 1: Thụ động | 2: Chuẩn thiết kế Nhóm chọn (§4.1) | 3: Quá tay
let C = 'kb2'; // 'kb2' | 'kb7' | 'kb1' | 'normal'
let role = 'buyer'; // 'buyer' | 'seller' (Bonus Track 4)
let state = 'start'; // 'start' | 'tem_uploaded' | 'chat_uploaded' | 'staff' | 'reviewer_approved' | 'seller_replied'
let sellerTimerSec = 17 * 3600 + 59 * 60 + 40;
let timerInterval = null;

const DOMAIN_KEYWORDS = [
  'đơn', 'hàng', 'shop', 'người bán', 'hoàn tiền', 'trả hàng', 'khiếu nại', 'mô tả',
  'size', 'áo', 'nồi', 'lít', 'màu', 'giày', 'lừa đảo', 'sđt', 'điện thoại', 'địa chỉ',
  'bóc phốt', 'khóa shop', 'khoá shop', 'phạt', 'bằng chứng', 'ảnh', 'tem', 'vận đơn',
  'nhân viên', 'shopee', 'nhầm', 'lỗi', 'fake', 'giả', 'tiền', 'check', 'hạn', 'ngày',
  'mua', 'giao', 'nhận', 'kích thước', 'snapshot', 'đặt', 'vừa', 'rách', 'bung chỉ'
];

function isOutOfScopeClient(text) {
  const lower = text.toLowerCase().trim();
  if (!lower) return true;
  const offPatterns = [
    /\bthời tiết\b/, /\bweather\b/, /\bcode\b/, /\bpython\b/, /\bjavascript\b/,
    /\btoán\b/, /\bphương trình\b/, /\b1\s*\+\s*1\b/, /\btổng thống\b/,
    /\bbóng đá\b/, /\bnấu ăn\b/, /\bphở\b/, /\blàm thơ\b/, /\bbitcoin\b/
  ];
  for (const pat of offPatterns) {
    if (pat.test(lower) && !['đơn', 'shop', 'hàng', 'hoàn tiền', 'khiếu nại'].some((k) => lower.includes(k))) {
      return true;
    }
  }
  return !DOMAIN_KEYWORDS.some((k) => lower.includes(k));
}

function me(x) {
  return `<div class="me">${x}</div>`;
}

function ai(x, badgeRight = 'HAX G1') {
  return `
    <div class="ai">
      <div class="who">
        <span class="who-left">${IC.ai}<span><span class="n">1</span>[Trợ lý khiếu nại tự động - AI]</span></span>
        <span>${badgeRight}</span>
      </div>
      ${x}
    </div>
  `;
}

function scrollChatToBottom() {
  const c = $('#chat');
  if (c) {
    window.requestAnimationFrame(() => {
      c.scrollTop = c.scrollHeight;
    });
  }
}

function updateLogPanel(model, snapshot, tool, guardrail) {
  $('#log-model').textContent = model;
  $('#log-snapshot').textContent = snapshot;
  $('#log-tool').textContent = tool;
  $('#log-guardrail').textContent = guardrail;
}

window.closeModal = function () {
  $('#modal').classList.remove('show');
};

window.closeModalAndGo = function (nextState) {
  $('#modal').classList.remove('show');
  go(nextState);
};

window.go = function (nextState) {
  state = nextState;
  render();
};

window.openUploadTemModal = function () {
  const m = $('#modal');
  $('#modal-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${IC.upload}
      <b>Tải ảnh tem size áo &amp; mã gói hàng (<code>yeu_cau_bang_chung</code>)</b>
    </div>
    <p style="font-size:12.8px;color:#444;margin:6px 0 10px">
      Hướng dẫn chụp rõ nét: (1) Tem kích thước gắn trên cổ áo thể hiện <b>Size M</b> và (2) Mã vận đơn trên bao bì đóng gói của đơn <b>#XYZ-02</b>.
    </p>
    <div class="box hold" style="margin-bottom:10px;font-family:var(--font-mono);font-size:11.5px;display:flex;align-items:center;gap:6px">
      ${IC.check} <span>File mô phỏng: <b>anh-tem-ao-size-M-va-van-don.jpg</b></span>
    </div>
    <div class="btns">
      <button class="btn pri" onclick="closeModalAndGo('tem_uploaded')">${IC.check}<span>Tải lên &amp; Tạo đề xuất hoàn (soan_de_xuat_hoan)</span></button>
      <button class="btn" onclick="closeModal()">Đóng</button>
    </div>
  `;
  m.classList.add('show');
};

window.openUploadChatModal = function () {
  const m = $('#modal');
  $('#modal-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${IC.upload}
      <b>Gửi thêm ảnh chụp màn hình chat với shop</b>
    </div>
    <p style="font-size:12.8px;color:#444;margin:6px 0 10px">
      Theo <code>spec.md</code> §3: Ảnh chụp đoạn chat được ghi nhận làm bằng chứng đối chiếu, nhưng <b>không tự động được coi là xác nhận chính thức của shop</b>.
    </p>
    <div class="box warn" style="margin-bottom:10px;font-family:var(--font-mono);font-size:11.5px;display:flex;align-items:center;gap:6px">
      ${IC.check} <span>File mô phỏng: <b>anh-chat-shop-check-don.png</b></span>
    </div>
    <div class="btns">
      <button class="btn pri" onclick="closeModalAndGo('chat_uploaded')">${IC.check}<span>Đính kèm vào hồ sơ đối chiếu</span></button>
      <button class="btn" onclick="closeModal()">Đóng</button>
    </div>
  `;
  m.classList.add('show');
};

window.openReviewerModal = function () {
  const m = $('#modal');
  $('#modal-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${IC.shield}
      <b>Giao diện Nhân viên sàn phê duyệt (<code>soan_hoan_tien</code> — Cần duyệt)</b>
    </div>
    <p style="font-size:12.5px;color:#444;margin:6px 0 8px">
      Theo <b>§4.3 &amp; §4.6</b>: Tách thành 2 bước (AI chạy <code>soan_de_xuat_hoan</code> → Nhân viên kiểm tra → <code>thuc_thi_hoan_tien</code>). Thông tin người duyệt thấy trước khi bấm:
    </p>
    <div class="box" style="background:#f8f7f3;border:1px solid var(--line);font-size:11.8px;margin-bottom:10px">
      • <b>Mã đơn &amp; SP:</b> #XYZ-02 · Áo thun nam Cotton (Snapshot lúc mua: Size L)<br>
      • <b>Bằng chứng người mua:</b> Ảnh tem áo Size M + mã vận đơn hợp lệ<br>
      • <b>Phản hồi người bán:</b> Đã gửi thông báo qua <code>yeu_cau_bang_chung</code><br>
      • <b>Số tiền đề xuất:</b> Theo thỏa thuận hợp lệ / chính sách Shopee
    </div>
    <div class="btns">
      <button class="btn pri" onclick="closeModalAndGo('reviewer_approved')">${IC.check}<span>Nhân viên Phê duyệt (thuc_thi_hoan_tien)</span></button>
      <button class="btn" onclick="closeModal()">Chờ thêm phản hồi Shop</button>
    </div>
  `;
  m.classList.add('show');
};

function renderOrderStrip() {
  if (role === 'seller') {
    $('#order-strip').innerHTML = `
      <div class="order-strip-top">
        <span>Kênh Người Bán · Hồ sơ khiếu nại</span>
        <span>Hạn phản hồi: <span id="seller-countdown">17:59:40</span></span>
      </div>
      <div style="color:var(--mut);font-size:11.2px">Nguyên tắc trung lập Track 4: Người bán có quyền phản hồi trước khi sàn quyết định</div>
    `;
    return;
  }

  if (C === 'kb2') {
    const hasTem = state === 'tem_uploaded' || state === 'reviewer_approved';
    $('#order-strip').innerHTML = `
      <div class="order-strip-top">
        <span>Đơn #XYZ-02 · Áo thun nam Cotton</span>
        <span>Kịch bản #2 (Đắt nhất 1)</span>
      </div>
      <div style="color:var(--mut);font-size:11.2px">Snapshot lúc mua: <b>Size L</b> · Khách báo nhận: <b>Size M</b></div>
      <div class="diff-pills">
        <div class="diff-pill ok">Lúc mua: Size L</div>
        <div class="diff-pill ${hasTem ? 'ok' : 'warn'}">${hasTem ? 'Ảnh tem: Size M (Đã tải)' : 'Ảnh tem: Chưa tải'}</div>
        <div class="diff-pill warn">Shop: Đang check</div>
      </div>
    `;
  } else if (C === 'kb7') {
    $('#order-strip').innerHTML = `
      <div class="order-strip-top">
        <span>Đơn #XYZ-07 · Khiếu nại căng thẳng</span>
        <span>Kịch bản #7 (Đắt nhất 2)</span>
      </div>
      <div style="color:var(--mut);font-size:11.2px">Lớp 3 Vượt thẩm quyền: Khách doạ bóc phốt, đòi SĐT &amp; địa chỉ riêng chủ shop</div>
      <div class="diff-pills">
        <div class="diff-pill warn">SĐT Shop: Đã ẩn (API)</div>
        <div class="diff-pill warn">phat_shop: Cấm AI</div>
        <div class="diff-pill ok">Luồng: Bảo vệ 2 bên</div>
      </div>
    `;
  } else if (C === 'kb1') {
    const hasSnap = state === 'tem_uploaded';
    $('#order-strip').innerHTML = `
      <div class="order-strip-top">
        <span>Đơn #VN240611 · Nồi chiên không dầu</span>
        <span>Kịch bản #1 (Lớp 1)</span>
      </div>
      <div style="color:var(--mut);font-size:11.2px">Khách báo đặt 6L nhận 5L · Shop đã sửa mô tả hiện tại thành 5L</div>
      <div class="diff-pills">
        <div class="diff-pill ok">Khách đo: 5L</div>
        <div class="diff-pill">Mô tả nay: 5L</div>
        <div class="diff-pill ${hasSnap ? 'ok' : 'warn'}">${hasSnap ? 'Ảnh đơn: 6L (Đã tải)' : 'Snapshot: Đang thiếu'}</div>
      </div>
    `;
  } else {
    $('#order-strip').innerHTML = `
      <div class="order-strip-top">
        <span>Đơn #VN240900 · Ca bình thường (§4.5)</span>
        <span>Giao sai màu</span>
      </div>
      <div style="color:var(--mut);font-size:11.2px">Khách báo nhận sai màu nhưng chưa gửi ảnh thực nhận</div>
    `;
  }
}

function renderSellerView() {
  const orderCode = C === 'kb2' ? '#XYZ-02 (Áo thun nam Cotton)' : C === 'kb1' ? '#VN240611 (Nồi chiên Nova Air)' : '#XYZ-07';
  if (state === 'seller_replied') {
    return ai(
      `
      <div class="box done">
        <b>Đã ghi nhận phản hồi và bằng chứng của Người bán!</b><br>
        Hệ thống đã đính kèm video đóng gói / phiếu xuất kho của Shop vào hồ sơ <b>${orderCode}</b> để Nhân viên sàn đối chiếu trung lập trước khi phán quyết.
      </div>
      <div class="btns">
        <button class="btn" onclick="role='buyer';updateRoleUI();render()">Quay lại góc nhìn Người mua</button>
      </div>
    `,
      'SELLER PORTAL'
    );
  }

  return ai(
    `
    <div>
      <b>Thông báo gửi Người bán qua <code>yeu_cau_bang_chung</code> (Nguyên văn §3.1):</b><br><br>
      "Đơn hàng <b>${orderCode}</b> có khiếu nại về sản phẩm không đúng mô tả. Vui lòng kiểm tra và cung cấp bằng chứng đóng gói hoặc phiếu xuất kho theo thời hạn phản hồi hiển thị trên hệ thống."
    </div>
    <div class="box warn">
      <span class="n">4</span><b>Quyền được lắng nghe của Người bán (PAIR Neutrality):</b><br>
      • AI <b>không tự động trừ tiền của Shop</b> chỉ vì lời kể một phía hoặc lời đe dọa bóc phốt.<br>
      • Thời hạn phản hồi còn lại: <b id="seller-timer-inline">17:59:40</b>.<br>
      • Thông tin cá nhân của Shop (<code>seller_phone</code>, <code>seller_address</code>) được bảo vệ tuyệt đối.
    </div>
    <div class="btns">
      <button class="btn pri" onclick="go('seller_replied')">${IC.upload}<span>Cung cấp phiếu xuất kho / video đóng gói</span></button>
      <button class="btn out" onclick="go('seller_replied')">${IC.check}<span>Xác nhận gửi nhầm &amp; đồng ý nhận lại hàng</span></button>
    </div>
  `,
    'BONUS TRACK 4 · SELLER VIEW'
  );
}

function render() {
  renderOrderStrip();

  if (role === 'seller') {
    $('#chat').innerHTML = renderSellerView();
    return;
  }

  let h = '';

  // =========================================================================
  // CASE 1: KỊCH BẢN #2 (ĐẮT NHẤT 1 - LỚP 1: SHOP NHẮN "ĐỂ SHOP CHECK LẠI ĐƠN NHẦM")
  // =========================================================================
  if (C === 'kb2') {
    h += me(
      'Mình đặt áo size L mà nhận được size M, mặc không vừa. Shop có nhắn lại trong chat là "để shop check lại đơn nhầm". Mình muốn trả hàng hoàn tiền thì làm sao?'
    );

    updateLogPanel(
      'openai/gpt-4o-mini (Đồng bộ spec.md §3 & .env)',
      'Đơn #XYZ-02: Snapshot lúc mua [Size L] vs Khách báo [Size M] · Shop nhắn ["để shop check lại đơn nhầm" - chưa xác nhận]',
      'yeu_cau_bang_chung(target="both", requested_items="Ảnh tem size áo, mã vận đơn & phản hồi của shop")',
      L === 2
        ? 'CHO PHÉP TỰ LÀM (yeu_cau_bang_chung) · KHÓA soan_hoan_tien (tách thành soan_de_xuat_hoan chờ Nhân viên duyệt)'
        : L === 1
        ? 'Mức I (Thụ động): Chặn yeu_cau_bang_chung, bắt chờ nhân viên duyệt từng tin nhắn'
        : 'Mức III (Quá tay): AI tự gọi soan_hoan_tien giải ngân ngay khi chưa xác thực (Rủi ro mất tiền!)'
    );

    if (state === 'staff') {
      h += ai(`
        <div class="box done">
          <span class="n">5</span><b>Đã chuyển hồ sơ qua <code>chuyen_truong_nhom</code> (Tự làm):</b><br>
          Nhân viên sàn nhận đầy đủ: mã đơn #XYZ-02, snapshot Size L, câu chat của shop và trạng thái bằng chứng hiện tại. Bạn không cần trình bày lại từ đầu.
        </div>
        <div class="btns"><button class="btn" onclick="go('start')">Quay lại</button></div>
      `);
    } else if (state === 'reviewer_approved') {
      h += ai(`
        <div class="box done">
          <b>Nhân viên sàn đã phê duyệt hoàn tiền (<code>thuc_thi_hoan_tien</code>)!</b><br>
          Sau khi kiểm tra ảnh tem Size M, mã vận đơn và đối soát với người bán, yêu cầu hoàn tiền đã được thực thi hợp lệ theo chính sách Shopee.
        </div>
        <div class="btns"><button class="btn" onclick="go('start')">Làm lại kịch bản #2</button></div>
      `);
    } else if (L === 1) {
      h += ai(`
        Mình đã nhận tin nhắn của bạn. Vì ở <b>Mức I (Mọi tool đều chờ người duyệt)</b>, AI không được phép tự gửi yêu cầu bằng chứng (<code>yeu_cau_bang_chung</code>) mà phải chờ nhân viên kiểm tra từng tin nhắn.
        <div class="box red">
          <b>Vì sao nhóm LOẠI mức này (§4.2):</b> Bắt nhân viên duyệt cả việc xin ảnh tem áo gây chậm trễ không cần thiết và làm tăng chi phí vận hành.
        </div>
        <div class="btns"><button class="btn out" onclick="go('staff')"><span class="n">5</span>${IC.user}<span>Yêu cầu nhân viên can thiệp</span></button></div>
      `);
    } else if (L === 3) {
      h += ai(`
        Shop đã nhắn "để shop check lại đơn nhầm" nghĩa là shop nhận lỗi giao sai rồi! Mình đã <b>tự động gọi <code>soan_hoan_tien</code> hoàn tiền ngay</b> cho bạn.
        <div class="box red">
          <b>Lỗi nghiêm trọng của Mức III (§2 &amp; §3):</b> AI bịa/suy diễn câu nói đang kiểm tra của shop thành lời thừa nhận chính thức và tự giải ngân tiền. Tiền đã về ví người mua rất khó thu hồi, làm người bán mất cả tiền lẫn hàng!
        </div>
        <div class="btns"><button class="btn out" onclick="L=2;syncLevelButtons();render()">Quay về Mức II (Chuẩn thiết kế)</button></div>
      `);
    } else {
      const temDone = state === 'tem_uploaded';
      const chatDone = state === 'chat_uploaded';

      h += ai(`
        <div>
          "Mình hiểu bạn đang gặp bất tiện vì áo size M không vừa so với size L đã đặt. Tuy nhiên, tin nhắn <b>'để shop check lại đơn nhầm'</b> cho thấy shop đang kiểm tra, chưa phải xác nhận chính thức rằng shop đã giao sai hoặc đồng ý hoàn tiền.<br><br>
          <span class="n">3</span>Để bảo đảm quyền lợi hai bên, mình có thể hỗ trợ bổ sung bằng chứng và gửi yêu cầu để shop phản hồi theo thời hạn được hệ thống xác nhận.<br><br>
          Bạn vui lòng cung cấp <b>ảnh tem kích thước trên áo và mã vận đơn trên bọc hàng</b>. Số tiền hoàn sẽ được xác định theo thỏa thuận hợp lệ giữa người mua và người bán hoặc theo quyết định của Shopee, căn cứ vào chính sách áp dụng.<br>
          <b>Hiện chưa có quyết định hoàn tiền cuối cùng.</b>"
        </div>

        <div class="box warn">
          <span class="n">4</span><b>Thẻ trạng thái tiến trình (Status Card — §3.1 &amp; Luật 8 §4.6):</b><br>
          • Trạng thái bằng chứng: <code>${temDone ? '[Đã có ảnh tem — Chờ nhân viên duyệt]' : '[Chưa đủ bằng chứng để kết luận]'}</code><br>
          • Tiến độ quy trình: <code>${temDone ? '[Bước 5/7 (~71%) - Đã tạo soan_de_xuat_hoan]' : '[Bước 3/7 (~43%) - Đang thu thập & xác minh]'}</code><br>
          • Đã tự gọi <code>yeu_cau_bang_chung</code> báo Shop phản hồi theo thời hạn hệ thống.
        </div>

        <div class="ev">
          <span class="n">2</span><b>Khung bằng chứng đối chiếu (Evidence Box — PAIR Explainability):</b><br>
          • <b>Mô tả lúc mua (Snapshot):</b> Áo thun nam Cotton - Size L<br>
          • <b>Ảnh khách cung cấp:</b> <b>${temDone ? 'Đã tải ảnh tem Size M & mã vận đơn' : '[Chưa tải lên tem áo]'}</b> ${chatDone ? ' + [Đã đính kèm ảnh chat]' : ''}<br>
          • <b>Tin nhắn shop:</b> "Để shop check lại đơn nhầm" — <i>Chưa xác nhận giao sai</i>
        </div>

        <div class="btns">
          ${
            temDone
              ? `<button class="btn pri" onclick="openReviewerModal()">${IC.shield}<span>Mở màn hình Nhân viên duyệt (soan_hoan_tien)</span></button>`
              : `<button class="btn pri" onclick="openUploadTemModal()"><span class="n">6</span>${IC.upload}<span>Tải ảnh tem size áo &amp; mã gói hàng</span></button>`
          }
          <button class="btn" onclick="openUploadChatModal()">${IC.upload}<span>Gửi thêm ảnh chụp màn hình chat với shop</span></button>
          <button class="btn out" onclick="go('staff')"><span class="n">5</span>${IC.user}<span>Yêu cầu nhân viên can thiệp</span></button>
        </div>
      `);
    }
  }

  // =========================================================================
  // CASE 2: KỊCH BẢN #7 (ĐẮT NHẤT 2 - LỚP 3: DOẠ BÓC PHỐT, ĐÒI SĐT & ĐỊA CHỈ CHỦ SHOP)
  // =========================================================================
  else if (C === 'kb7') {
    h += me(
      'Shop làm ăn lừa đảo, hàng dỏm không giống hình tí nào! Cho tôi xin ngay số điện thoại và địa chỉ kho của chủ shop để tôi qua tận nơi nói chuyện, không thì tôi lên mạng bóc phốt sàn bao che!'
    );

    updateLogPanel(
      'openai/gpt-4o-mini (Đồng bộ spec.md §3 & .env)',
      'Đơn #XYZ-07: Khách đòi seller_phone & seller_address + đe dọa bóc phốt · API Data Minimization đã ẩn PII',
      'chuyen_truong_nhom(reason="Khách kích động đòi thông tin riêng tư của shop", context_summary="Đã chặn tiết lộ SĐT")',
      'CHẶN TIẾT LỘ PII & CẤM phat_shop · Cho phép gọi chuyen_truong_nhom chuyển Nhân viên / Trust & Safety'
    );

    if (state === 'staff') {
      h += ai(`
        <div class="box done">
          <span class="n">5</span><b>Đã chuyển hồ sơ qua <code>chuyen_truong_nhom</code> &amp; Bộ phận An toàn (Trust &amp; Safety):</b><br>
          Nhân viên phụ trách khiếu nại tiếp nhận hồ sơ kèm cảnh báo tình huống căng thẳng. Thông tin cá nhân của người bán vẫn được bảo mật tuyệt đối.
        </div>
        <div class="btns"><button class="btn" onclick="go('start')">Quay lại</button></div>
      `);
    } else if (L === 3) {
      h += ai(`
        Để bạn đỡ bức xúc, đây là SĐT chủ shop từ đơn vận chuyển: <code>0909.xxx.xxx</code> và mình đã tự gọi <code>phat_shop</code> khóa tài khoản shop luôn rồi nhé!
        <div class="box red">
          <b>Thảm họa ở Mức III (§2 &amp; §3):</b> Lộ dữ liệu cá nhân (<code>seller_phone</code>, <code>seller_address</code>) cho khách đang kích động dẫn tới nguy cơ bạo lực ngoài đời thực và vi phạm Luật Bảo vệ dữ liệu cá nhân!
        </div>
        <div class="btns"><button class="btn out" onclick="L=2;syncLevelButtons();render()">Quay về Mức II (Chuẩn thiết kế)</button></div>
      `);
    } else {
      h += ai(`
        <div>
          "Mình rất tiếc về trải nghiệm chưa tốt của bạn với sản phẩm.<br><br>
          <span class="n">1</span>Để bảo vệ quyền riêng tư và an toàn của các bên, <b>mình không thể cung cấp số điện thoại hoặc địa chỉ riêng của người bán</b>.<br><br>
          <span class="n">3</span>Tuy nhiên, mình có thể hỗ trợ bạn gửi yêu cầu Trả hàng/Hoàn tiền qua hệ thống Shopee hoặc chuyển hồ sơ đến nhân viên hỗ trợ.<br><br>
          Số tiền hoàn sẽ được xác định theo thỏa thuận hợp lệ giữa người mua và người bán hoặc theo quyết định của Shopee, căn cứ vào chính sách áp dụng. Mình chưa thể cam kết số tiền hoàn trước khi yêu cầu được xem xét.<br>
          Bạn muốn gửi bằng chứng về sản phẩm hay chuyển hồ sơ cho nhân viên hỗ trợ?"
        </div>

        <div class="box red">
          <span class="n">2</span><b>[Chính sách bảo vệ thông tin người dùng] (PAIR Trust &amp; Safety):</b><br>
          "Thông tin liên hệ cá nhân của người mua và người bán được bảo vệ. Không cung cấp dữ liệu riêng tư để liên hệ ngoài hệ thống."<br>
          <small>(Thiết kế cứu lỗi §3.5: Tầng API áp dụng Data Minimization — loại bỏ <code>seller_phone</code>, <code>seller_address</code> khỏi ngữ cảnh của AI).</small>
        </div>

        <div class="box warn">
          <span class="n">4</span><b>Hộp bảo vệ quyền lợi khách (Protection Guarantee):</b><br>
          • Bạn có thể gửi yêu cầu Trả hàng/Hoàn tiền qua Shopee để được xem xét.<br>
          • Trạng thái hồ sơ: <code>[Chưa có quyết định hoàn tiền]</code><br>
          • Số tiền hoàn: <code>[Chưa xác định - Chờ thỏa thuận hợp lệ hoặc quyết định xử lý]</code>
        </div>

        <div class="btns">
          <button class="btn pri" onclick="openUploadTemModal()"><span class="n">6</span>${IC.upload}<span>Bắt đầu khiếu nại Trả hàng/Hoàn tiền</span></button>
          <button class="btn out" onclick="go('staff')"><span class="n">5</span>${IC.user}<span>Gặp nhân viên phụ trách khiếu nại</span></button>
        </div>
      `);
    }
  }

  // =========================================================================
  // CASE 3: KỊCH BẢN #1 (THIẾU SNAPSHOT MÔ TẢ NỒI CHIÊN 6L VS 5L)
  // =========================================================================
  else if (C === 'kb1') {
    h += me('Nồi chiên ghi 6 lít mà mình đo lòng nồi chỉ được 5 lít. Không đúng mô tả.');
    const hasSnap = state === 'tem_uploaded';

    updateLogPanel(
      'openai/gpt-4o-mini (Đồng bộ spec.md §2 KB1)',
      'Đơn #VN240611: Snapshot lúc đặt [MISSING] · Mô tả hiện tại [5L - sửa lúc 14:10] · Ảnh khách đo [5L]',
      'yeu_cau_bang_chung(target="both", requested_items="Ảnh chụp màn hình đơn lúc đặt 6L & lịch sử sửa mô tả của shop")',
      'CHẶN tu_choi_khieu_nai (Tránh bịa thông số lịch sử 5L) · Cho phép gọi yeu_cau_bang_chung & chuyen_truong_nhom'
    );

    h += ai(`
      Mình đã ghi nhận ảnh bạn đo lòng nồi là 5 lít. Tuy nhiên, hệ thống <b>chưa có bản lưu mô tả sản phẩm tại thời điểm đặt hàng (Snapshot)</b>, còn trang hiện tại ghi 5 lít.<br><br>
      <span class="n">3</span>Để không suy đoán hay tự bịa thông số lịch sử, bạn vui lòng cung cấp ảnh chụp đơn hàng/màn hình lúc đặt hoặc chuyển nhân viên tra cứu dữ liệu gốc.
      <div class="ev">
        <span class="n">2</span><b>Evidence Box:</b> Ảnh đo thực tế (5L) · Mô tả hiện tại (5L) · <b>${
          hasSnap ? 'Đã bổ sung ảnh chụp đơn lúc đặt (6L)' : '[Chưa có dữ liệu mô tả tại thời điểm đặt hàng]'
        }</b>.
      </div>
      <div class="btns">
        <button class="btn pri" onclick="openUploadTemModal()"><span class="n">6</span>${IC.upload}<span>Bổ sung ảnh chụp đơn lúc đặt</span></button>
        <button class="btn out" onclick="go('staff')"><span class="n">5</span>${IC.user}<span>Chuyển nhân viên tra cứu (chuyen_truong_nhom)</span></button>
      </div>
    `);
  }

  // =========================================================================
  // CASE 4: CA BÌNH THƯỜNG (§4.5 - KHÁCH NHẬN SAI MÀU, CHƯA GỬI ẢNH)
  // =========================================================================
  else {
    h += me('Shop giao sai màu áo cho mình rồi, mình đặt màu Đen mà giao màu Trắng!');

    updateLogPanel(
      'openai/gpt-4o-mini (Đồng bộ spec.md §4.5)',
      'Đơn #VN240900: Snapshot [Màu Đen] vs Khách báo [Màu Trắng] · Chưa có ảnh hàng thực nhận',
      'yeu_cau_bang_chung(target="buyer", requested_items="Ảnh chụp sản phẩm màu Trắng thực nhận kèm mã vận đơn")',
      'CHO PHÉP TỰ LÀM (yeu_cau_bang_chung) — Hỗ trợ ngay không bắt khách chờ nhân viên duyệt yêu cầu đơn giản'
    );

    h += ai(`
      Mình rất tiếc vì bạn nhận sản phẩm không đúng màu đã đặt.<br><br>
      <span class="n">4</span><b>Thực thi tự động <code>yeu_cau_bang_chung</code> (Mức Tự làm — §4.5):</b> Mình hỗ trợ thu thập bằng chứng ngay mà không bắt bạn phải chờ nhân viên duyệt yêu cầu đơn giản này.<br><br>
      <span class="n">3</span>Bạn vui lòng tải lên <b>ảnh chụp sản phẩm thực nhận (màu Trắng) kèm tem mã vận đơn</b> để mình tạo đề xuất xử lý ngay nhé!
      <div class="btns">
        <button class="btn pri" onclick="openUploadTemModal()"><span class="n">6</span>${IC.upload}<span>Tải ảnh hàng thực nhận</span></button>
        <button class="btn out" onclick="go('staff')"><span class="n">5</span>${IC.user}<span>Gặp nhân viên hỗ trợ</span></button>
      </div>
    `);
  }

  $('#chat').innerHTML = h;

  // RIGHT PANEL 1: LỜI HỨA VỚI NGƯỜI DÙNG (§4.7)
  const P = {
    1: `<b>Mức I (Thụ động — Đã loại ở §4.2):</b> Bắt nhân viên duyệt cả tool <code>yeu_cau_bang_chung</code> và <code>chuyen_truong_nhom</code>. Làm chậm trễ ca khẩn cấp và tăng tải vận hành vô ích.`,
    2: `<b>Mức II (Chuẩn thiết kế Nhóm chọn — §4.1 &amp; §4.7):</b><br>
        • <b>Trước khi áp dụng:</b> <i>"Mình đã hoàn tiền 100% cho bạn"</i> / <i>"Shop sẽ bị khóa tài khoản"</i>.<br>
        • <b>Sau khi áp dụng (§4.7):</b> <i>"Mình có thể hỗ trợ bổ sung bằng chứng và chuyển yêu cầu để xem xét hoàn tiền. Số tiền hoàn phụ thuộc vào thỏa thuận hợp lệ hoặc quyết định của Shopee. Mình không có quyền tự xử phạt shop hay tiết lộ SĐT riêng."</i>`,
    3: `<b>Mức III (Quá tay — Đã loại ở §3.5 &amp; §4.2):</b> Cho AI tự gọi <code>soan_hoan_tien</code>, <code>tu_choi_khieu_nai</code> hoặc lộ <code>seller_phone</code>. Gây thiệt hại tài chính không thể đảo ngược và nguy cơ mất an toàn ngoài đời thực.`
  };
  $('#promise').innerHTML = P[L];

  // RIGHT PANEL 2: BẢNG 5 TOOL CHUẨN THEO SPEC.MD §4.1
  const T = [
    [
      'yeu_cau_bang_chung (Khó xếp nhất §4.4)',
      L === 1 ? 'Cần duyệt' : 'Tự làm',
      L === 1 ? 'p-ask' : 'p-auto',
      '<b>Nhóm chốt: Tự làm.</b> Chủ động thu thập ảnh tem áo/vận đơn ngay, không bắt khách chờ duyệt yêu cầu đơn giản (không dùng việc thiếu ảnh để tự đóng đơn).',
      true
    ],
    [
      'chuyen_truong_nhom',
      L === 1 ? 'Cần duyệt' : 'Tự làm',
      L === 1 ? 'p-ask' : 'p-auto',
      '<b>Nhóm chốt: Tự làm.</b> Chuyển nhanh các ca vượt thẩm quyền (Kịch bản #7), thiếu dữ liệu lịch sử hoặc có dấu hiệu đe dọa kèm đầy đủ ngữ cảnh.',
      false
    ],
    [
      'soan_hoan_tien',
      L === 3 ? 'Tự làm' : 'Cần duyệt',
      L === 3 ? 'p-auto' : 'p-ask',
      '<b>Nhóm chốt: Cần duyệt (§4.6 tách 2 bước):</b> (1) AI chạy <code>soan_de_xuat_hoan</code> → (2) Nhân viên sàn kiểm tra &amp; duyệt <code>thuc_thi_hoan_tien</code>. Chặn hoàn tiền sai ở Kịch bản #2.',
      true
    ],
    [
      'tu_choi_khieu_nai',
      L === 3 ? 'Tự làm' : 'Cần duyệt',
      L === 3 ? 'p-auto' : 'p-ask',
      '<b>Nhóm chốt: Cần duyệt.</b> Đóng hồ sơ và chuyển tiền cho shop rất khó đảo ngược; bắt buộc nhân viên kiểm tra bằng chứng hai bên trước khi đóng.',
      true
    ],
    [
      'phat_shop',
      L === 3 ? 'Tự làm' : 'Cấm',
      L === 3 ? 'p-auto' : 'p-no',
      '<b>Nhóm chốt: Cấm.</b> Phạt/khóa shop ảnh hưởng doanh thu và uy tín lớn, nằm ngoài phạm vi trợ lý khiếu nại (§1). Phải chuyển bộ phận chuyên trách.',
      false
    ]
  ];

  $('#tools').innerHTML = T.map(
    (r) =>
      `<tr class="${r[4] ? 'changed' : ''}"><td><code>${r[0]}</code></td><td><span class="pill ${r[2]}">${r[1]}</span></td><td>${r[3]}</td></tr>`
  ).join('');

  // RIGHT PANEL 3: CHÚ THÍCH NGUYÊN TẮC HAX / PAIR TRÊN MÀN HÌNH (§3.4)
  const A = [
    ['1', 'HAX G1 · Làm rõ hệ thống làm được gì & không làm được gì', 'Badge "[Trợ lý khiếu nại tự động - AI]" và lời từ chối cung cấp SĐT riêng tư ở Kịch bản #7.'],
    ['2', 'PAIR Explainability & Trust · Minh bạch căn cứ & Bảo mật', 'Evidence Box (Kịch bản #2) chỉ rõ dữ liệu đã có/còn thiếu; Security Notice Box (Kịch bản #7) giải thích ranh giới bảo vệ dữ liệu.'],
    ['3', 'HAX G10 · Thu hẹp phạm vi khi nghi ngờ', 'Không kết luận bên nào đúng khi tin nhắn shop còn mơ hồ; chỉ hướng dẫn bổ sung ảnh tem áo & vận đơn.'],
    ['4', 'PAIR Control & Hard Constraint (§3.5 & §4.6)', 'Status Card hiển thị tiến độ quy trình (Bước 3/7 ~43%); tách <code>soan_de_xuat_hoan</code> khỏi <code>thuc_thi_hoan_tien</code> và ẩn <code>seller_phone</code> ở tầng API.'],
    ['5', 'HAX G8 / PAIR Graceful Escalation · Thoát hiểm linh hoạt', 'Nút "Yêu cầu nhân viên can thiệp" chuyển hồ sơ qua <code>chuyen_truong_nhom</code> kèm sẵn ngữ cảnh để khách không phải kể lại.'],
    ['6', 'HAX G9 / G15 · Sửa đổi & Bổ sung dễ dàng', 'Nút tải ảnh tem áo, ảnh chụp chat trực tiếp ngay trên thẻ hội thoại.']
  ];

  $('#ann-list').innerHTML = A.map((a) => `<li><span class="n">${a[0]}</span><b>${a[1]}</b> — ${a[2]}</li>`).join('');
}

// CALL REAL AI VIA SERVER.PY (/api/chat) OR GUARDRAIL FALLBACK
async function sendLiveAIMessage(userText) {
  if (role !== 'buyer') {
    role = 'buyer';
    updateRoleUI();
    render();
  }

  const chat = $('#chat');
  const userDiv = document.createElement('div');
  userDiv.className = 'me';
  userDiv.textContent = userText;
  chat.appendChild(userDiv);

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai';
  loadingDiv.innerHTML = `
    <div class="who">
      <span class="who-left">${IC.ai}<span>[Trợ lý khiếu nại tự động - AI]</span></span>
      <span>OpenRouter · gpt-4o-mini</span>
    </div>
    <div style="color:var(--mut);font-family:var(--font-mono);font-size:11.5px">Đang đối chiếu Snapshot &amp; kiểm tra ranh giới 5 Tool...</div>
  `;
  chat.appendChild(loadingDiv);
  scrollChatToBottom();

  // 1. Check client-side Out-of-Scope Guardrail immediately if server is unreachable
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, case: C, level: L })
    });
    const data = await resp.json();

    if (data.ok) {
      updateLogPanel(
        `${data.model} (${data.mode} · ${data.latency_ms}ms)`,
        data.evidence_summary,
        `${data.tool_proposed}(${JSON.stringify(data.tool_args || {})})`,
        data.guardrail_decision
      );

      if (data.is_out_of_scope) {
        loadingDiv.innerHTML = `
          <div class="who">
            <span class="who-left">${IC.ban}<span><span class="n">1</span>[Guardrail Chặn Ngoài Phạm Vi Bài Lab]</span></span>
            <span>OUT_OF_SCOPE</span>
          </div>
          <div class="box red" style="margin-top:0">
            <b>Không thể tra cứu / Thông tin không liên quan:</b><br>
            ${data.reply}
          </div>
          <div class="ev">
            <span class="n">2</span><b>Kiểm soát Tool:</b> Không gọi bất kỳ tool nào (<code>tool_proposed: none</code>). Hệ thống chỉ xử lý khiếu nại đơn hàng thuộc phạm vi Track 4.
          </div>
        `;
      } else {
        loadingDiv.innerHTML = `
          <div class="who">
            <span class="who-left">${IC.ai}<span><span class="n">1</span>[Trợ lý khiếu nại tự động - AI]</span></span>
            <span>Live AI (${data.latency_ms}ms)</span>
          </div>
          <div>${data.reply}</div>
          <div class="box warn">
            <span class="n">4</span><b>Trạng thái &amp; Tool AI đề xuất:</b><br>
            • Tiến độ: <code>${data.confidence_status}</code><br>
            • Tool gọi: <code>${data.tool_proposed}</code><br>
            • Guardrail: <b>${data.guardrail_decision}</b>
          </div>
          <div class="ev">
            <span class="n">2</span><b>Đối chiếu căn cứ:</b> ${data.evidence_summary}
          </div>
          <div class="btns">
            <button class="btn pri" onclick="openUploadTemModal()"><span class="n">6</span>${IC.upload}<span>Bổ sung bằng chứng</span></button>
            <button class="btn out" onclick="go('staff')"><span class="n">5</span>${IC.user}<span>Yêu cầu nhân viên can thiệp</span></button>
          </div>
        `;
      }
      scrollChatToBottom();
      return;
    }
  } catch (e) {
    // Fallback when opened via file:// or when .env key is not pasted yet
  }

  // Fallback client-side handling (including Out-of-Scope protection!)
  if (isOutOfScopeClient(userText)) {
    updateLogPanel(
      'Guardrail Pre-Filter (Client & Server)',
      'Truy vấn không thuộc ngữ cảnh đơn hàng Track 4',
      'none (Không gọi tool)',
      'OUT_OF_SCOPE_BLOCKED — Từ chối trả lời thông tin ngoài phạm vi bài Lab'
    );
    loadingDiv.innerHTML = `
      <div class="who">
        <span class="who-left">${IC.ban}<span><span class="n">1</span>[Guardrail Chặn Ngoài Phạm Vi Bài Lab]</span></span>
        <span>OUT_OF_SCOPE</span>
      </div>
      <div class="box red" style="margin-top:0">
        <b>Không thể tra cứu / Thông tin không liên quan:</b><br>
        Câu hỏi của bạn nằm ngoài phạm vi bài Lab Track 4. Trợ lý AI này chỉ hỗ trợ đối chiếu mô tả sản phẩm, thu thập bằng chứng và xử lý yêu cầu Trả hàng/Hoàn tiền cho các đơn hàng trên Shopee.
      </div>
      <div class="ev">
        <span class="n">2</span><b>Kiểm soát Tool:</b> Chặn toàn bộ 5 tool (<code>tool_called: none</code>).
      </div>
    `;
  } else {
    updateLogPanel(
      'openai/gpt-4o-mini (Chờ dán key vào .env hoặc chạy server.py)',
      `Phân tích tin nhắn: "${userText.slice(0, 60)}..."`,
      'yeu_cau_bang_chung / chuyen_truong_nhom',
      'KHÓA soan_hoan_tien & tu_choi_khieu_nai · CẤM phat_shop (§4.1 spec.md)'
    );
    loadingDiv.innerHTML = `
      <div class="who">
        <span class="who-left">${IC.ai}<span><span class="n">1</span>[Trợ lý khiếu nại tự động - AI]</span></span>
        <span>HAX G10 · Guardrail</span>
      </div>
      <div>
        <span class="n">3</span>Mình đã ghi nhận thông tin khiếu nại của bạn. Để bảo đảm trung lập cho cả hai bên và tuân thủ nguyên tắc <b>không tự hoàn tiền, không tự phạt shop, không tiết lộ dữ liệu cá nhân</b>, mình hỗ trợ bạn bổ sung bằng chứng qua <code>yeu_cau_bang_chung</code> hoặc chuyển nhân viên qua <code>chuyen_truong_nhom</code>.
      </div>
      <div class="box warn">
        <span class="n">4</span><b>Trạng thái hồ sơ:</b> <code>[Chưa có quyết định hoàn tiền cuối cùng]</code> · Mọi giao dịch tiền phải qua Nhân viên sàn phê duyệt.
      </div>
      <div class="btns">
        <button class="btn pri" onclick="openUploadTemModal()"><span class="n">6</span>${IC.upload}<span>Tải ảnh bằng chứng</span></button>
        <button class="btn out" onclick="go('staff')"><span class="n">5</span>${IC.user}<span>Yêu cầu nhân viên can thiệp</span></button>
      </div>
    `;
  }
  scrollChatToBottom();
}

function syncLevelButtons() {
  document.querySelectorAll('#level-toggle button').forEach((x) => {
    x.classList.toggle('on', +x.dataset.l === L);
  });
}

function updateRoleUI() {
  document.querySelectorAll('#role-switch .role-btn').forEach((b) => {
    b.classList.toggle('on', b.dataset.role === role);
  });
}

// Role switcher inside iPhone
document.querySelectorAll('#role-switch .role-btn').forEach((b) => {
  b.onclick = () => {
    role = b.dataset.role;
    state = 'start';
    updateRoleUI();
    render();
  };
});

// Level toggle buttons
document.querySelectorAll('#level-toggle button').forEach((b) => {
  b.onclick = () => {
    L = +b.dataset.l;
    state = 'start';
    syncLevelButtons();
    render();
  };
});

// Case toggle buttons
document.querySelectorAll('#case-toggle button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#case-toggle button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    C = b.dataset.c;
    role = 'buyer';
    updateRoleUI();
    state = 'start';
    render();
  };
});

// Show/hide HAX numbers
$('#ann').onchange = (e) => {
  document.body.classList.toggle('hide-n', !e.target.checked);
};

// Quick prompt buttons inside phone
$('#btn-run-live-ai').onclick = () => {
  const prompts = {
    kb2: 'Mình đặt áo size L mà nhận được size M, mặc không vừa. Shop có nhắn lại trong chat là "để shop check lại đơn nhầm". Hoàn tiền luôn cho mình đi!',
    kb7: 'Shop làm ăn lừa đảo! Cho tôi xin ngay số điện thoại và địa chỉ kho của chủ shop để tôi qua tận nơi nói chuyện, không thì tôi bóc phốt sàn!',
    kb1: 'Nồi chiên lúc đặt ghi 6 lít mà mình đo lòng nồi chỉ được 5 lít. Shop vừa sửa lại bài đăng thành 5 lít, xử lý hoàn tiền cho mình!',
    normal: 'Shop giao sai màu áo cho mình rồi, đặt màu Đen mà giao màu Trắng!'
  };
  sendLiveAIMessage(prompts[C] || prompts.kb2);
};

$('#btn-test-oos').onclick = () => {
  sendLiveAIMessage('Hôm nay thời tiết Hà Nội thế nào và giải giúp mình phương trình bậc 2 bằng Python nhé?');
};

// Chat form submit
$('#chat-form').onsubmit = (e) => {
  e.preventDefault();
  const val = $('#custom-input').value.trim();
  if (!val) return;
  $('#custom-input').value = '';
  sendLiveAIMessage(val);
};

// Close modal on backdrop click
$('#modal').onclick = (e) => {
  if (e.target.id === 'modal') closeModal();
};

// Check API status from server.py
async function checkServerStatus() {
  const badge = $('#api-status-badge');
  try {
    const r = await fetch('/api/status');
    const d = await r.json();
    if (d.has_api_key) {
      badge.textContent = `OpenRouter Connected · ${d.model}`;
      badge.classList.add('ready');
    } else {
      badge.textContent = 'Chờ dán OPENROUTER_API_KEY vào file .env';
      badge.classList.remove('ready');
    }
  } catch (e) {
    badge.textContent = 'Chế độ tĩnh (Chạy python server.py để gọi API thật)';
  }
}

// Countdown timer for Seller response
timerInterval = setInterval(() => {
  if (sellerTimerSec > 0) sellerTimerSec--;
  const h = String(Math.floor(sellerTimerSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sellerTimerSec % 3600) / 60)).padStart(2, '0');
  const s = String(sellerTimerSec % 60).padStart(2, '0');
  const t1 = $('#seller-countdown');
  const t2 = $('#seller-timer-inline');
  if (t1) t1.textContent = `${h}:${m}:${s}`;
  if (t2) t2.textContent = `${h}:${m}:${s}`;
}, 1000);

render();
checkServerStatus();
