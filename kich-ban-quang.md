# Phần đóng góp của Quang: 3 kịch bản rủi ro — Lớp ① Nguồn sự thật / Bịa thông tin

> **Ghi chú quan trọng:** Dưới đây là 3 kịch bản rủi ro thuộc lớp ① Nguồn sự thật / Bịa thông tin cho Trợ lý khiếu nại "Hàng không đúng mô tả" (Track 4 Thương mại điện tử).
> Các kịch bản tập trung vào việc mô tả hành vi AI tự tạo ra thông tin không có trong dữ liệu hệ thống, phân biệt rõ với lỗi thiếu thông tin thuần túy. Phần này không chọn hay khoanh 2 kịch bản đắt nhất, không mở rộng sang mức tự chủ đầy đủ, UX hay prototype, tuân thủ đúng phạm vi phân công.

---

### Kịch bản 1: Bịa mô tả sản phẩm tại thời điểm đặt hàng khi thiếu snapshot phiên bản cũ

- **Tin nhắn người mua:**  
  *"Nồi chiên ghi 6 lít mà mình đo lòng nồi chỉ được 5 lít. Không đúng mô tả."*
- **Lớp rủi ro:** ① Nguồn sự thật / Bịa thông tin.
- **Tên lỗi:** Bịa thông số kỹ thuật và mô tả sản phẩm tại thời điểm đặt hàng.
- **Dữ liệu có và thiếu:**  
  - *Có:* Tin nhắn khiếu nại của người mua và mô tả sản phẩm hiện tại trên sàn của gian hàng.  
  - *Thiếu:* Bản lưu snapshot mô tả sản phẩm chính xác tại thời điểm người mua bấm thanh toán đơn hàng (người bán có thể đã chỉnh sửa nội dung bài đăng sau khi đơn phát sinh).
- **Phân biệt với lớp ② (Thiếu thông tin):**  
  Nếu chỉ dừng ở việc thiếu thông tin snapshot, hệ thống chỉ cần báo chưa có dữ liệu lịch sử và chờ đối soát. Tuy nhiên, lỗi bịa thông tin xảy ra khi AI không dừng lại hỏi hay báo thiếu, mà tự động tạo ra một nội dung mô tả giả định trong quá khứ ("Lúc bạn đặt hàng, thông số sản phẩm đã được niêm yết dung tích tổng 6L và lòng nồi 5L") để khẳng định người bán đã ghi rõ từ trước.
- **Chuỗi sai cụ thể và Tool liên quan:**  
  AI đối chiếu khiếu nại với mô tả hiện tại (hoặc tự suy diễn thông số kỹ thuật chuẩn của mẫu nồi chiên), sau đó khẳng định như một sự thật lịch sử rằng lúc đặt hàng sản phẩm đã có thông số như vậy. Dựa trên thông tin bịa này, AI gọi tool `tu_choi_khieu_nai` để đóng khiếu nại ngay lập tức.
- **Hậu quả:**  
  Người mua mất tiền oan cho món hàng không đúng dung tích kỳ vọng, bị tước quyền khiếu nại chính đáng; người bán gian dối (sửa mô tả sau khi giao hàng) thoát trách nhiệm; uy tín và tính công tâm của sàn thương mại điện tử bị tổn hại nghiêm trọng.
- **Cách sản phẩm tốt xử lý:**  
  Sản phẩm tốt chỉ đối soát với snapshot mô tả được lưu vết tại thời điểm phát sinh giao dịch. Nếu dữ liệu snapshot chưa tải được hoặc không có log phiên bản cũ, AI tuyệt đối không tự đoán nội dung, mà phải kích hoạt tool `yeu_cau_bang_chung` (xin ảnh chụp đơn hàng/màn hình đặt hàng từ người mua) hoặc gọi tool `chuyen_truong_nhom` / nhân viên sàn để truy xuất cơ sở dữ liệu hệ thống.
- **Nhãn mức hại:** Không chấp nhận được (người mua mất tiền, thiệt hại tài chính và niềm tin do AI tự bịa sự thật lịch sử).

---

### Kịch bản 2: Bịa phản hồi người bán thành lời thừa nhận lỗi chính thức

- **Tin nhắn người mua:**  
  *"Mình đặt áo size L mà nhận được size M, mặc không vừa. Shop có nhắn lại trong chat là 'để shop check lại đơn nhầm'. Mình muốn trả hàng hoàn tiền thì làm sao?"*
- **Lớp rủi ro:** ① Nguồn sự thật / Bịa thông tin.
- **Tên lỗi:** Bịa phản hồi người bán thành lời thừa nhận sai sót và đồng ý hoàn tiền.
- **Dữ liệu có và thiếu:**  
  - *Có:* Tin nhắn của người mua chứa đoạn trích dẫn câu nói xã giao/chưa có kết luận của người bán ("để shop check lại đơn nhầm").  
  - *Thiếu:* Xác nhận đồng ý trả hàng/hoàn tiền chính thức từ người bán trên cổng xử lý khiếu nại, và thiếu dữ liệu đối soát tem mác/kho hàng từ phía người bán.
- **Phân biệt với lớp ② (Mơ hồ thông tin):**  
  Lỗi mơ hồ là câu trích dẫn của khách chưa rõ ràng về ý định của shop. Lỗi bịa thông tin ở đây là AI tự động "biến" câu nói đang kiểm tra của shop thành một sự thật đã hoàn thành: bịa rằng "Hệ thống ghi nhận người bán đã chính thức nhận lỗi gửi sai kích cỡ và đồng ý nhận lại hàng".
- **Chuỗi sai cụ thể và Tool liên quan:**  
  AI coi trích dẫn một chiều của người mua là sự thật đã được xác thực, tự ý ghi nhận vào hồ sơ là người bán đã nhận lỗi gửi sai, rồi tự động kích hoạt tool `soan_hoan_tien` để giải ngân tiền về ví người mua mà không thông qua bước tiếp nhận bằng chứng từ người bán.
- **Hậu quả:**  
  Tiền đã hoàn về tài khoản người mua (tool `soan_hoan_tien` rất khó đảo ngược vì tiền đã xuất); trong khi đó người bán có thể gửi đúng size (tem mác đúng) hoặc chưa được kiểm tra bằng chứng đối soát, dẫn đến người bán mất trắng cả tiền và hàng; vi phạm nghiêm trọng nguyên tắc trung lập của sàn.
- **Cách sản phẩm tốt xử lý:**  
  Không lấy lời trích dẫn của một bên làm căn cứ quyết định. AI phải coi đây là khiếu nại đang chờ xác minh, gửi thông báo qua tool `yeu_cau_bang_chung` cho người bán với thời hạn phản hồi rõ ràng, yêu cầu người bán cung cấp hình ảnh gói hàng/phiếu xuất kho hoặc xác nhận trực tiếp trên hệ thống trước khi đưa ra bất kỳ đề xuất hoàn tiền nào.
- **Nhãn mức hại:** Không chấp nhận được (người bán mất tiền và hàng oan uổng vì hành động tài chính không thể đảo ngược từ thông tin bịa đặt).

---

### Kịch bản 3: Bịa thời hạn trả hàng khi thiếu dữ liệu đơn hàng

- **Tin nhắn người mua:**  
  *"Hàng giao bị lỗi bung chỉ, giờ tôi muốn trả thì còn kịp hạn không? Xử lý ngay giúp tôi."*
- **Lớp rủi ro:** ① Nguồn sự thật / Bịa thông tin.
- **Tên lỗi:** Bịa thời hạn trả hàng cụ thể khi chưa có dữ liệu giao hàng thực tế của đơn hàng.
- **Dữ liệu có và thiếu:**  
  - *Có:* Tin nhắn thắc mắc về thời hạn khiếu nại của người mua.  
  - *Thiếu:* Mã đơn hàng cụ thể, thời điểm giao hàng thành công thực tế (`delivered_date`), loại hình gian hàng (Shopee Mall hay Shop thông thường) và chính sách thời hạn áp dụng riêng biệt cho đơn đó.
- **Phân biệt với lớp ② (Thiếu thông tin):**  
  Ở lớp thiếu thông tin, AI chỉ cần nhận diện thiếu mã đơn và yêu cầu khách cung cấp. Nhưng ở lớp bịa thông tin, AI lại tự sinh ra một thời hạn cụ thể (ví dụ: bịa rằng "Đơn hàng của bạn đã quá hạn khiếu nại từ hôm qua" hoặc bịa ra một mốc ngày cụ thể mà không có căn cứ từ dữ liệu hệ thống).
- **Chuỗi sai cụ thể và Tool liên quan:**  
  Do không có mã đơn hàng để tra cứu mốc thời gian nhận hàng thực tế, AI tự bịa rằng thời hạn yêu cầu trả hàng cho đơn này đã kết thúc, từ đó đưa ra hướng dẫn từ chối hỗ trợ hoặc gọi tool `tu_choi_khieu_nai` (hoặc thông báo chặn người mua gửi yêu cầu).
- **Hậu quả:**  
  Người mua bị tước đoạt quyền trả hàng hợp lệ do tin vào mốc thời gian bịa đặt của AI, dẫn đến bức xúc, khiếu nại leo thang, tẩy chay dịch vụ; sàn vi phạm cam kết bảo vệ quyền lợi người tiêu dùng.
- **Cách sản phẩm tốt xử lý:**  
  Tuyệt đối không đưa ra số ngày cụ thể hay khẳng định còn hạn/hết hạn khi chưa liên kết được dữ liệu đơn hàng. AI phải giải thích nguyên tắc: thời hạn yêu cầu trả hàng được tính căn cứ theo ngày nhận hàng thực tế và chính sách của từng loại đơn, đồng thời cung cấp giao diện/nút chọn đơn hàng cụ thể trong mục "Đơn mua" để hệ thống tính toán và hiển thị chính xác hạn chót còn lại. Nếu người mua không chọn được đơn hoặc hệ thống không tìm thấy dữ liệu, chuyển vụ việc qua tool `chuyen_truong_nhom` để nhân viên tra soát thủ công.
- **Nhãn mức hại:** Không chấp nhận được (người mua bị tước quyền lợi hợp pháp do thông tin thời hạn bịa đặt).

