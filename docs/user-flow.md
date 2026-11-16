## 5. Luồng người dùng (User Flow)

### 5.1. Luồng người mua (Buyer Flow)

**Mục tiêu:** tìm và mua được món đồ phù hợp.

**Luồng chính (happy path):**

1. Truy cập UniCycle (không cần đăng nhập).
2. Duyệt danh sách hoặc tìm kiếm/lọc theo danh mục, giá, tình trạng, khu vực KTX/trường, "có lịch sử đồ vật".
3. Mở chi tiết sản phẩm; xem ảnh, mô tả, hồ sơ người bán (đánh giá sao, huy hiệu sinh viên xác minh), tóm tắt Digital Passport.
4. **Lựa chọn cách thức liên hệ**:
   - **Cách 1 (Nhanh nhất - Nhắn Zalo)**: Bấm "Nhắn qua Zalo" → (nếu chưa đăng nhập: popup đăng nhập Google 1 chạm, hệ thống tự động quay lại `returnTo`) → mở Zalo qua route trung gian bảo mật `/api/zalo/[listingId]` với tin nhắn mẫu sẵn để trao đổi ngay.
   - **Cách 2 (Đặt lịch hẹn giữ đồ)**: Bấm "Đặt lịch hẹn xem hàng" → (nếu chưa đăng nhập: popup đăng nhập Google 1 chạm, hệ thống tự động quay lại `returnTo`) → Điền giá đề xuất, chọn địa điểm (cổng trường/KTX), khung giờ hẹn và gửi yêu cầu (`PENDING`).
   - 💡 **Tránh rò rỉ giao dịch ngoài hệ thống**: Khi hai bên đã chốt thỏa thuận qua Zalo, hệ thống hiển thị banner nhắc: *"Đã chốt qua Zalo? Hãy xác nhận đặt hẹn trên UniCycle để bảo lưu đánh giá uy tín và nhận Product Passport"*. Người bán có nút **"Gửi lời mời chốt bán"** (tạo link/QR dùng 1 lần theo BR38) gửi qua Zalo cho người mua bấm "Xác nhận mua", đưa sản phẩm vào trạng thái `RESERVED` ngay lập tức.
5. Người bán chấp nhận lịch hẹn → Trạng thái đơn `ACCEPTED`, sản phẩm tự động chuyển `RESERVED` (giữ chỗ).
6. Hai bên gặp mặt tại nơi hẹn công cộng (cổng KTX, căng tin, thư viện trường), kiểm tra sản phẩm (**có thể quét mã QR số trên màn hình điện thoại hoặc mở link `/passport/[id]` để đối chiếu**), thanh toán trực tiếp.
7. Người mua bấm "Đã nhận hàng"; người bán bấm "Đã bàn giao".
8. Đơn `COMPLETED`; hai bên được mời đánh giá bí mật (blind review) trong vòng **48 giờ**.
9. **Món đồ tự động chuyển vào mục "Đồ của tôi" của người mua; timeline Digital Passport cập nhật chủ mới (Chủ #1 → Chủ #2) trong cơ sở dữ liệu (và sẵn sàng ghi lên Avalanche ở P1).**

**Luồng ngoại lệ:**

| Tình huống | Xử lý |
|---|---|
| Người bán từ chối | Người mua nhận thông báo, có thể gửi yêu cầu cho sản phẩm khác |
| Người bán không phản hồi 48 giờ | Yêu cầu `PENDING` thành `EXPIRED`, sản phẩm trở về trạng thái có sẵn |
| Cả hai im lặng sau giờ hẹn (`meet_time` + 24h) | Áp dụng BR37: Đơn `ACCEPTED` tự động `EXPIRED`, sản phẩm tự động nhả `RESERVED` quay về `AVAILABLE` |
| Người mua bấm "Tôi chưa nhận hàng" trong 48h | Ngay lập tức chặn auto-complete, đơn chuyển `DISPUTED`, thông báo cho Admin can thiệp xử lý (BR13) |
| Sản phẩm đã `RESERVED` bởi người khác | Hiển thị trạng thái đã giữ; người mua khác không thể gửi trùng lịch |
| Sản phẩm không đúng mô tả khi gặp | Người mua từ chối nhận, hủy đơn kèm lý do; có thể báo cáo tin |
| Thông tin không khớp passport | Người mua từ chối nhận hàng, báo cáo; admin có thể flag passport (BR32) |
| Một bên không đến buổi hẹn | Bên còn lại bấm "Không gặp được"; ghi nhận no-show, sản phẩm trở về `AVAILABLE` |
| Một bên đã bấm xác nhận nhưng bên kia im lặng | Áp dụng BR13: Tự động hoàn tất đơn (`AUTO_COMPLETED`) sau **48 giờ** |

### 5.2. Luồng người bán (Seller Flow)

**Mục tiêu:** đăng bán và thanh lý nhanh một món đồ.

**Luồng chính:**

1. Đăng nhập (qua tài khoản Google hoặc Email).
2. Bấm "Đăng bán" (truy cập form tối ưu dưới 60 giây).
3. Chụp/chọn ảnh thật từ điện thoại (tối đa 5 ảnh, tự nén phía client), nhập tên món đồ, danh mục, giá (hoặc chọn "Tặng 0đ"), tình trạng, mô tả ngắn, khu vực KTX/trường; điền số điện thoại Zalo.
4. **Bật "Tạo lịch sử đồ vật (khuyến nghị)". Hệ thống cấp mã định danh và mã QR số hiển thị trực tiếp trên web/app (không bắt buộc in dán vật lý lên đồ).**
5. Bấm Đăng bán; tin hiển thị công khai ngay lập tức.
6. Nhận trao đổi từ người mua:
   - Nhận tin nhắn trực tiếp qua Zalo (người mua bấm link mở thẳng app Zalo).
   - Nhận thông báo yêu cầu hẹn xem hàng trên UniCycle.
   - 💡 **Chốt bán cho khách Zalo (BR38)**: Nếu người mua chỉ nhắn Zalo mà chưa bấm hẹn trên web, người bán bấm **"Gửi lời mời chốt bán"** để tạo link/QR dùng 1 lần (hạn 24 giờ) gửi qua Zalo. Khi người mua đăng nhập và bấm "Xác nhận mua", đơn tự động chuyển `ACCEPTED` và listing chuyển `RESERVED` ngay lập tức, đảm bảo giao dịch không bị rơi khỏi hệ thống.
7. Xem danh sách yêu cầu `PENDING`, chọn chấp nhận 1 yêu cầu phù hợp → sản phẩm chuyển `RESERVED`.
8. Gặp mặt tại địa điểm hẹn ở trường/KTX, bàn giao đồ và nhận tiền trực tiếp.
9. Bấm "Đã bàn giao" → hoàn tất khi người mua bấm xác nhận (hoặc tự hoàn tất sau 48h theo BR13).
10. Nộp đánh giá người mua trong 48 giờ; nhận đánh giá đối ứng.
11. Sản phẩm chuyển `SOLD`; Digital Passport tự động cập nhật chuyển giao quyền sở hữu cho người mua mới.

**Tính năng hỗ trợ:** Đánh dấu đã bán thủ công (nếu có passport thì dùng "Gửi lời mời chốt bán" để chuyển giao đúng chủ; tính năng Chuyển quyền trực tiếp không qua tin đăng sẽ có ở P1), Đăng lại, Tạm ẩn, Gia hạn tin.

**Luồng ngoại lệ:** nhiều yêu cầu cùng lúc (BR11); người mua không đến; đổi giá khi đã có yêu cầu (BR22); tin hết hạn (BR15) → nhắc gia hạn qua email.

### 5.3. Luồng đánh giá & xây dựng uy tín

1. Giao dịch hoàn tất trực tiếp tại trường/KTX.
2. Người mua xác nhận đã nhận hàng; người bán xác nhận đã bàn giao.
3. Hệ thống kiểm tra: cả hai đã xác nhận → `COMPLETED`; chỉ một bên và quá **48 giờ** → `AUTO_COMPLETED` (BR13).
4. Mở cửa sổ đánh giá bí mật trong **48 giờ** cho cả hai (BR08, BR09).
5. Mỗi bên nộp đánh giá **mà không thấy đánh giá của bên kia** (blind review).
6. Khi cả hai đã nộp (hoặc sau 48 giờ), đánh giá được hiển thị công khai (BR14).
7. Hệ thống cập nhật điểm uy tín sinh viên và lịch sử giao dịch (BR23).
8. (P1) Gom các đánh giá thành lô, neo Merkle root lên Avalanche C-Chain.

### 5.4. Luồng báo cáo & kiểm duyệt

1. Người dùng bấm "Báo cáo" trên tin/hồ sơ/passport, chọn lý do.
2. Báo cáo vào hàng đợi admin.
3. Admin xem xét: bỏ qua / ẩn tin / cảnh cáo / khóa tài khoản / **flag passport**.
4. Người báo cáo và người bị báo cáo được thông báo kết quả (không tiết lộ danh tính người báo cáo).

### 5.5. Luồng vòng đời Passport (ví dụ: chị A → anh B → mình)

**Bối cảnh:** chị A mua một chiếc quạt, dùng hai năm, bán cho anh B; anh B dùng một học kỳ rồi bán lại cho bạn (người dùng C).

| Bước | Hành động | Ghi nhận |
|---|---|---|
| 1 | A đăng bán, bật passport; hệ thống tạo `passport_id` và mã QR số trên màn hình | Off-chain: passport ở trạng thái `ACTIVE`, chủ #1 = A |
| 2 | B liên hệ qua Zalo hoặc gửi yêu cầu hẹn, A chấp nhận; hai bên gặp mặt và cùng bấm xác nhận → đơn `COMPLETED` | Hệ thống cập nhật quyền sở hữu trong CSDL (và xếp hàng ghi chain ở P1) |
| 3 | Chuyển giao hoàn tất: chủ hiện tại chuyển sang B | CSDL ghi nhận sự kiện chuyển giao #1 (Chủ #1 ➔ Chủ #2); ở P1 Relayer sẽ gọi hợp đồng trên Avalanche |
| 4 | Quạt xuất hiện trong mục "Đồ của tôi" của B; trang `/passport/[id]` hiển thị: Chủ #1 → Chủ #2 (B) | Hiển thị timeline minh bạch |
| 5 | B bấm "Bán lại" → tin mới được tạo sẵn, kế thừa passport; người xem thấy lịch sử A → B | BR25: chỉ B được bán |
| 6 | C mua từ B, hai bên xác nhận | CSDL ghi nhận chuyển giao #2 (Chủ #2 ➔ Chủ #3) |
| 7 | Trang passport hiển thị: **Chủ #1 → Chủ #2 → Chủ #3 (bạn)**, mỗi bước có thời điểm, mức xác nhận | Tên hiển thị chỉ hiện nếu chủ đó đồng ý (BR29); ở P1 có link tx explorer |

**Hiển thị mẫu trên trang xác minh:**

```
Hộ chiếu đồ vật · Quạt đứng Senko (mã #8f3a…c21)
Trạng thái: Hợp lệ · 2 lần chuyển giao · Chủ hiện tại: Chủ #3

●  Chủ #1 · ĐH Bách Khoa · 06/2024        (Đăng ký passport)
│   └─ Chuyển giao #1 · 09/2025 · Hai bên xác nhận · tx 0x91c…ab2 ↗
●  Chủ #2 · ĐH Khoa học Tự nhiên · 09/2025
│   └─ Chuyển giao #2 · 02/2026 · Hai bên xác nhận · tx 0x5de…f07 ↗
●  Chủ #3 · ĐH Kinh tế · 02/2026           (Chủ hiện tại)

[Xác minh trên blockchain]  → (Tính năng P1: so khớp dữ liệu hiển thị với sự kiện trên Avalanche)
Lưu ý: 
- Passport ghi nhận chuỗi chuyển giao, không chứng nhận chất lượng hay tính xác thực món đồ.
- Các liên kết giao dịch blockchain (tx 0x... ↗) chỉ xuất hiện từ giai đoạn P1 khi kích hoạt Avalanche C-Chain; ở MVP, timeline hiển thị bản ghi đã lưu trữ trong CSDL hệ thống.
```

### 5.6. Luồng chuyển quyền trực tiếp (không qua yêu cầu mua - P1)

**Dùng khi:** tặng bạn bè, trao đổi ngoài hệ thống, chuyển lại cho người quen.

1. Chủ hiện tại vào "Đồ của tôi" → chọn món → "Chuyển quyền".
2. Hệ thống tạo mã/QR chuyển quyền có hạn 24 giờ.
3. Người nhận (đã có tài khoản xác minh) quét mã hoặc nhập mã → xem thông tin → "Chấp nhận".
4. Cả hai đã xác nhận → hệ thống cập nhật chuyển quyền trong CSDL (không có giá, loại "chuyển quyền trực tiếp") và đồng bộ lên chain ở P1.

**Ngoại lệ:** mã hết hạn; người nhận chưa có tài khoản; người chuyển hủy trước khi nhận chấp nhận.

### 5.7. Luồng ngoại lệ cho Passport

| Tình huống | Xử lý |
|---|---|
| Tx ghi chain thất bại/chậm (ở P1) | Đơn vẫn `COMPLETED`; passport hiển thị "Đang ghi lên blockchain…"; hệ thống thử lại tự động; quá 3 lần → cảnh báo admin (BR28) |
| Người đăng không phải chủ hiện tại | Hệ thống chặn đăng (BR25), hướng dẫn dùng "Chuyển quyền" hoặc liên hệ hỗ trợ |
| Món đồ bị bán ngoài hệ thống | Chủ cũ dùng "Gửi lời mời chốt bán" (BR38) gửi link cho người mua xác nhận để cập nhật đúng chuỗi passport (hoặc dùng Chuyển quyền trực tiếp ở P1) |
| Passport bị flag | Tin đăng bị ẩn (`HIDDEN`), đơn đang xử lý chuyển `DISPUTED` hoặc `REJECTED` (BR39), các bên liên quan được thông báo |
| Quên/cần hiển thị lại mã QR | Chủ hiện tại mở lại mã QR số bất kỳ lúc nào từ mục "Đồ của tôi" trên điện thoại |
| Chủ hiện tại xóa tài khoản | Áp dụng BR34: Passport của món đồ tự động chuyển sang trạng thái `ARCHIVED_OWNER_DELETED` (lưu trữ đóng băng), chặn tạo tin bán lại cho đến khi liên hệ Admin hỗ trợ |
| Xem passport khi chưa đăng nhập | Cho phép (trang công khai) |
