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
- **Mục tiêu**: Người bán đăng tin dưới 60s; người mua tìm kiếm, duyệt đồ theo trường/KTX và lọc chi tiết.
- **Công việc cụ thể (3 Atomic Tasks)**:
  1. **Task 2.1 (Khám phá & Tìm kiếm tiếng Việt)**:
     - Xây dựng API `GET /api/listings` hỗ trợ tìm kiếm tiếng Việt không dấu (`removeVietnameseTones`), lọc theo danh mục, KTX, khoảng giá, tình trạng, đồ 0đ, có Digital Passport và ưu tiên sinh viên xác minh (BR19).
     - Xây dựng Component `ProductsExplorer` chuẩn UX (Shop Sidebar trên desktop + Drawer trên mobile).
     - Triển khai các routes công khai `/products`, `/categories/[slug]`, `/search` với Suspense skeleton.
  2. **Task 2.2 (Đăng bán < 60s & Khởi tạo Digital Passport)**:
     - Form đăng bán 1 trang cuộn `/sell` (tối đa 5 ảnh theo BR16), nén ảnh client canvas (<1200px) và sinh hash SHA-256.
     - Kiểm tra từ khóa hàng cấm theo BR17, giới hạn 10 tin/ngày (BR16), tùy chọn ẩn SĐT Zalo (BR36).
     - Khởi tạo Digital Product Passport tự động: sinh `passportId`, `itemCommit`, tạo `PassportOwner` và `PassportEvent` (BR24, BR29).
  3. **Task 2.3 (Quản lý tin cá nhân `/my-products`)**:
     - Trang `/my-products` quản lý danh sách tin của người bán (BR03).
     - Thao tác: Sửa thông tin (thông báo người mua có đơn PENDING theo BR22), Tạm ẩn/Hiện (`AVAILABLE`/`HIDDEN`), Đánh dấu đã bán (`SOLD` theo BR10), Gia hạn 30 ngày (`EXPIRED` -> `AVAILABLE` theo BR15).
     - Ràng buộc BR18: Khóa thao tác xóa khi tin đang ở trạng thái giữ chỗ `RESERVED`.
- **Kết quả nghiệm thu (Deliverables)**:
  - Tìm kiếm tiếng Việt không dấu ra đúng sản phẩm;
  - Đăng thành công 1 tin có ảnh kèm Passport dưới 60 giây;
  - Quản lý tin cá nhân (sửa, ẩn, bán, gia hạn) hoạt động trơn tru.

---

### 🏃 Sprint 3: Kết Nối Zalo & Đặt Lịch Hẹn Giữ Đồ (Contact & Booking)
- **Mục tiêu**: Người mua kết nối người bán lập tức qua Zalo (có bảo mật và rate-limit chống cào số) hoặc đặt lịch hẹn xem hàng giữ chỗ (`RESERVED`) trực tiếp trên UniCycle; hỗ trợ người bán chốt đơn cho khách Zalo bằng link/QR 1 lần (BR38).
- **Phân rã Atomic Tasks**:
  1. **Task 3.1 (Trang Chi Tiết Sản Phẩm `/products/[id]` & Route bảo mật Zalo `/api/zalo/[listingId]`)**:
     - PDP chuẩn UX: Gallery ảnh, Dual CTA (Nhắn Zalo `#0068FF` & Đặt lịch hẹn `#018ABE`), Tóm tắt Digital Passport & tuyên bố giới hạn (BR30), Seller Trust Box & Hộp an toàn KTX.
     - Route trung gian `/api/zalo/[listingId]`: Yêu cầu auth (BR01), rate-limit chống cào số, ẩn SĐT thô nếu `hidePhone=true` (BR36), tạo link & tin nhắn mẫu sẵn.
     - Khách vãng lai bấm Zalo/Đặt hẹn -> mở modal đăng nhập rồi tự quay lại vị trí (`returnTo`).
  2. **Task 3.2 (Đặt Lịch Hẹn Giữ Đồ `POST /api/orders` & Quản Lý Đơn Hẹn `/orders`)**:
     - BookingModal: chọn giá đề xuất, địa điểm công cộng (cổng KTX/căng tin), thời gian hẹn.
     - Quy tắc BR04 (không tự đặt mua đồ mình), BR05 (cho phép nhiều đơn PENDING cùng lúc).
     - Người bán duyệt đơn: chuyển đơn thành `ACCEPTED`, listing thành `RESERVED`, tự động `REJECTED` các đơn PENDING khác (BR11).
     - Quản lý đơn hẹn `/orders`: 2 tab Mua / Bán, hỗ trợ hủy hẹn nhả trạng thái `AVAILABLE` (BR21).
  3. **Task 3.3 (Chốt Bán Khách Zalo `/invites/[code]` theo BR38 & Timeout BR12, BR37)**:
     - Người bán tạo link/QR mời chốt bán 1 lần (hạn 24h) gửi qua Zalo (BR38).
     - Khách Zalo mở link `/invites/[code]`, bấm xác nhận mua -> tự động tạo đơn `ACCEPTED` và listing chuyển `RESERVED`.
     - Bộ dọn dẹp timeout `reconcileExpiredOrders()`: đơn PENDING quá 48h tự `EXPIRED` (BR12); đơn ACCEPTED quá `meetTime + 24h` tự `EXPIRED` và nhả hàng về `AVAILABLE` (BR37).
- **Kết quả nghiệm thu (Deliverables)**:
  - Xem chi tiết sản phẩm không lộ SĐT trong HTML;
  - Bấm Nhắn Zalo hoạt động mượt mà (có QR & tin nhắn mẫu);
  - Đặt lịch hẹn và chuyển trạng thái giữ chỗ `RESERVED` độc quyền hoạt động chính xác;
  - Link chốt bán khách Zalo 24h hoạt động trơn tru.

---

### 🏃 Sprint 4: Hoàn Tất Đơn 48H, Đánh Giá & Digital Passport (Trust & Passport)
- **Mục tiêu**: Hoàn tất chu kỳ giao dịch trao tay, đánh giá uy tín và quản lý vòng đời món đồ (giảm tải phạm vi, chuyển Chuyển quyền trực tiếp sang P1).

---

### 🏃 Sprint 5: Xác Minh Sinh Viên, Kiểm Duyệt, Lát Cắt Fuji & Triển Khai (Polishing & Demo)
- **Mục tiêu**: Kiểm tra toàn diện, hoàn thiện lát cắt Blockchain trên Fuji Testnet, sẵn sàng cho người dùng thật và bảo vệ đồ án.

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

