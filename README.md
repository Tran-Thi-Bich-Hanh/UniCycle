# 🚲 UniCycle – Sàn Mua Bán & Tái Sử Dụng Đồ Cũ Sinh Viên

> **UniCycle** là nền tảng trao đổi đồ dùng second-hand dành riêng cho cộng đồng sinh viên, giúp giải quyết bài toán chi phí đầu năm học, chuyển trọ, dọn KTX và xây dựng lối sống tiêu dùng tuần hoàn, bền vững.

![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![SQLite Native](https://img.shields.io/badge/Database-SQLite%20WAL-003B57?logo=sqlite)
![Avalanche C--Chain](https://img.shields.io/badge/Blockchain-Avalanche%20Fuji-E84142?logo=avalanche)

---

## 🌟 Tính năng nổi bật (Phase 1: Core Marketplace)

### 1. Khám phá & Bộ lọc đa tiêu chí (`/products`)
- **Tìm kiếm thông minh**: Tìm kiếm theo từ khóa (tên món đồ, mô tả, địa điểm giao dịch).
- **Bộ lọc chuyên biệt cho sinh viên**:
  - Danh mục: Giáo trình, Bàn ghế & Nội thất, Đồ điện & Thiết bị, Đồ dùng KTX, Phương tiện & Khác.
  - Tình trạng: Mới 100%, Như mới (99%), Còn tốt (85-90%), Đã dùng nhiều.
  - Khoảng giá: Mức giá nhanh (< 50k, 50k - 200k, 200k - 500k, > 1tr) hoặc tùy chỉnh VND.
- **Đồng bộ liên kết (Deep Linking)**: Trạng thái lọc phản chiếu lên URL để dễ dàng chia sẻ hoặc lưu lại.
- **Công thái học**: Sử dụng `router.replace` giúp nút Back trình duyệt hoạt động mượt mà, phân trang thu gọn `1 … 4 5 6 … 20`.

### 2. Chi tiết món đồ & Liên hệ trực tiếp (`/products/[id]`)
- **Bộ sưu tập ảnh chụp thực tế**: Hỗ trợ xem nhiều ảnh, chuyển ảnh linh hoạt.
- **Bảo mật số điện thoại sinh viên**: Ẩn SĐT trước khách vãng lai để chống bot cào dữ liệu/spam; chỉ sinh viên đã đăng nhập mới xem được số để Gọi điện hoặc Chat Zalo.
- **Cam kết an toàn khuôn viên trường**: Hướng dẫn gặp mặt tại các địa điểm công cộng (KTX, Thư viện, Cổng trường) và tuyệt đối không cọc trước.
- **Gợi ý thông minh**: Tự động hiển thị các món đồ cùng danh mục.

### 3. Đăng tin thanh lý & Upload ảnh (`/products/new`)
- **Tải ảnh thực tế**: Upload tối đa 5 ảnh, xem trước trực tiếp, chỉ định ảnh bìa. Bắt buộc có ảnh thật (loại bỏ hoàn toàn ảnh stock ảo).
- **Form kiểm tra lỗi tức thì**: Báo lỗi cụ thể tại từng ô nhập, tự động cuộn lên bảng tóm tắt lỗi giúp thao tác thuận tiện.
- **Tùy chọn Tặng miễn phí (0đ)**: Dành cho sinh viên muốn tặng lại sách vở, giáo trình cho đàn em khóa dưới.

### 4. Quản lý tin cá nhân & Thao tác 1 chạm (`/profile/my-listings`)
- Hệ thống 4 tabs: **Đang bán**, **Đã bán**, **Tạm ẩn**, **Tất cả**.
- **Thao tác 1 chạm**: Đánh dấu "Đã bán" / "Mở bán lại" hoặc "Tạm ẩn" bài đăng.
- **Hệ thống Toast hoàn tác**: Cho phép hoàn tác ngay lập tức nếu vô tình bấm nhầm.

### 5. Hồ sơ sinh viên xác thực (`/profile` & `/profile/edit`)
- Quản lý thông tin: Họ tên, Trường đại học, Khuôn viên/KTX, Số điện thoại và Ảnh đại diện.
- Cảnh báo nhắc nhở khi tài khoản chưa cập nhật số điện thoại liên hệ.

---

## 🎨 Hệ thống Thiết kế & Bảng màu (5-Shade Palette)

Giao diện UniCycle được thiết kế theo phong cách hiện đại, tin cậy trên nền trắng (`#FFFFFF`) với 5 sắc thái xanh chủ đạo:

| Mã màu | Tên màu | Ứng dụng giao diện |
| :--- | :--- | :--- |
| **`#001B48`** | Midnight Navy | Tiêu đề chính H1, Brand, Thanh Footer, độ tương phản cao |
| **`#02457A`** | Deep Ocean Blue | Thẻ giá tiền, danh mục chính, nút phụ, border nhấn |
| **`#018ABE`** | Cerulean Blue | Nút bấm chính (CTA), trạng thái Active, focus ring |
| **`#97CADB`** | Soft Sky Blue | Viền bo góc thẻ, hiệu ứng hover, gradient nhẹ |
| **`#D6E8EE`** | Ice Blue Tint | Nền badge tình trạng, chip bộ lọc, đường phân cách |

*Icon toàn bộ dự án sử dụng chuẩn Vector SVG theo quy chuẩn UI/UX Pro Max, hoàn toàn không dùng emoji làm biểu tượng chức năng.*

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- **Ngôn ngữ**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Cơ sở dữ liệu**: SQLite native trong Node.js 24 (`node:sqlite`) với WAL mode và Foreign Key constraints
- **Xác thực**: JWT Cookie HTTP-Only + Mã hóa mật khẩu bằng `node:crypto` (`scryptSync` + `timingSafeEqual`)
- **Lưu trữ ảnh**: Hệ thống upload cục bộ an toàn (`/public/uploads/`) với kiểm tra MIME type và dung lượng
- **Web3 Ready (Phase 2 & 3)**: Avalanche C-Chain, Fuji Testnet, SHA-256 Item Hash

---

## 🚀 Hướng dẫn Cài đặt & Chạy ứng dụng

### Yêu cầu hệ thống:
- [Node.js](https://nodejs.org/) version 20 trở lên (khuyên dùng Node 24).
- Trình quản lý gói `npm` hoặc `pnpm`.

### Các bước cài đặt:

1. **Clone repository:**
   ```bash
   git clone https://github.com/your-username/unicycle.git
   cd unicycle
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Chạy máy chủ phát triển (Development Server):**
   ```bash
   npm run dev
   ```

4. **Mở trình duyệt:**
   Truy cập [http://localhost:3000](http://localhost:3000) để trải nghiệm nền tảng.

---

## 👥 Tài khoản Sinh viên Mẫu (Test Accounts)

Cơ sở dữ liệu tự động khởi tạo dữ liệu mẫu với các tài khoản sinh viên và món đồ có sẵn:

| Họ và tên | Email đăng nhập | Mật khẩu | Trường |
| :--- | :--- | :--- | :--- |
| **Nguyễn Hoàng Nam** | `an.nguyen@student.hcmut.edu.vn` | `Password123` | ĐH Bách Khoa TP.HCM (KTX Khu B) |
| **Trần Hải Yến** | `mai.tran@student.hcmus.edu.vn` | `Password123` | ĐH Khoa học Tự nhiên TP.HCM |

> 💡 **Mẹo**: Tại trang `/login`, bạn chỉ cần bấm nút **"Đăng nhập nhanh (Hoàng Nam)"** hoặc **"Đăng nhập nhanh (Hải Yến)"** để đăng nhập ngay mà không cần gõ mật khẩu.

---

## 📁 Cấu trúc Thư mục Dự án

```text
unicycle/
├── app/                        # Next.js App Router
│   ├── api/                    # API Route Handlers
│   │   ├── auth/               # Đăng nhập, đăng ký, đăng xuất, thông tin cá nhân
│   │   ├── categories/         # Danh mục và số lượng tin
│   │   ├── my-listings/        # Quản lý tin cá nhân theo trạng thái
│   │   ├── products/           # Tìm kiếm, lọc và tạo bài đăng
│   │   │   └── [id]/           # Chi tiết, cập nhật và xóa tin
│   │   └── upload/             # API upload ảnh thực tế
│   ├── login/                  # Trang Đăng nhập sinh viên
│   ├── register/               # Trang Đăng ký tài khoản
│   ├── products/               # Khám phá & Bộ lọc sản phẩm
│   │   ├── new/                # Đăng tin thanh lý mới
│   │   └── [id]/               # Chi tiết sản phẩm & liên hệ
│   │       └── edit/           # Chỉnh sửa tin đăng
│   ├── profile/                # Hồ sơ cá nhân
│   │   ├── edit/               # Chỉnh sửa thông tin liên hệ
│   │   └── my-listings/        # Quản lý tin đăng cá nhân
│   ├── layout.tsx              # Root Layout, Metadata & Favicon
│   └── page.tsx                # Trang chủ UniCycle
├── components/                 # Các UI Components tái sử dụng
│   ├── icons.tsx               # Bộ sưu tập Icon SVG chuẩn hóa
│   ├── listing-form.tsx        # Form tạo/sửa tin đăng công thái học
│   ├── logo.tsx                # Biểu tượng UniCycle bo góc
│   ├── navbar.tsx              # Thanh điều hướng trên cùng & Menu Mobile
│   ├── footer.tsx              # Chân trang & Thông tin nền tảng
│   ├── product-card.tsx        # Thẻ sản phẩm với giá và địa điểm
│   └── toast.tsx               # Thông báo Toast kèm nút Hoàn tác
├── docs/                       # Tài liệu thiết kế & kiến trúc hệ thống
│   ├── architecture.md         # Mô tả các tầng kiến trúc
│   ├── design.md               # Quy chuẩn Palette & Typography
│   └── project-overview.md     # Định hướng và phạm vi toàn diện
├── lib/                        # Core Utilities & Business Logic
│   ├── auth.ts                 # JWT, Password Scrypt & Session
│   ├── db.ts                   # SQLite Database schema & Auto-seed
│   ├── safe-redirect.ts        # Chống Open Redirect attack
│   └── utils.ts                # Định dạng tiền tệ VND, thời gian tương đối
└── public/                     # Static Assets & Ảnh tải lên
    ├── favicon.ico             # Favicon tab trình duyệt
    ├── icon.png                # App Icon PNG trong suốt bo góc 10%
    ├── logo.jpg                # Logo chính thức UniCycle Team H.Y
    └── uploads/                # Thư mục chứa ảnh đăng bán của người dùng
```

---

## 🗺️ Lộ trình Phát triển (Development Roadmap)

- [x] **Phase 1: Core Marketplace (Hoàn thành)**
  - Cơ sở dữ liệu SQLite, hệ thống xác thực JWT an toàn.
  - Bộ lọc đa tiêu chí, Trang chi tiết món đồ, Đăng & Sửa tin kèm upload ảnh.
  - Quản lý bài đăng cá nhân, bảo mật số điện thoại người bán, hoàn thiện UI/UX.
- [ ] **Phase 2: UniCycle Passport & Item Hashing**
  - Tạo mã băm SHA-256 (hoặc IPFS) gắn với thông tin và ảnh sản phẩm.
  - Xác thực tính toàn vẹn của món đồ qua các đời chủ sở hữu sinh viên.
- [ ] **Phase 3: Smart Escrow Avalanche Contract**
  - Viết và triển khai Smart Contract Escrow trên Avalanche Fuji Testnet.
  - Bảo vệ tiền thanh toán (USDC), hỗ trợ xác nhận nhận đồ và hoàn tiền khi xảy ra tranh chấp.
- [ ] **Phase 4: On-chain Reputation & Demo E2E**
  - Hệ thống điểm uy tín sinh viên ghi nhận trên Blockchain.
  - Triển khai Cloud Database (Turso/Supabase) và chính thức đưa lên Vercel.

---

## 📄 Bản quyền (License)

Dự án được phát triển bởi **UniCycle Team H.Y** dành cho cộng đồng sinh viên. Giữ toàn quyền tác giả © 2026 UniCycle.
