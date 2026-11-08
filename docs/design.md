# UniCycle – Hệ Thống Thiết Kế (Design System & Guidelines)

Tài liệu này định nghĩa ngôn ngữ thiết kế, bảng màu, typography, quy chuẩn tương tác và các tokens giao diện cho **UniCycle** theo tiêu chuẩn **ui-ux-pro-max** (chuẩn WCAG 2.2 AA, độ tương phản tối thiểu 4.5:1, micro-interactions mượt mà).

---

## 1. Triết lý Thiết kế (Design Philosophy)

UniCycle là sàn thương mại điện tử C2C dành cho sinh viên kết hợp Web3/Blockchain. Vì vậy, phong cách thiết kế chủ đạo là **Trust & Vitality (Tin cậy & Trẻ trung)**:
- **Nền tảng trắng sáng (Clean & Focused)**: Giúp hình ảnh sản phẩm thực tế của sinh viên nổi bật, không gây rối mắt khi lướt tìm đồ cũ.
- **Hệ màu Xanh chủ đạo (Trust Blue Spectrum)**: Màu xanh dương đậm đại diện cho sự tin cậy, chính trực và an toàn trong giao dịch; màu xanh dương tươi (Royal Blue) tạo năng lượng công nghệ; xanh dương nhạt tạo bề mặt êm dịu.
- **Màu bổ trợ hài hòa (Harmonious Accents)**:
  - **Xanh bạc hà / Emerald (`#059669`)**: Đại diện cho kinh tế tuần hoàn, tính bền vững, trạng thái "Mới 99%" và thông báo thành công.
  - **Vàng ấm / Amber (`#D97706`)**: Đại diện cho trạng thái "Đang giữ chỗ", đồ cũ mức khá và cảnh báo giao dịch.
  - **Đỏ cam (`#DC2626`)**: Báo lỗi, xóa bài đăng, trạng thái đã bán/hủy.

---

## 2. Bảng Màu Chi Tiết (Color Palette & Tokens)

```
┌────────────────────────────────────────────────────────────────────────┐
│  HỆ THỐNG MÀU CHỦ ĐẠO UNICYCLE                                         │
├────────────────────────────────────────────────────────────────────────┤
│  [ Dark Blue ]    #1E3A8A / #1D4ED8   (Navy Trust - Header, Tiêu đề)   │
│  [ Royal Blue ]   #2563EB / #3B82F6   (Brand Primary - Nút bấm, Link)  │
│  [ Light Blue ]   #EFF6FF / #DBEAFE   (Soft Surface - Nền thẻ, Badge)  │
│  [ Emerald Mint ] #059669 / #10B981   (Eco/Success - Xác thực, Giá tốt)│
│  [ Warm Amber ]   #D97706 / #F59E0B   (Attention/Warning - Giữ chỗ)    │
│  [ Slate Pure ]   #0F172A / #475569   (Neutral Text & Crisp Borders)   │
│  [ Canvas White ] #FFFFFF / #F8FAFC   (Clean Background)               │
└────────────────────────────────────────────────────────────────────────┘
```

### Bảng Tokens CSS & Tailwind:

| Vai trò Token | Mã Hex | Tailwind Class | Mục đích sử dụng |
|---|---|---|---|
| **Primary (Brand Blue)** | `#2563EB` | `bg-blue-600`, `text-blue-600` | Nút bấm chính (CTA), link active, focus ring |
| **Primary Dark (Navy)** | `#1E3A8A` | `bg-blue-900`, `text-blue-950` | Tiêu đề chính H1/H2, thanh điều hướng top |
| **Primary Light (Sky)** | `#EFF6FF` | `bg-blue-50`, `border-blue-200` | Nền input, thẻ danh mục hover, pill badge |
| **Secondary (Cyan/Teal)** | `#0284C7` | `bg-sky-600`, `text-sky-700` | Nút phụ, icon sinh viên, đường dẫn phụ |
| **Success / Eco (Emerald)** | `#059669` | `bg-emerald-600`, `text-emerald-700`| Giá tiền niêm yết, tình trạng Like-New, Verify badge |
| **Warning (Amber)** | `#D97706` | `bg-amber-500`, `text-amber-800` | Trạng thái Đang giữ chỗ, lưu ý hẹn gặp |
| **Background (Canvas)** | `#F8FAFC` | `bg-slate-50` | Nền toàn trang, độ tương phản dịu mắt |
| **Card / Surface** | `#FFFFFF` | `bg-white` | Thẻ sản phẩm, khung form, modal |
| **Text Primary** | `#0F172A` | `text-slate-900` | Văn bản chính, đảm bảo độ tương phản > 7:1 |
| **Text Muted** | `#64748B` | `text-slate-500` | Phụ đề, thời gian đăng, mô tả ngắn |
| **Border Neutral** | `#E2E8F0` | `border-slate-200` | Viền thẻ, đường kẻ phân cách tinh tế |

---

## 3. Typography & Thang đo Phông chữ

- **Font Family**: System UI Sans-serif tối ưu (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`), giúp tải ngay lập tức không bị giật layout (zero CLS) và hoạt động offline ổn định.
- **Thang đo kích thước**:
  - **H1 (Display Hero)**: `text-3xl sm:text-5xl font-black tracking-tight`
  - **H2 (Section Heading)**: `text-xl sm:text-2xl font-extrabold text-slate-900`
  - **H3 (Card Title / Subhead)**: `text-sm sm:text-base font-bold text-slate-800`
  - **Body (Nội dung đọc)**: `text-xs sm:text-sm text-slate-600 leading-relaxed`
  - **Caption / Meta**: `text-[11px] text-slate-400 font-medium`

---

## 4. Quy chuẩn Giao diện Form Xác thực (Login / Register / Logout UX)

Tuân thủ nguyên tắc **Accessible Authentication** từ `ui-ux-pro-max`:
1. **Không chặn Paste**: Người dùng được tự do dán mật khẩu từ Password Manager (Bitwarden, 1Password, Chrome AutoFill).
2. **Thuộc tính AutoComplete đầy đủ**:
   - Email: `autoComplete="username email"`
   - Mật khẩu: `autoComplete="current-password"` (trang login) hoặc `autoComplete="new-password"` (trang register).
3. **Hiển thị trạng thái tương tác rõ nét**:
   - Focus ring: `focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white`
   - Báo lỗi tức thời (Error summary) với màu đỏ sẫm nền hồng nhạt dễ đọc (`bg-red-50 text-red-700 border-red-200`).
4. **Hỗ trợ Test nhanh (Demo Speed)**: Cung cấp nút 1-click điền thông tin tài khoản sinh viên mẫu (Bách Khoa, KHTN) để giảng viên hoặc người chấm đồ án kiểm thử chỉ trong 1 giây.
5. **Nút bấm rõ ràng**: Trạng thái loading chuyển thành spinner kèm nhãn "Đang xử lý...", nút disabled chống double-click.

---

## 5. Quy chuẩn Component UI

- **Product Card**:
  - Khung ảnh tỷ lệ 4:3 có border bo góc `rounded-2xl`.
  - Nhãn tình trạng (Mới, Như mới, Tốt, Khá) bo tròn đặt góc trên bên trái với màu theo cấp độ.
  - Giá tiền in đậm to rõ bằng màu xanh ngọc tin cậy hoặc xanh dương đậm.
  - Hiển thị vị trí nhận đồ (KTX Khu A, Khu B, Trường Bách Khoa...) kèm icon bản đồ.
- **Nút bấm (Buttons)**:
  - Nút chính (Primary): Gradient `from-blue-600 to-indigo-600`, bo góc tròn `rounded-full` hoặc `rounded-xl`, shadow `shadow-blue-600/20`.
  - Nút phụ (Secondary): Nền `bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200`.
- **Badges / Chips**:
  - Chiều cao tối thiểu 24px, font chữ `text-[11px] font-bold`, padding `px-2.5 py-0.5`.

---

## 6. Pre-delivery Checklist (Kiểm định Chất lượng)

- [x] Độ tương phản chữ nền tối thiểu 4.5:1 (đạt chuẩn WCAG 2.2 AA).
- [x] Không sử dụng emoji thay thế icon hệ thống (sử dụng SVG vector chuẩn).
- [x] Tất cả các nút và thẻ bấm đều có `cursor-pointer` và hiệu ứng hover 150-200ms.
- [x] Bàn phím có thể điều hướng (Focus ring rõ nét, không bị che khuất).
- [x] Thiết kế Mobile-first chuẩn 375px, 768px, 1024px và 1440px.

