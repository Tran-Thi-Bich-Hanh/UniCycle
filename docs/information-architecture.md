## 6. Kiến trúc thông tin (Information Architecture)

### 6.1. Sơ đồ cấu trúc website

```
UniCycle
├── Khám phá (công khai)
│   ├── Trang chủ
│   ├── Danh sách sản phẩm / Tìm kiếm / Bộ lọc
│   ├── Danh mục
│   ├── Chi tiết sản phẩm (kèm tóm tắt lịch sử)
│   └── Trang xác minh Passport (/passport/[id])
├── Đăng bán (cần đăng nhập)
│   ├── Đăng sản phẩm (tùy chọn bật Passport)
│   └── Sản phẩm của tôi (sửa, ẩn, đã bán, đăng lại)
├── Hoạt động (cần đăng nhập)
│   ├── Yêu cầu đã gửi / Yêu cầu nhận được
│   ├── Chi tiết đơn & xác nhận hoàn tất
│   └── Tin nhắn (P1)
├── Tài khoản (cần đăng nhập)
│   ├── Hồ sơ, đánh giá, lịch sử giao dịch
│   ├── Đồ của tôi (passport, QR, bán lại; chuyển quyền trực tiếp P1)
│   ├── Yêu thích (P1)
│   ├── Thông báo
│   └── Cài đặt (quyền riêng tư lịch sử: hiển thị tên hay ẩn danh)
```

### 6.2. Danh sách trang (Pages) và phân quyền

| Route | Nội dung | Quyền | Giai đoạn |
|---|---|---|---|
| `/` | Trang chủ, tin nổi bật, danh mục | Công khai | MVP |
| `/products` | Danh sách, lọc, sắp xếp theo trường/KTX | Công khai | MVP |
| `/search?q=` | Kết quả tìm kiếm | Công khai | MVP |
| `/categories/[slug]` | Sản phẩm theo danh mục | Công khai | MVP |
| `/products/[id]` | Chi tiết sản phẩm, tóm tắt Digital Passport, nút "Nhắn Zalo", nút "Đặt lịch hẹn", báo cáo | Công khai (khách bấm hành động sẽ được yêu cầu đăng nhập, rồi tự quay lại) | MVP |
| **`/passport/[id]`** | **Timeline chuyển giao số, mã QR số hiển thị màn hình, tuyên bố giới hạn (xác minh on-chain ở P1)** | **Công khai** | **MVP** |
| `/users/[id]` | Hồ sơ công khai: tên hiển thị, trường, huy hiệu xác minh SV, uy tín, tin đang bán | Công khai | MVP |
| `/login`, `/register` | Đăng nhập Google (OAuth) & Email | Khách | MVP |
| `/verify-student` | Upload thẻ sinh viên hoặc nhập email trường để nhận huy hiệu SV | Đăng nhập | MVP |
| `/sell` | Form đăng bán nhanh < 60s (+ SĐT Zalo, bật Digital Passport) | Đăng nhập | MVP |
| `/my-products` | Quản lý tin của tôi (sửa, ẩn, đã bán, gia hạn) | Đăng nhập | MVP |
| **`/my-items`, `/my-items/[id]`** | **Đồ của tôi: passport, mã QR số màn hình, Bán lại 1-chạm** | **Đăng nhập** | **MVP** |
| `/orders` | Quản lý lịch hẹn mua và bán | Đăng nhập | MVP |
| `/orders/[id]` | Chi tiết hẹn, trạng thái giữ đồ, xác nhận bàn giao (chu kỳ 48h), nút khiếu nại "Tôi chưa nhận hàng" (chặn auto-complete), đánh giá bí mật | Người tham gia đơn | MVP |
| `/api/zalo/[listingId]` | Route trung gian điều hướng mở Zalo (chống thu thập SĐT hàng loạt, có rate limit) | Đăng nhập; khách bị chuyển tới `/login?returnTo=...` | MVP |
| `/invites/[code]` | Người mua xem và bấm "Xác nhận mua" từ lời mời chốt bán qua Zalo (BR38) | Đăng nhập; khách bị chuyển tới `/login?returnTo=...` | MVP |
| **`/transfer/[code]`** | **Người nhận xem và chấp nhận chuyển quyền trực tiếp (P1)** | **Đăng nhập** | **P1** |
| `/notifications` | Thông báo đơn hẹn và hệ thống | Đăng nhập | MVP |
| `/profile`, `/settings` | Hồ sơ cá nhân, cài đặt riêng tư số điện thoại | Đăng nhập | MVP |
| `/terms`, `/privacy` | Điều khoản, riêng tư, hướng dẫn giao dịch an toàn | Công khai | MVP |
| `/messages`, `/messages/[id]` | Chat realtime nội bộ (Supabase Realtime) | Đăng nhập | P1 |
| `/favorites` | Tin yêu thích (Wishlist) | Đăng nhập | P1 |
| `/admin/*` | Người dùng, sản phẩm, báo cáo, giải quyết khiếu nại đơn, passport flag | Admin | MVP (tối thiểu) → P1 |

### 6.3. Điều hướng (ưu tiên mobile)

Thanh điều hướng dưới (bottom nav), 5 mục chuẩn: **Trang chủ · Khám phá · Đăng tin (+) · Đơn hẹn · Tài khoản** (đồng bộ 100% với `ui-ux.md`). "Đồ của tôi" nằm trong mục Tài khoản, đồng thời có lối tắt từ thông báo đơn hàng hoàn tất.

### 6.4. Đường đi tiêu biểu

- **Mua:** Trang chủ → Danh sách → Chi tiết → Nhắn Zalo hoặc Gửi yêu cầu hẹn → Chi tiết đơn → Xác nhận hoàn tất (48h) → Đánh giá → Đồ của tôi.
- **Bán:** Đăng bán (< 60s, bật passport, nhập Zalo) → Sản phẩm của tôi → Nhận tin Zalo / Duyệt yêu cầu hẹn → Chi tiết đơn → Xác nhận bàn giao → Đánh giá.
- **Bán lại:** Đồ của tôi → Bán lại (1-click) → Tin kế thừa passport → …
- **Quét QR:** Quét mã QR số trên màn hình điện thoại → `/passport/[id]`.

### 6.5. Riêng tư hồ sơ công khai và passport

Hiển thị: tên hiển thị, ảnh đại diện, trường, điểm uy tín, số giao dịch hoàn tất, tin đang bán. **Không** hiển thị: email, số điện thoại, MSSV. Thông tin liên lạc chỉ chia sẻ khi người bán chấp nhận yêu cầu (hoặc theo lựa chọn của họ). Trên passport, chủ sở hữu hiển thị ẩn danh theo mặc định (BR29).