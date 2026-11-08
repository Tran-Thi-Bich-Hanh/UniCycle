# UniCycle – Lộ trình 2 tuần & Kế hoạch Chia nhỏ Task (Atomic Workflow)

Kế hoạch này được điều chỉnh theo nguyên tắc Atomic Development:

🛑 Quy tắc làm việc: Mỗi task chỉ thực hiện một phần việc nhỏ, rõ ràng. Sau khi xong mỗi task, hệ thống sẽ kiểm tra build, cung cấp gợi ý commit Git chi tiết và dừng lại chờ bạn nghiệm thu (Accept). Chỉ khi bạn duyệt thì mới làm tiếp task sau.

## 1. Lộ trình tổng thể 2 tuần (14 ngày)
- **Tuần 1 (Ngày 1 - 5):** Giai đoạn 1 – Core Marketplace (10 tasks chia nhỏ chi tiết bên dưới).
- **Tuần 1 cuối (Ngày 6 - 7):** Giai đoạn 2 – UniCycle Passport (Nhập thông tin tình trạng theo danh mục + Hash tính toàn vẹn SHA-256).
- **Tuần 2 đầu (Ngày 8 - 10):** Giai đoạn 3 – Smart Escrow Web3 (Smart contract Avalanche Fuji + Nạp/khóa USDC + Giải ngân an toàn).
- **Tuần 2 cuối (Ngày 11 - 14):** Giai đoạn 4 – On-chain Reputation & Demo E2E (Event TradeCompleted, điểm uy tín ví, tổng duyệt 7 bước).

## 2. Danh sách 10 Atomic Tasks của Giai đoạn 1
Danh sách chi tiết từng task:

### Task 1.1: Khởi tạo Database SQLite native & Seed danh mục đa dạng
- **Nội dung:** Tạo `lib/db.ts` sử dụng `node:sqlite` có sẵn trong Node 24 (không phụ thuộc external packages), tạo bảng `users`, `categories`, `products`, `product_images`, và seed sẵn 5 danh mục sinh viên + 2 tài khoản mẫu + 6 sản phẩm mẫu. Điều chỉnh font chữ hệ thống trong `app/layout.tsx` để build offline mượt mà.
- **Files tạo/sửa:** `lib/db.ts`, `app/layout.tsx`.
- **Gợi ý Git commit:** `feat(db): setup native sqlite schema and seed multi-category data`
- **Cách test:** Chạy script kiểm tra kết nối database và danh mục đã có trong DB.

### Task 1.2: Module Xác thực & Quản lý Session
- **Nội dung:** Tạo `lib/auth.ts` sử dụng `node:crypto` (scrypt hash + HMAC SHA-256 JWT cookie) và các API routes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- **Files tạo:** `lib/auth.ts`, `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts`.
- **Gợi ý Git commit:** `feat(auth): implement student auth helper and session endpoints`
- **Cách test:** Test curl/fetch login và me trả về thông tin user đã đăng nhập.

### Task 1.3: Giao diện Đăng ký & Đăng nhập sinh viên
- **Nội dung:** Tạo trang `app/login/page.tsx` và `app/register/page.tsx` với thiết kế sinh viên gọn gàng, hỗ trợ nút bấm 1-click đăng nhập nhanh tài khoản mẫu để thuận tiện kiểm thử.
- **Files tạo:** `app/login/page.tsx`, `app/register/page.tsx`.
- **Gợi ý Git commit:** `feat(ui-auth): add student login and register pages with quick demo login`
- **Cách test:** Truy cập `/login` bấm đăng nhập tài khoản mẫu, kiểm tra cookie session được lưu.

### Task 1.4: Layout chung, Bộ Icon SVG & Điều hướng
- **Nội dung:** Tạo `components/icons.tsx` (các icon SVG nhẹ không cần thư viện bên ngoài), `components/navbar.tsx` (Logo, ô tìm kiếm nhanh, nút Đăng tin, avatar user), và `components/footer.tsx` (thông tin dự án và mẹo an toàn).
- **Files tạo:** `components/icons.tsx`, `components/navbar.tsx`, `components/footer.tsx`.
- **Gợi ý Git commit:** `feat(layout): add student navbar, footer and clean svg icons`
- **Cách test:** Mở trình duyệt xem Header và Footer hiển thị đẹp mắt, avatar cập nhật theo trạng thái đăng nhập.

### Task 1.5: Thẻ sản phẩm & Trang chủ UniCycle
- **Nội dung:** Tạo `components/product-card.tsx` và xây dựng lại `app/page.tsx` gồm Hero banner, lướt 5 danh mục sinh viên, danh sách đồ mới đăng, và hướng dẫn mua bán 3 bước an toàn.
- **Files tạo/sửa:** `components/product-card.tsx`, `app/page.tsx`, `lib/utils.ts` (format tiền VND, thời gian tương đối).
- **Gợi ý Git commit:** `feat(home): add student homepage with category cards and recent listings`
- **Cách test:** Trang chủ hiển thị 6 món đồ mẫu từ database, có nhãn tình trạng và giá VND.

### Task 1.6: API Danh mục & Sản phẩm (Tìm kiếm + Bộ lọc)
- **Nội dung:** Xây dựng API phục vụ việc query danh mục và sản phẩm với đầy đủ bộ lọc:
  - `GET /api/categories`: danh sách danh mục và số lượng sản phẩm.
  - `GET /api/products`: lọc theo search, category, condition, minPrice, maxPrice, sort.
  - `POST /api/products`: tạo mới bài đăng đồ cũ.
- **Files tạo:** `app/api/categories/route.ts`, `app/api/products/route.ts`.
- **Gợi ý Git commit:** `feat(api): implement product and category query endpoints with filters`
- **Cách test:** Gọi API `/api/products?search=ban` hoặc `/api/products?category=sach-giao-trinh`.

### Task 1.7: Trang Khám phá, Tìm kiếm & Bộ lọc
- **Nội dung:** Xây dựng trang `app/products/page.tsx` với thanh tìm kiếm từ khóa, checklist danh mục, lọc tình trạng (Mới, Như mới, Còn tốt, Khá), lọc khoảng giá và sắp xếp.
- **Files tạo:** `app/products/page.tsx`.
- **Gợi ý Git commit:** `feat(catalog): build product listing page with multi-facet filters`
- **Cách test:** Tìm kiếm từ khóa, bấm chọn từng bộ lọc và kiểm tra danh sách kết quả phản hồi chuẩn xác.

### Task 1.8: Trang Chi tiết sản phẩm & Liên hệ người bán
- **Nội dung:** Xây dựng `app/products/[id]/page.tsx` hiển thị bộ ảnh sản phẩm, chi tiết tình trạng, giá bán, vị trí nhận đồ (KTX/Cổng trường), card người bán kèm nút Gọi điện / Chat Zalo trực tiếp, và khối đồ tương tự.
- **Files tạo:** `app/api/products/[id]/route.ts` (GET, PUT, DELETE), `app/products/[id]/page.tsx`.
- **Gợi ý Git commit:** `feat(product-detail): add product detail view with seller contact and specs`
- **Cách test:** Bấm vào một món đồ bất kỳ để xem chi tiết, kiểm tra số lượt xem tăng và thông tin người bán.

### Task 1.9: Đăng tin thanh lý & Upload ảnh
- **Nội dung:** Xây dựng `app/api/upload/route.ts` (lưu ảnh vào public/uploads) và trang `app/products/new/page.tsx` cho phép chọn danh mục, điền giá, tình trạng, nơi nhận hàng và upload nhiều ảnh chụp thực tế.
- **Files tạo:** `app/api/upload/route.ts`, `app/products/new/page.tsx`.
- **Gợi ý Git commit:** `feat(listing): implement create listing page with image upload`
- **Cách test:** Đăng nhập, vào trang `/products/new`, đăng một món đồ mới kèm ảnh và kiểm tra món đồ xuất hiện trên trang chủ.

### Task 1.10: Quản lý tin đăng & Chỉnh sửa / Ẩn tin
- **Nội dung:** Xây dựng `app/api/my-listings/route.ts`, trang `app/profile/page.tsx`, `app/profile/my-listings/page.tsx` (tabs Đang bán, Đã bán, Ẩn; 1-click chuyển trạng thái sang "Đã bán"), và `app/products/[id]/edit/page.tsx` để sửa thông tin.
- **Files tạo:** `app/api/my-listings/route.ts`, `app/profile/page.tsx`, `app/profile/my-listings/page.tsx`, `app/products/[id]/edit/page.tsx`.
- **Gợi ý Git commit:** `feat(profile): implement my-listings management and edit listing`
- **Cách test:** Vào mục Tin đã đăng, bấm chuyển 1 bài sang "Đã bán" hoặc "Ẩn" và kiểm tra ngoài trang tìm kiếm.