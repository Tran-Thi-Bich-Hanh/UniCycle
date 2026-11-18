# Báo Cáo Kiểm Toán & Kế Hoạch Sửa Lỗi UI/UX Toàn Diện — UniCycle

> **Phương pháp kiểm toán:** Áp dụng bộ quy chuẩn **UI/UX Pro Max** (`html-tailwind`, Accessibility WCAG AA, Mobile Touch Targets, Compact Label Layout) kết hợp rà soát trực tiếp toàn bộ mã nguồn giao diện (`app/**`, `components/**`).  
> **Nguyên tắc tối thượng:** **CHỈ thay đổi giao diện (UI/UX)** — giữ nguyên 100% API routes (`app/api/**`), Prisma schema, logic xử lý dữ liệu, luồng đặt lịch, Zalo rate-limit và Digital Product Passport Blockchain.

---

## 1. Tổng Quan Chuẩn UI/UX Pro Max Áp Dụng

| Tiêu chí | Lỗi phổ biến hiện tại trên hệ thống | Kết quả mong muốn sau khi chuẩn hóa |
| :--- | :--- | :--- |
| **Độ tương phản chữ (WCAG AA >= 4.5:1)** | Khai báo CSS `.hero-gradient-bleed` bị trùng lặp; lớp màu cuối quá sáng (`#75B9CF`) làm chìm chữ thống kê và văn bản ở đáy Hero & trang Login. | Hợp nhất gradient sâu, dịu mắt (`#001B48 -> #02457A`), chữ trắng và xanh nhạt nổi bật rõ nét trên mọi màn hình. |
| **Biểu tượng hệ thống (No Emoji as Structural Icons)** | Lạm dụng emoji (`📍`, `🎁`, `📜`, `🕒`, `💵`, `💎`, `🛡️`, `🚩`, `📅`, `⛓️`, `🔍`) trong nút bấm, bộ lọc và thẻ điều hướng gây lệch dòng và khác biệt giữa Windows/macOS/Android. | Thay bằng icon Vector SVG sắc nét đồng nhất (`strokeWidth={1.75}` hoặc `2`, kèm `aria-hidden="true"`). |
| **Kích thước vùng chạm (Mobile Touch Target)** | Các nút trên thẻ sản phẩm (`ProductCard`) trên mobile chỉ cao ~28px (`py-1.5`), gây khó bấm; đáy trang bị thanh `MobileBottomNav` che mất chân trang. | Đảm bảo nút bấm tối thiểu `36px–44px` (`h-9` đến `h-11`); thêm khoảng đệm đáy `pb-16 lg:pb-0` ở layout chính. |
| **Nhãn & Huy hiệu (Compact Label Layout)** | Badge `"Passport"` cạnh giá tiền làm vỡ dòng giá trên mobile 2 cột; huy hiệu `"✓ Đã duyệt SV"` bị ép xuống 2 dòng khi tên dài; mã hex Passport `break-all` làm gãy layout. | Áp dụng `whitespace-nowrap`, `shrink-0` cho badge/icon và `min-w-0 truncate` cho tên/mã, giữ thẻ cân đối từ màn hình `375px`. |
| **Trải nghiệm người dùng cuối (Clean UX Copy)** | Menu tài khoản và Footer vẫn hiển thị đường dẫn code thô (`/profile`, `/my-products`, `/orders`, `/admin`), nút bấm trên `Header` bị ẩn sớm ở `1024px–1279px`. | Ẩn các chuỗi đường dẫn kỹ thuật, thay bằng chevron SVG tinh tế; hiển thị đầy đủ thanh điều hướng trên laptop `1024px+`. |

---

## 2. Danh Sách Chi Tiết Từng Lỗi UI/UX & Lộ Trình 6 Atomic Tasks

Toàn bộ công việc sửa giao diện được chia thành **6 Atomic Tasks nhỏ, độc lập**, mỗi task chỉ chỉnh sửa tối đa 2–4 file giao diện để dễ kiểm tra, tránh hết token và có thể `git commit` ngay sau khi bạn duyệt.

---

### TASK 1: Nền tảng Toàn cục — Global CSS, Gradient Contrast, Thanh cuộn & Padding Mobile
*Phạm vi file:* `app/globals.css`, `app/layout.tsx`

| Mã lỗi | File & Vị trí | Lỗi hiện tại (Current Bug) | Kết quả mong muốn (Expected Result) |
| :--- | :--- | :--- | :--- |
| **UI-1.1** | `app/globals.css` (dòng 39–52) | Class `.hero-gradient-bleed` bị định nghĩa lặp 2 lần. Đoạn định nghĩa sau kết thúc bằng màu sáng `#75B9CF 92%` khiến dòng thống kê `300k+`, `1-chạm`, `100%` và chữ mô tả ở đáy Hero / trang Login bị giảm tương phản, khó đọc. | Xóa khai báo trùng lặp; tinh chỉnh 1 dải gradient chuẩn `#001B48 -> #013264 -> #02457A -> #016B9D` có chiều sâu, giữ chữ `#FFFFFF` và `#D6E8EE` đạt chuẩn tương phản >= 4.5:1. |
| **UI-1.2** | `app/globals.css` (ảnh hưởng `HomeProductFeed.tsx:169`, `ProductDetailClient.tsx:335`) | Sử dụng class `.scrollbar-none` và `.no-scrollbar` trong JSX nhưng chưa được định nghĩa trong CSS (Tailwind v4 không có sẵn). Trình duyệt Windows hiển thị thanh cuộn ngang màu xám khá thô dưới dải tab và dải ảnh thumbnail. | Định nghĩa đầy đủ utility `.scrollbar-none, .no-scrollbar` ẩn thanh cuộn đa trình duyệt (`scrollbar-width: none`, `-ms-overflow-style: none`, `&::-webkit-scrollbar { display: none; }`). |
| **UI-1.3** | `app/layout.tsx` (dòng 50–69) | Thanh `MobileBottomNav` cố định ở đáy màn hình (`h-16`, `lg:hidden`) nhưng `<body>` hoặc wrapper không có padding đáy tương ứng, khiến phần cuối `Footer` và các nút ở cuối trang bị thanh nav mobile đè khuất. | Bổ sung `pb-16 lg:pb-0` ở thẻ `<body>` (hoặc khối bao ngoài Footer) trong `app/layout.tsx` để nội dung trên mobile luôn cuộn tới trọn vẹn không bị che. |

---

### TASK 2: Thanh Header, Mega-Menu, Popup Tài khoản & Footer
*Phạm vi file:* `components/layout/Header.tsx`, `components/layout/Footer.tsx`

| Mã lỗi | File & Vị trí | Lỗi hiện tại (Current Bug) | Kết quả mong muốn (Expected Result) |
| :--- | :--- | :--- | :--- |
| **UI-2.1** | `components/layout/Header.tsx` (dòng 412) | Nút **"Đồ của tôi"** đang đặt `hidden xl:inline-flex` (chỉ hiện từ `1280px`), trong khi **"Đơn hẹn"** hiện từ `lg` (`1024px`). Sinh viên dùng laptop 13–14 inch (`1024px–1279px`) bị mất lối vào nhanh "Đồ của tôi" trên Header. | Đổi thành `hidden lg:inline-flex`, tinh chỉnh khoảng cách giữa ô tìm kiếm và cụm nút phải (`px-2.5 lg:px-3`) để hiển thị mượt mà từ `1024px` không bị chật. |
| **UI-2.2** | `components/layout/Header.tsx` (dòng 545, 614, 670, 678) & `components/layout/Footer.tsx` (dòng 140, 145) | Popup Tài khoản và Footer hiển thị trực tiếp các chuỗi đường dẫn kỹ thuật thô như `/profile`, `/my-products`, `/orders`, `/admin` cạnh tên menu, trông giống giao diện thử nghiệm nội bộ. | Thay các chuỗi `/profile`, `/my-products`, `/orders`, `/admin` bằng icon mũi tên điều hướng mảnh (`chevron-right` SVG) xuất hiện tinh tế khi hover; bỏ `(/orders)`, `(/my-products)` ở Footer. |
| **UI-2.3** | `components/layout/Header.tsx` (dòng 264) | Mega-Menu Danh mục dùng kích thước cứng `w-[680px]`, nếu màn hình khoảng `1024px` hoặc zoom trình duyệt có nguy cơ lệch sát mép phải. | Thêm `max-w-[calc(100vw-2rem)]`, bo góc và đổ bóng tinh gọn, căn chỉnh đều các thẻ danh mục con bên trong. |

---

### TASK 3: Trang chủ — Hero Section, Lưới Danh mục, Bộ lọc Feed & Passport Banner
*Phạm vi file:* `app/page.tsx`, `components/home/CategoryGrid.tsx`, `components/home/HomeProductFeed.tsx`, `components/home/PassportBanner.tsx`

| Mã lỗi | File & Vị trí | Lỗi hiện tại (Current Bug) | Kết quả mong muốn (Expected Result) |
| :--- | :--- | :--- | :--- |
| **UI-3.1** | `app/page.tsx` (dòng 147) | Section Hero dùng `pt-2 pb-16 sm:pt-4 sm:pb-24` khiến tiêu đề `<h1>` và khối ảnh 3D bên phải quá sát mép dưới của thanh Header. | Tăng khoảng thở đỉnh thành `pt-8 pb-16 sm:pt-12 sm:pb-20` tạo bố cục thoáng đãng, cân đối giữa 2 cột. |
| **UI-3.2** | `components/home/CategoryGrid.tsx` (dòng 231–246) | Khi bấm chọn thẻ **"Góc 0đ Cho Tặng"**, huy hiệu `"Đang lọc"` (`top-2.5 left-2.5`) và huy hiệu `"0đ Tặng"` (`-top-2.5 right-2`) trên mobile 2 cột nằm gần như đụng nhau và che góc khung ảnh; dùng emoji `🎁`. | Đặt huy hiệu `"Đang lọc"` ở vị trí không xung đột (hoặc hiển thị viền highlight + icon check gọn dưới/góc hợp lý), thay `🎁` bằng icon hộp quà SVG đồng bộ. |
| **UI-3.3** | `components/home/HomeProductFeed.tsx` (dòng 134, 155–157, 204, 238) | - Dòng 204 có class `py-0.2` không hợp lệ trong Tailwind làm badge đếm số tin trong tab bị xệ lệch.<br>- Nút lọc phụ `"Chỉ hiện đồ tặng 0đ"` dùng emoji `🎁` và chiều cao `py-1.5` nhỏ hơn dropdown `h-10`. | Sửa `py-0.2` thành `py-0.5`; đồng bộ chiều cao cụm lọc phụ (`h-9 rounded-xl`), dùng icon SVG hộp quà cho nút "Đồ tặng 0đ", và chuẩn hóa nội dung dropdown gọn gàng. |
| **UI-3.4** | `components/home/PassportBanner.tsx` (dòng 48, 56, 64) | 3 thẻ lợi ích cốt lõi ("Chuỗi đời chủ", "Chống trộm cắp", "Bán lại 1-click") dùng emoji `📜`, `🔒`, `🔁` làm icon tiêu đề. | Thay thế bằng icon Vector SVG đặt trong badge nền kính mờ (`bg-white/15 rounded-lg p-1.5`) hiện đại và đồng nhất kích thước. |

---

### TASK 4: Thẻ Sản phẩm (`ProductCard`) & Trang Khám phá (`ProductsExplorer`)
*Phạm vi file:* `components/products/ProductCard.tsx`, `components/products/ProductsExplorer.tsx`

| Mã lỗi | File & Vị trí | Lỗi hiện tại (Current Bug) | Kết quả mong muốn (Expected Result) |
| :--- | :--- | :--- | :--- |
| **UI-4.1** | `components/products/ProductCard.tsx` (dòng 97–107 & dòng 148–158) | Thông tin Passport bị lặp 2 chỗ: badge `"Đời chủ #N"` ở góc ảnh và chữ `"Passport"` cạnh giá tiền. Trên màn hình mobile 2 cột (`grid-cols-2`), chữ `"Passport"` bóp nghẹt giá bán (ví dụ `"0 ₫ (Miễn phí)"` bị rớt thành 2 dòng). | Bỏ chữ `"Passport"` dư thừa cạnh giá bán (vì trên ảnh đã có badge `"Đời chủ #N"` rõ ràng), giúp dòng giá tiền luôn hiển thị trọn vẹn 1 dòng thoáng đẹp trên cả mobile lẫn desktop. |
| **UI-4.2** | `components/products/ProductCard.tsx` (dòng 192–209) | Hai nút **"Xem chi tiết"** và **"Zalo"** dùng `py-1.5` (chiều cao chỉ ~28px), quá thấp so với chuẩn vùng chạm ngón tay (36–44px) và chữ `"Xem chi tiết"` dễ xuống dòng trên màn hình 375px. | Nâng chiều cao nút lên `h-9 sm:h-10`, dùng `whitespace-nowrap`, trên mobile siêu nhỏ hiển thị `"Chi tiết"` (`sm:inline` cho chữ "Xem chi tiết") giúp 2 nút luôn thẳng hàng, dễ bấm. |
| **UI-4.3** | `components/products/ProductsExplorer.tsx` (dòng 226, 271, 380) | Tiêu đề bộ lọc sidebar dùng emoji `🔍`; các thẻ `<select>` chọn trường và sắp xếp dùng mũi tên mặc định sát mép, chưa bọc icon chevron SVG như trang chủ. | Thay `🔍` bằng SVG icon kính lúp/bộ lọc; chuẩn hóa `<select>` với `appearance-none pr-8` và icon chevron SVG cách mép phải cân đối. |

---

### TASK 5: Trang Chi tiết Sản phẩm (PDP) & Trang Digital Passport
*Phạm vi file:* `components/products/ProductDetailClient.tsx`, `components/passport/PassportClient.tsx`

| Mã lỗi | File & Vị trí | Lỗi hiện tại (Current Bug) | Kết quả mong muốn (Expected Result) |
| :--- | :--- | :--- | :--- |
| **UI-5.1** | `components/products/ProductDetailClient.tsx` (dòng 372–377) | Trong khối timeline Product Passport, chuỗi mã `bytes32` dài 66 ký tự hiển thị nguyên chuỗi với `break-all`, khiến phần header của thẻ tối màu bị phình cao và xô lệch trên mobile/tablet. | Rút gọn hiển thị thông minh dạng `0x6a8f12...cdef01` trong pill `font-mono` sắc nét (kèm `title` chứa full mã), giữ header thẻ Passport gọn đẹp một hàng. |
| **UI-5.2** | `components/products/ProductDetailClient.tsx` (dòng 654–663) | Huy hiệu `"✓ Đã duyệt SV"` cạnh tên người bán thiếu `shrink-0 whitespace-nowrap`. Khi tên sinh viên dài, huy hiệu bị bóp thành 2 dòng méo mó. | Thêm `shrink-0 whitespace-nowrap` cho huy hiệu và `min-w-0 truncate` cho tên người bán để dòng tên luôn thẳng hàng tuyệt đối. |
| **UI-5.3** | `components/products/ProductDetailClient.tsx` (dòng 343, 544, 558, 619, 681, 693) & `components/passport/PassportClient.tsx` (dòng 230, 238, 249, 318) | Dùng class `scale-102` không chuẩn ở dải ảnh Thumbnail và dùng nhiều emoji (`📍`, `⚙️`, `📅`, `🛡️`, `🚩`, `⚠️`, `🚨`, `⛓️`) tại các nút CTA và cảnh báo quan trọng. | Thay `scale-102` bằng `ring-2 ring-[#018ABE] ring-offset-1`; thay emoji ở các nút CTA/cảnh báo/link bằng icon Vector SVG đồng bộ chuẩn mực. |

---

### TASK 6: Trang Đồ của tôi (`/my-products`), Đơn hẹn (`/orders`), Đăng nhập & Đăng ký
*Phạm vi file:* `components/my-products/MyProductsManager.tsx`, `components/orders/OrderDetailClient.tsx`, `app/login/page.tsx`, `app/register/page.tsx`

| Mã lỗi | File & Vị trí | Lỗi hiện tại (Current Bug) | Kết quả mong muốn (Expected Result) |
| :--- | :--- | :--- | :--- |
| **UI-6.1** | `components/my-products/MyProductsManager.tsx` (dòng 589–660) | Cụm nút thao tác bên phải mỗi thẻ tin đăng dùng `sm:flex-nowrap`, ép 5–6 nút (`Chốt bán Zalo`, `Sửa tin`, `Ẩn tin`, `Đã bán`, `Gia hạn`, `Xóa`) nằm cùng 1 hàng ngay từ `640px`, làm bóp nát cột thông tin ảnh/tên món đồ bên trái trên tablet và laptop nhỏ. | Đổi sang `flex-wrap lg:max-w-[380px] xl:max-w-none xl:justify-end gap-2`, đồng bộ chiều cao nút (`h-9 px-3 whitespace-nowrap`) và thay emoji trên các nút thành SVG gọn mắt. |
| **UI-6.2** | `components/orders/OrderDetailClient.tsx` (dòng 640) | Nút điều hướng sau khi hoàn tất giao dịch vẫn hiển thị chuỗi route kỹ thuật `"Mở Đồ của tôi (/my-products) ↗"`. | Đổi nhãn thành `"Mở Đồ của tôi ↗"` tự nhiên, thân thiện với sinh viên. |
| **UI-6.3** | `app/login/page.tsx` (dòng 217–229) & `app/register/page.tsx` (dòng 238–251) | Ô nhập mật khẩu ở cả 2 trang chưa có nút **Ẩn/Hiện mật khẩu (Show/Hide Password)**, khiến người dùng trên điện thoại dễ gõ sai mật khẩu khi đăng nhập/đăng ký. | Bổ sung nút toggle con mắt SVG bên trong input mật khẩu (dùng state cục bộ `showPassword`, giữ nguyên hoàn toàn logic submit form và OAuth). |

---

## 3. Cam Kết An Toàn Kỹ Thuật (Zero Backend Regression)
1. Không chỉnh sửa bất kỳ tệp tin nào trong `app/api/**`, `lib/**`, `prisma/**`.
2. Không đổi tên biến state, không đổi props interface, không bỏ bất kỳ `onClick`, `onSubmit`, `href` hoặc tham số query nào (`?action=zalo`, `/passport/...`, `/invites/...`).
3. Sau mỗi Atomic Task đều chạy `npx tsc --noEmit` để đảm bảo 0 lỗi TypeScript và cung cấp hướng dẫn test + câu lệnh `git commit` riêng cho từng task.
