## 3. Phân tích yêu cầu (Requirement Analysis)

### 3.1. Nhóm chức năng

| Nhóm | Chức năng cụ thể |
|---|---|
| Tài khoản | Đăng nhập Google (OAuth), đăng ký/đăng nhập email, hồ sơ cá nhân, chọn trường/KTX, xác minh sinh viên (thẻ SV/email trường) để nhận huy hiệu |
| Sản phẩm | Đăng bán nhanh (< 60s), sửa, ẩn/xóa, đánh dấu đã bán, đăng lại, xem chi tiết, quản lý sản phẩm của tôi |
| Tìm kiếm | Danh sách, tìm kiếm (hỗ trợ tiếng Việt có/không dấu), lọc theo danh mục/giá/tình trạng/khu vực/có passport/cho tặng 0đ, sắp xếp |
| Liên hệ & Giao dịch | **Nút liên hệ Zalo (Deep link `zalo.me/<sdt>`), Form gửi yêu cầu mua/hẹn xem hàng tại trường/KTX, chấp nhận/từ chối, giữ chỗ (RESERVED), timeout đơn hẹn sau `meet_time + 24h`, xác nhận hoàn tất (chu kỳ 48h), khiếu nại "Tôi chưa nhận hàng", hủy** |
| Đánh giá & uy tín | Đánh giá hai chiều (blind review 48h), lịch sử giao dịch, điểm uy tín sinh viên |
| **Lịch sử đồ vật (Digital Passport)** | **Bật passport khi đăng bán, mã QR số hiển thị màn hình, timeline lịch sử (Chủ #1 → #2 → #3) lưu Database (Off-chain), trang xác minh `/passport/[id]`, "Đồ của tôi", bán lại kế thừa lịch sử (Chuyển quyền trực tiếp ở P1)** |
| An toàn & kiểm duyệt | Báo cáo tin/người dùng, ẩn tin, khóa tài khoản, đánh dấu (flag) passport nghi vấn |
| Thông báo | Email/thông báo trong ứng dụng khi có yêu cầu hẹn, thay đổi trạng thái đơn |

### 3.2. Mức độ ưu tiên

#### P0 – Bắt buộc cho MVP (Tập trung Web-First & Tiện lợi tối đa)

| Chức năng | Lý do |
|---|---|
| Đăng nhập Google (OAuth) + email/mật khẩu thông thường | Giảm ma sát tối đa, sinh viên có thể đăng nhập ngay trong 1 click |
| Xác minh sinh viên nhận Huy hiệu uy tín (thẻ SV / email trường) | Tạo độ tin cậy giữa sinh viên mà không chặn người dùng mới đăng bán |
| Đăng bán siêu tốc dưới 60 giây (ảnh, giá, danh mục, tình trạng, khu vực KTX) | Tạo nguồn cung nhanh chóng, thân thiện trên mobile |
| Duyệt/tìm kiếm/lọc **không cần đăng nhập** | Giảm rào cản, tối ưu SEO và dễ dàng chia sẻ link lên Facebook/Zalo |
| Chi tiết sản phẩm + hồ sơ người bán (đánh giá, trường, huy hiệu xác minh) | Cung cấp đầy đủ thông tin minh bạch trước khi giao dịch |
| **Nút "Nhắn qua Zalo" (Deep link qua route trung gian bảo mật)** | **Kênh trao đổi chính tức thì của sinh viên VN; sau 1 lần đăng nhập Google, tự quay lại luồng đang làm; kèm tin nhắn mẫu và QR Zalo trên desktop** |
| **Nút "Đặt lịch hẹn xem hàng" (Form chọn giờ, địa điểm KTX/cổng trường)** | **Ghi nhận đơn trên hệ thống, đề xuất giá, theo dõi lịch hẹn giao dịch trao tay** |
| Đặt giữ chỗ (`RESERVED`) → Đã bán (`SOLD`) | Quản lý trạng thái giao dịch rõ ràng, tránh bán trùng cho nhiều người |
| Xác nhận hoàn tất + đánh giá hai chiều blind (chu kỳ 48 giờ) | Tự hoàn tất sau 48h nếu 1 bên im lặng; đánh giá bí mật chống trả đũa |
| **Hệ thống Lịch sử đồ vật (Digital Passport - Lưu Database Off-chain)** | **Tạo "danh tính" cho món đồ; timeline trực quan Chủ #1 → #2; mã QR số trên màn hình (không bắt in dán)** |
| **Trang xác minh công khai `/passport/[id]`** | **Người mua dễ dàng kiểm chứng toàn bộ chuỗi đời chủ của món đồ** |
| **"Đồ của tôi" + nút "Bán lại" (Resell 1-click) kế thừa passport** | **Giữ vững vòng đời món đồ qua các thế hệ sinh viên; không cần nhập lại tin từ đầu** |
| Báo cáo vi phạm tối thiểu + Admin ẩn tin / flag đồ nghi vấn | Bảo vệ cộng đồng, ngăn chặn hàng giả, hàng gian lận |
| Điều khoản sử dụng, chính sách riêng tư & lưu ý an toàn giao dịch | Minh bạch pháp lý, hướng dẫn sinh viên giao dịch an toàn tại nơi công cộng |

#### P1 – Tích hợp sau khi web MVP ổn định

- **Tích hợp Blockchain (Avalanche C-Chain)**:
  - Triển khai Smart contract Passport trên Fuji testnet → Mainnet.
  - Relayer tự động serialize giao dịch và ghi chuỗi chuyển giao lên chain khi đơn hoàn tất.
  - Nút "Xác minh trên blockchain" so khớp dữ liệu DB với on-chain RPC.
- Tính năng **Chuyển quyền trực tiếp (Direct Transfer)** qua mã QR số 24h.
- Chat trực tiếp realtime trong website (sử dụng Supabase Realtime).
- Lưu yêu thích (wishlist), Push notification trên mobile web.
- Neo (anchor) hash đánh giá/uy tín lên Avalanche theo lô (Merkle root).
- Xác minh số Serial/IMEI cho đồ công nghệ giá trị cao (Laptop, Casio 580, xe máy).
- Trang quản trị (Admin Dashboard) mở rộng đầy đủ nghiệp vụ.

#### P2 – Phát triển nâng cao

- Smart Escrow cho giao dịch từ xa/giao hàng liên trường.
- Ví nhúng (Embedded Wallet) cho phép sinh viên tự ký xác nhận chuyển giao trên chain.
- Mở rộng đa trường, liên kết các trạm bảo dưỡng/sửa chữa thiết bị sinh viên.

> Với mô hình gặp mặt, kiểm hàng rồi thanh toán trực tiếp, Smart Escrow **không bắt buộc** ở các phiên bản đầu. Thanh toán không đi qua blockchain.

## 10. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| Hiệu năng | Trang danh sách tải dưới 3 giây trên 4G; ảnh lazy-load, thumbnail; trang passport hiển thị từ DB, kiểm chứng on-chain là hành động riêng (không làm chậm tải trang) |
| Mobile-first | Thiết kế ưu tiên điện thoại; đăng bán dưới 60s, xem passport và hiển thị/quét QR màn hình hoàn chỉnh trên mobile |
| Bảo mật | Băm mật khẩu, HTTPS, rate limit đăng nhập/gửi yêu cầu, chống CSRF/XSS, kiểm tra quyền ở mọi endpoint (BR03, BR04, BR25) |
| **Bảo mật blockchain** | **Khóa relayer trong secret manager/KMS, không đưa vào mã nguồn; quyền `RECORDER_ROLE` chỉ cấp cho relayer; tách khóa admin và khóa relayer; giới hạn số tx/phút; kiểm thử hợp đồng (unit test + review) trước khi lên mainnet** |
| Quyền riêng tư | Tối thiểu hóa dữ liệu hiển thị; không công khai email/SĐT/MSSV; tự động xóa vĩnh viễn ảnh thẻ sinh viên sau khi duyệt; cho phép xóa tài khoản (crypto-shredding); không ghi dữ liệu cá nhân lên blockchain (BR27); pseudonym ngẫu nhiên theo từng món đồ. Tuân thủ Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân hiện hành |
| Tìm kiếm | Hỗ trợ tiếng Việt có/không dấu, sai chính tả nhẹ |
| SEO & chia sẻ | Trang sản phẩm và passport có metadata, Open Graph để chia sẻ đẹp lên Facebook/Zalo |
| Khả năng truy cập | Tương phản đủ, nhãn cho form, điều hướng bàn phím |
| Độ tin cậy | Sao lưu CSDL định kỳ; job nền idempotent; **ghi chain bất đồng bộ có retry, không chặn nghiệp vụ chính (BR28); DB là nguồn dữ liệu chính, chain là bằng chứng đối chiếu** |
| Pháp lý | Điều khoản, chính sách riêng tư (nêu rõ dữ liệu on-chain là bất biến), danh mục hàng cấm; kiểm tra quy định về thương mại điện tử và bảo vệ dữ liệu cá nhân hiện hành trước khi vận hành thật (không thay thế tư vấn pháp lý) |
