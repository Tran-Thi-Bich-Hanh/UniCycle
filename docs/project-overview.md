# UniCycle – Nền tảng mua bán đồ cũ dành cho sinh viên

## 1. Hiểu bài toán (Understanding the Problem)

### 1.1. Website giải quyết vấn đề gì?

Sinh viên thường xuyên có nhu cầu mua bán, thanh lý đồ đã qua sử dụng: sách, giáo trình, bàn học, ghế, đồ điện tử, đồ cá nhân, vật dụng ký túc xá (KTX).

Hiện nay việc này diễn ra phân tán trên các nhóm Facebook, Zalo hoặc qua quan hệ cá nhân, dẫn đến:

| Vấn đề | Biểu hiện |
|---|---|
| Khó tìm kiếm | Tin nằm rải rác nhiều nhóm, khó lọc theo danh mục, giá, khu vực; bài đăng nhanh bị trôi |
| Thiếu thông tin đáng tin cậy | Khó đánh giá tình trạng thật của đồ và độ uy tín người bán; khó biết người đăng có phải sinh viên thật |
| **Không biết lịch sử món đồ** | Đồ đã qua tay mấy người, dùng bao lâu, có từng bị báo mất/gian lận không: người mua chỉ biết qua lời kể |
| Giao dịch thiếu thuận tiện | Hai bên tự nhắn tin, thương lượng, hẹn địa điểm và thời gian |
| Thiếu lịch sử giao dịch | Không có nơi thống nhất theo dõi giao dịch và đánh giá người dùng |
| Chưa có nền tảng tập trung | Chưa có nơi dành riêng cho cộng đồng sinh viên, gắn với trường/KTX |

> **Lưu ý (giả thuyết cần kiểm chứng):** các vấn đề trên là giả thuyết ban đầu. Trước khi xây dựng nên phỏng vấn 8–15 sinh viên (cả người mua lẫn người bán) và khảo sát các nhóm Facebook hiện có để xác nhận mức độ đau thực tế (xem mục 12, Giai đoạn 0). Riêng nhu cầu "xem lịch sử món đồ" cần hỏi trực tiếp: người mua có thật sự quan tâm không, với nhóm đồ nào.

### 1.2. Bối cảnh cạnh tranh

| Kênh hiện tại | Ưu điểm | Hạn chế đối với sinh viên |
|---|---|---|
| Nhóm Facebook/Zalo "pass đồ sinh viên" | Miễn phí, đông người, quen thuộc | Bài trôi nhanh, không lọc được, khó kiểm chứng người bán, không có lịch sử món đồ |
| Facebook Marketplace | Quy mô lớn | Không đặc thù sinh viên, nhiều tin rác, khó lọc theo khu vực nhỏ như KTX |
| Chợ Tốt và các sàn tổng hợp | Nhiều người dùng, tìm kiếm tốt | Cộng đồng đại trà, không xác minh sinh viên, ít gắn với trường |

**Câu hỏi cốt lõi UniCycle phải trả lời:** vì sao sinh viên chuyển từ một nơi miễn phí, quen thuộc sang nền tảng mới? Câu trả lời nằm ở phần định vị (mục 2.1).

### 1.3. Giá trị mang lại

| Người mua | Người bán |
|---|---|
| Tiết kiệm chi phí | Thanh lý đồ không còn dùng |
| Dễ tìm đúng món theo trường/KTX/giá | Tiếp cận đúng nhóm khách hàng cùng trường/KTX |
| Có thông tin để đánh giá sản phẩm và người bán | Không cần rải tin ở nhiều nhóm Facebook trôi bài |
| Biết người bán là sinh viên có huy hiệu xác minh | Xây dựng uy tín sinh viên qua các giao dịch hoàn tất |
| **Xem được lịch sử chuyển giao của món đồ (Product Passport)** | **Món đồ có lịch sử rõ ràng dễ bán hơn, giá tốt hơn** |
| Chủ động chọn địa điểm giao nhận (cổng trường, KTX) | Chủ động thời gian, giá và liên hệ nhanh qua Zalo |

**Giá trị cho cộng đồng:** tái sử dụng đồ dùng, giảm lãng phí, giảm chi phí sinh hoạt, kết nối sinh viên.

### 1.4. Bốn giá trị cốt lõi

1. **Cost Saving – Tiết kiệm:** tiếp cận đồ cũ giá hợp ngân sách.
2. **Convenience – Tiện lợi:** tìm, đăng, hẹn và quản lý giao dịch ở một nơi; đăng bán trong dưới 60 giây.
3. **Trust & Transparency – Tin cậy & minh bạch:** người dùng đăng nhập dễ dàng qua Google, xác minh danh tính sinh viên nhận huy hiệu; uy tín dựa trên giao dịch hoàn tất trực tiếp; **mỗi món đồ có "hộ chiếu số" (Product Passport) ghi lại chuỗi chủ sở hữu (Chủ #1 → #2 → #3) kèm mã QR màn hình**.
4. **Sustainability – Bền vững:** kéo dài vòng đời sản phẩm; lịch sử đồ vật khuyến khích tái sử dụng nhiều vòng qua các thế hệ sinh viên.

> **Lộ trình công nghệ:** Ở giai đoạn MVP, Product Passport được quản lý tập trung và lưu trữ minh bạch trong cơ sở dữ liệu (Off-chain) để đảm bảo tốc độ và trải nghiệm mượt mà không rào cản. Khi hệ thống đã vận hành ổn định, UniCycle sẽ tích hợp **Avalanche C-Chain (P1)** để neo (anchor) và xác thực bất biến chuỗi chuyển giao quyền sở hữu lên blockchain.

---

## 2. Định vị, người dùng & chỉ số thành công

### 2.1. Câu định vị

> **UniCycle là chợ đồ cũ dành riêng cho sinh viên: đăng nhập nhanh với Google, kết nối trao đổi tức thì qua Zalo, tìm theo trường/ký túc xá, đăng bán trong 60 giây, và mỗi món đồ có lịch sử chuyển giao số (Product Passport) rõ ràng.**

Bốn điểm khác biệt so với kênh hiện tại:
1. **Cộng đồng sinh viên thân thiện & xác minh** (đăng nhập Google, huy hiệu SV xác minh qua thẻ/email).
2. **Gắn với địa điểm** (trường, KTX, làng đại học) để giao nhận nhanh, an toàn tận tay.
3. **Uy tín có cấu trúc** (đánh giá blind hai chiều hoàn tất trong 48 giờ).
4. **Lịch sử đồ vật (Digital Product Passport)**: biết món đồ đã qua tay những ai, kế thừa hồ sơ bán lại trong 1 chạm. Ở giai đoạn sau sẽ được bảo chứng bất biến trên blockchain.

### 2.2. Đối tượng sử dụng

UniCycle hướng đến sinh viên TP.HCM. Một tài khoản có thể vừa mua vừa bán.

**Persona 1 – Minh, sinh viên năm 1 ở KTX (Buyer chính)**
- Cần giáo trình, quạt, bàn học nhỏ, đồ dùng KTX với ngân sách thấp.
- Nỗi đau: lướt nhiều nhóm, sợ mua phải đồ hỏng hoặc đồ có nguồn gốc không rõ, ngại gặp người lạ.
- Mong muốn: lọc theo KTX/giá, thấy người bán là sinh viên thật, xem món đồ đã qua mấy chủ, hẹn gặp ngay tại trường.

**Persona 2 – Lan, sinh viên năm cuối chuẩn bị tốt nghiệp (Seller chính)**
- Có nhiều đồ cần thanh lý nhanh: sách, bàn ghế, đồ điện tử.
- Nỗi đau: phải đăng nhiều nhóm, nhiều người hỏi nhưng ít người thật sự mua, mất thời gian.
- Mong muốn: đăng nhanh bằng điện thoại, đánh dấu đã bán, món đồ có lịch sử rõ ràng giúp người mua tin hơn.

**Nhu cầu chính:**

| Vai trò | Nhu cầu |
|---|---|
| Buyer | Tìm sản phẩm; so sánh giá/tình trạng; xem hồ sơ và đánh giá người bán; **xem lịch sử chuyển giao món đồ**; hẹn giao nhận; kiểm tra rồi thanh toán trực tiếp |
| Seller | Đăng bán dễ dàng; tiếp cận người mua tiềm năng; chủ động giá và giao nhận; quản lý yêu cầu; xây dựng uy tín; **bán lại món đồ đã mua với lịch sử được kế thừa** |

### 2.3. Chỉ số thành công (KPI) cho giai đoạn pilot

| Chỉ số | Mục tiêu gợi ý (1 trường, 8 tuần đầu) |
|---|---|
| Số người dùng đã xác minh | 300+ |
| Số tin đăng đang hoạt động | 150+ |
| Tỷ lệ tin có ít nhất 1 liên hệ/yêu cầu | ≥ 50% |
| Tỷ lệ yêu cầu dẫn đến giao dịch hoàn tất | ≥ 25% |
| Thời gian trung bình từ đăng đến bán | ≤ 10 ngày |
| Tỷ lệ người dùng quay lại sau 30 ngày | ≥ 30% |
| Tỷ lệ tin bị báo cáo vi phạm | < 3% |
| **Tỷ lệ tin đăng có bật Digital Passport** | **≥ 40%** |
| **So sánh tỷ lệ liên hệ/bán: tin có passport vs không có** | **Tin có passport không thấp hơn; kỳ vọng cao hơn** |
| **Số món đồ đã có ≥ 2 lần chuyển giao (bán lại)** | **≥ 10** |
| **Tỷ lệ liên hệ qua Zalo / Gửi yêu cầu thành công** | **≥ 95%** |

> Các con số là mục tiêu gợi ý; điều chỉnh sau khi có dữ liệu thực tế của pilot.
