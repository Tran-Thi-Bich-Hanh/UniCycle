# UniCycle – Kế Hoạch Phát Triển Dự Án Chi Tiết (Project Planning & Roadmap)

Tài liệu này xác định lộ trình phát triển, phân chia Sprint, phân bổ công việc và tiêu chí nghiệm thu cho đồ án **UniCycle** – Nền tảng mua bán đồ cũ dành cho sinh viên.

---

## 1. Chiến Lược Phát Triển (Phased Strategy)

Để đảm bảo dự án hoàn thành đúng hạn, chạy ổn định và đạt kết quả bảo vệ đồ án xuất sắc, chiến lược được chia làm 3 giai đoạn rõ rệt:

```
┌────────────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 1: MVP WEB-FIRST & LÁT CẮT FUJI (SPRINT 0 ĐẾN SPRINT 5)     │
│  - Khảo sát nhu cầu thực tế sinh viên (Sprint 0).                      │
│  - Xây dựng web hoàn chỉnh, tối ưu mobile-first, load < 3s trên 4G.   │
│  - Đăng nhập Google 1 chạm, huy hiệu xác minh sinh viên.               │
│  - Kênh liên hệ tức thì qua ZALO (Proxy) + Form đặt hẹn giữ chỗ.       │
│  - Hoàn tất đơn & đánh giá uy tín bí mật trong chu kỳ 48 giờ.          │
│  - Digital Product Passport (lưu trữ CSDL PostgreSQL, mã QR màn hình). │
│  - Lát cắt Blockchain tối thiểu trên Avalanche Fuji (Contract +        │
│    Relayer tối giản + Nút Xác minh) ở Sprint 5 phục vụ demo bảo vệ.   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (Khi hệ thống MVP đã hoàn thiện)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 2: MỞ RỘNG ON-CHAIN PRODUCTION & REALTIME (P1 - NÂNG CAO)   │
│  - Đưa Smart Contract lên Mainnet, quản lý khóa Relayer bằng KMS.      │
│  - Hàng đợi xử lý tuần tự (serialize nonce), retry chịu lỗi toàn diện. │
│  - Chuyển quyền trực tiếp (Direct Transfer), neo Merkle root đánh giá. │
│  - Tích hợp Chat Realtime nội bộ (Supabase Realtime / Socket).         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (Mở rộng dài hạn)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 3: ECOSYSTEM & AUTOMATION (P2)                              │
│  - Smart Escrow cho giao dịch từ xa, ví nhúng (Embedded Wallet).       │
│  - Kết nối trạm sửa chữa thiết bị, mở rộng mạng lưới đa đại học.       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kế Hoạch Sprint Chi Tiết Cho Giai Đoạn MVP (Sprints 0 – 5)

Mỗi Sprint kéo dài từ **1 đến 1.5 tuần** với mục tiêu bàn giao rõ ràng (Deliverables) có thể kiểm thử và nghiệm thu độc lập.

---

### 🔍 Giai Đoạn 0: Khảo Sát & Xác Thực Nhu Cầu Thực Tế (Pre-Sprint · 1 tuần)
- **Mục tiêu**: Xác thực giả thuyết bài toán trước khi bắt tay lập trình, đảm bảo sản phẩm giải quyết đúng nỗi đau sinh viên.
- **Công việc cụ thể**:
  1. Phỏng vấn sâu 8–15 sinh viên tại các cụm KTX (KTX ĐHQG Khu A/B, KTX Bách Khoa, KTX Kinh Tế...) bao gồm cả người thường xuyên mua và người cần thanh lý đồ.
  2. Khảo sát 3–5 nhóm Facebook/Zalo pass đồ sinh viên sôi động nhất để phân tích tần suất bài trôi, các vụ việc bị lừa đảo hoặc giao dịch bất tiện.
  3. Phỏng vấn trực tiếp về tính năng **Product Passport**: Mức độ quan tâm đến việc biết món đồ đã qua tay ai đối với các nhóm đồ khác nhau (sách giáo trình, quạt, bàn, đồ điện tử).
- **Kết quả nghiệm thu**: Báo cáo tổng hợp nhu cầu (User Insights) dùng làm căn cứ tinh chỉnh tính năng trong các Sprint tiếp theo.

---

### 🏃 Sprint 1: Khởi Tạo Dự Án, Design System & Xác Thực (Foundations)
- **Mục tiêu**: Dựng khung kỹ thuật chuẩn, cấu hình bảng màu 5 cấp độ xanh và đăng nhập người dùng.
- **Công việc cụ thể**:
  1. Khởi tạo source code Next.js 14+ (App Router, TypeScript, Tailwind CSS, ESLint).
  2. Cấu hình Design Tokens từ [`docs/design.md`](file:///d:/Linh%20tinh/unicycle/docs/design.md) (Midnight Navy, Ocean Blue, Cerulean Blue, Sky Blue, Ice Blue).
  3. Thiết lập CSDL PostgreSQL (Prisma ORM / Supabase) theo mô hình trong [`docs/system-design.md`](file:///d:/Linh%20tinh/unicycle/docs/system-design.md).
  4. Triển khai Authentication: Đăng nhập nhanh bằng **Google OAuth** và Email/Password.
  5. Xây dựng Header Responsive (Desktop) và Bottom Navigation Bar 5 nút (Mobile).
- **Kết quả nghiệm thu (Deliverables)**: Người dùng có thể đăng nhập bằng Google trên cả mobile và desktop; giao diện hiển thị đúng chuẩn màu xanh - nền trắng.

---

### 🏃 Sprint 2: Đăng Tin Siêu Tốc & Danh Mục Khám Phá (Core Listings)
- **Mục tiêu**: Người bán đăng tin dưới 60s; người mua tìm kiếm, duyệt đồ theo trường/KTX.
- **Công việc cụ thể**:
  1. Thiết kế khối **Hero Gradient Bleed** ở trang chủ kèm ô tìm kiếm nhanh.
  2. Xây dựng trang danh sách sản phẩm `/products` với bộ lọc: Danh mục, Khoảng giá, Khu vực (Trường / KTX), Tình trạng, và Lọc đồ tặng 0đ.
  3. Xây dựng Component **Product Card** với huy hiệu sinh viên xác minh và huy hiệu có Passport.
  4. Xây dựng Form Đăng bán `/sell` tối ưu dưới 60 giây trên mobile:
     - Tải ảnh kéo thả, tự động nén ảnh phía client (nâng cao tốc độ tải).
     - Điền thông tin cơ bản, chọn trường/KTX.
     - Nhập số điện thoại Zalo (có tuỳ chọn ẩn số thật).
     - Công tắc bật tạo **Digital Product Passport**.
  5. Quản lý tin cá nhân `/my-products` (sửa, ẩn, đánh dấu đã bán, gia hạn tin).
- **Kết quả nghiệm thu**: Đăng bán thành công 1 tin có ảnh dưới 60 giây; tìm kiếm đồ theo từ khóa và lọc đúng theo KTX.

---

### 🏃 Sprint 3: Kết Nối Zalo & Đặt Lịch Hẹn Giữ Đồ (Contact & Booking)
- **Mục tiêu**: Người mua kết nối người bán lập tức qua Zalo hoặc đặt lịch hẹn xem hàng.
- **Công việc cụ thể**:
  1. Xây dựng Trang Chi Tiết Sản Phẩm `/products/[id]` chuẩn UI/UX theo [`docs/ui-ux.md`](file:///d:/Linh%20tinh/unicycle/docs/ui-ux.md):
     - Image Carousel & Lightbox xem ảnh thật.
     - Khối thông tin Người bán (Trường ĐH, đánh giá sao, huy hiệu sinh viên).
     - Hộp lưu ý an toàn giao dịch tại nơi công cộng (cổng trường/KTX).
  2. Triển khai **Cụm Hành Động Kép (Dual CTA)**:
     - **Nút "Nhắn qua Zalo"**: Hiển thị cả với khách vãng lai; khi bấm kiểm tra auth, nếu chưa đăng nhập thì mở popup Google 1 chạm kèm `returnTo` để không đứt đoạn trải nghiệm; đăng nhập xong mở route trung gian `/api/zalo/[listingId]` để chống thu thập SĐT hàng loạt (rate limit 10 lượt/h); trên desktop bật Modal mã QR (chỉ hiện nút copy số khi người bán không ẩn số công khai).
     - **Nút "Đặt lịch hẹn xem hàng"**: Modal chọn khung giờ hẹn, địa điểm (cổng KTX/căng tin/thư viện), và giá đề xuất (yêu cầu đăng nhập, có luồng `returnTo`).
     - Banner nhắc nhở & Nút **"Gửi lời mời chốt bán"** (link dùng một lần, hết hạn sau 24h theo BR38) để giữ giao dịch Zalo không rơi khỏi hệ thống.
  3. Xây dựng hệ thống quản lý Đơn hẹn `/orders` & `/orders/[id]`:
     - Người bán bấm Chấp nhận ➔ Đơn chuyển `ACCEPTED`, sản phẩm tự động chuyển `RESERVED` (giữ chỗ, tránh bán trùng).
     - **Job timeout đơn `ACCEPTED`**: Quá `meet_time + 24h` mà không bên nào bấm xác nhận, hệ thống tự động hủy đơn (`EXPIRED`) và nhả sản phẩm về `AVAILABLE` (BR37).
- **Kết quả nghiệm thu**: Bấm nút Zalo mở đúng app Zalo với tin nhắn mẫu; gửi yêu cầu hẹn thành công và sản phẩm được khóa trạng thái `RESERVED`.

---

### 🏃 Sprint 4: Hoàn Tất Đơn 48H, Đánh Giá & Digital Passport (Trust & Passport)
- **Mục tiêu**: Hoàn tất chu kỳ giao dịch trao tay, đánh giá uy tín và quản lý vòng đời món đồ (giảm tải phạm vi, chuyển Chuyển quyền trực tiếp sang P1).
- **Công việc cụ thể**:
  1. Triển khai luồng xác nhận đơn trực tiếp:
     - Người mua bấm "Đã nhận hàng", người bán bấm "Đã bàn giao" ➔ Đơn `COMPLETED`.
     - **Cơ chế khiếu nại**: Nút "Tôi chưa nhận hàng" trong 48h chặn auto-complete và chuyển `DISPUTED` cho Admin can thiệp.
     - Job định kỳ kiểm tra: nếu 1 bên bấm xác nhận nhưng bên kia im lặng quá **48 giờ** ➔ Tự động hoàn tất `AUTO_COMPLETED` (BR13).
  2. Xây dựng luồng **Đánh Giá Bí Mật (Blind Review)** trong 48 giờ:
     - Cả hai bên chấm điểm sao (1–5⭐) và nhận xét mà không thấy đánh giá của nhau.
     - Hiển thị công khai khi cả hai đã nộp hoặc sau 48 giờ; cập nhật điểm uy tín người bán.
  3. Xây dựng hệ thống **Digital Product Passport (Off-chain)**:
     - Trang `/passport/[id]` hiển thị timeline chuỗi đời chủ (Chủ #1 ➔ Chủ #2) kèm mã QR số hiển thị trên màn hình điện thoại.
     - Mục **"Đồ của tôi" (`/my-items`)**: Danh sách các món đồ đang sở hữu.
     - **Nút "Bán lại" (Resell 1-click)**: Yêu cầu người bán tải lên bộ ảnh mới (không tự động copy ảnh cũ) để người mua so sánh trực quan độ hao mòn với ảnh các đời chủ trước, kế thừa toàn bộ hồ sơ lịch sử (tính năng Chuyển quyền trực tiếp được đẩy sang P1 để đảm bảo tiến độ).
- **Phương án cắt giảm dự phòng nếu thiếu thời gian (De-scope Fallback)**: Do Sprint 4 tập trung nhiều nghiệp vụ cốt lõi, nếu tiến độ bị trễ, hạng mục cắt giảm đầu tiên là **cơ chế ẩn đối ứng 48h của Blind Review** (chuyển về đánh giá 1–5⭐ hiển thị ngay sau khi đơn hoàn tất), ưu tiên giữ nguyên 100% **Luồng xác nhận đơn 48h + Khiếu nại** và **Digital Passport + Bán lại**.
- **Kết quả nghiệm thu**: Giao dịch hoàn tất chuyển quyền sở hữu món đồ sang tài khoản người mua; trang passport hiển thị đúng 2 đời chủ; nút bán lại hoạt động trơn tru.

---

### 🏃 Sprint 5: Xác Minh Sinh Viên, Kiểm Duyệt, Lát Cắt Fuji & Triển Khai (Polishing & Demo)
- **Mục tiêu**: Kiểm tra toàn diện, hoàn thiện lát cắt Blockchain trên Fuji Testnet, sẵn sàng cho người dùng thật và bảo vệ đồ án.
- **Công việc cụ thể**:
  1. Trang xác minh sinh viên `/verify-student`: Upload ảnh thẻ sinh viên hoặc gửi mã xác thực qua email trường ➔ Duyệt cấp Huy hiệu uy tín (ảnh thẻ tự động xóa sau duyệt).
  2. Module Báo cáo & Kiểm duyệt (Admin Dashboard tối thiểu):
     - Báo cáo tin đăng rác, lừa đảo, đồ trộm cắp, xử lý đơn khiếu nại `DISPUTED` (SLA 72h).
     - Admin ẩn tin, khóa tài khoản, đánh dấu (flag/unflag) passport nghi vấn (BR39).
  3. **Hiện thực Lát cắt Blockchain tối thiểu (Minimal Slice trên Avalanche Fuji Testnet)**:
     - Triển khai Smart contract `UniCyclePassport.sol` lên Fuji Testnet.
     - Tích hợp **Relayer tối giản** ở backend để tự động gửi giao dịch ghi sự kiện `PassportRegistered` và `OwnershipTransferred` lên Fuji khi đơn hàng hoàn tất.
     - Hiện thực **Nút "Xác minh trên blockchain"** trên trang `/passport/[id]` đọc sự kiện trực tiếp từ Fuji RPC, đối chiếu với DB ("Khớp ✓") và dẫn link sang Snowtrace Fuji Explorer.
  4. Tối ưu hiệu năng, SEO & Open Graph (chia sẻ link hiển thị ảnh thumbnail đẹp trên Zalo/Facebook).
  5. Triển khai hệ thống lên môi trường production: **Frontend & API trên Vercel, CSDL trên Neon/Supabase**.
- **Kết quả nghiệm thu**: Website chạy thực tế với domain chính thức; tải trang < 2.5s; demo thành công vòng đời A ➔ B ➔ C có đối chiếu sự kiện thật trên Avalanche Fuji Testnet.

---

## 3. Lộ Trình Lát Cắt Blockchain Tối Thiểu (Sprint 5 - Trước Hạn Bảo Vệ) & Giai Đoạn P1

Để đảm bảo vừa có sản phẩm thực tế hoàn chỉnh, vừa có bằng chứng công nghệ ấn tượng trước hội đồng phản biện:
1. **Lát cắt Blockchain tối thiểu (Minimal Slice - Thực hiện ở Sprint 5)**:
   - **Smart Contract**: Viết và triển khai `UniCyclePassport.sol` lên mạng **Avalanche Fuji Testnet**.
   - **Relayer tối giản & Ghi sự kiện**: Khi đơn hàng hoàn tất, backend gọi hàm relayer tối giản (sử dụng `viem`/`ethers`) để ghi sự kiện `PassportRegistered` và `OwnershipTransferred` lên Fuji và lưu `tx_hash` vào bảng `chain_txs`.
   - **Nút "Xác minh trên blockchain"**: Đọc trực tiếp các sự kiện từ Fuji RPC, so khớp với lịch sử hiển thị trên DB và mở link giao dịch thực tế trên Snowtrace Fuji Explorer (demo trọn vẹn kịch bản A bán cho B ➔ B bán lại cho C).
2. **Kế hoạch mở rộng P1 (Production on-chain)**:
   - Quản lý khóa ví Relayer bằng KMS/Secret Manager, nâng cấp lên Avalanche Mainnet.
   - Triển khai hàng đợi xử lý tuần tự (serialize transaction theo ví relayer) kèm retry backoff đầy đủ để tránh đụng nonce ở quy mô lớn.
   - Tích hợp Chat Realtime nội bộ (Supabase Realtime) và tính năng Chuyển quyền trực tiếp (Direct Transfer).

---

## 4. Bảng Quản Trị Rủi Ro (Risk Management)

| Rủi ro tiềm ẩn | Mức độ | Biện pháp phòng ngừa & Giảm thiểu |
|---|---|---|
| **Sinh viên ngại đăng ký vì rào cản** | Cao | Hỗ trợ đăng nhập nhanh bằng **Google (Gmail)** trong 1 chạm, không bắt buộc email trường ngày đầu. |
| **Khách vãng lai bỏ đi khi bị yêu cầu đăng nhập lúc bấm nút Zalo** | Trung bình | Popup Google 1 chạm (OAuth), đăng nhập xong tự động mở thẳng route Zalo qua `returnTo` mà không mất vị trí trang. |
| **Giao dịch rò rỉ qua Zalo** (hai bên chốt ngoài rồi không quay lại web) | Cao | Hiển thị banner nhắc nhở trên tin đăng + Nút "Gửi lời mời chốt bán" (link dùng một lần, hết hạn 24h theo BR38) để người bán đưa đơn vào hệ thống. |
| **Quá tải phạm vi Sprint 4** | Cao | Đã đẩy "Chuyển quyền trực tiếp" sang P1. Nếu vẫn trễ tiến độ, phương án cắt giảm đầu tiên là bỏ cơ chế ẩn đối ứng 48h (blind review nâng cao) để chuyển về đánh giá hiển thị ngay, giữ nguyên trọn vẹn luồng xác nhận 48h và Digital Passport. |
| **Người mua khiếu nại người bán bấm xác nhận khống** | Trung bình | Cơ chế nút "Tôi chưa nhận hàng" trong 48h lập tức chặn auto-complete, chuyển `DISPUTED` cho Admin xử lý. |
| **Đơn hàng bị kẹt trạng thái giữ đồ vô hạn** | Trung bình | Cơ chế tự động hủy sau `meet_time + 24h` nếu cả hai im lặng; tự động hoàn tất sau 48h nếu người mua im lặng. |
| **Lỗi mạng hoặc nghẽn gas khi làm blockchain** | Trung bình | Tách bạch hoàn toàn: MVP chạy Off-chain trên PostgreSQL tốc độ cao; Lát cắt Blockchain trên Fuji dùng để demo công nghệ độc lập. |
| **Đăng tin rác / lừa đảo** | Trung bình | Giới hạn số tin đăng mỗi ngày (BR16), bộ lọc danh mục hàng cấm (BR17), nút báo cáo cộng đồng. |

---

## 5. Tiêu Chí Nghiệm Thu Đồ Án (Definition of Done - DoD)

Dự án được xem là hoàn thành xuất sắc khi đáp ứng đủ 5 tiêu chuẩn:
1. **Khả dụng thực tế (Usability)**: Giao diện chuẩn UI/UX theo [`docs/ui-ux.md`](file:///d:/Linh%20tinh/unicycle/docs/ui-ux.md), thao tác mượt mà trên smartphone, đăng tin < 60s.
2. **Luồng nghiệp vụ trọn vẹn (End-to-End)**: Đăng tin ➔ Nhắn Zalo / Hẹn giờ ➔ Giữ chỗ ➔ Bàn giao trao tay ➔ Đánh giá blind 48h.
3. **Tính năng độc bản (Passport Lifecycle)**: Vòng đời đồ vật Chủ #1 ➔ Chủ #2 ➔ Bán lại kế thừa hồ sơ hoạt động hoàn hảo.
4. **Lát cắt Blockchain (Avalanche Fuji Testnet) & Kiến trúc sạch**: Hoàn thành kịch bản A ➔ B ➔ C có Relayer tối giản ghi sự kiện thật lên Fuji Testnet và nút "Xác minh trên blockchain" đối chiếu khớp dữ liệu on-chain/off-chain.
5. **Đầy đủ tài liệu đồ án**: Bộ tài liệu kiến trúc, nghiệp vụ, thiết kế trong thư mục `docs/` đồng bộ 100%.

