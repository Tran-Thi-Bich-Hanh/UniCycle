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
- **Mục tiêu**: Hoàn tất chu kỳ giao dịch trao tay trong 48 giờ, đánh giá uy tín bí mật đối ứng (Blind Review) và quản lý trọn vẹn vòng đời món đồ qua Digital Product Passport (giảm tải phạm vi, chuyển Chuyển quyền trực tiếp không qua tin đăng sang P1).
- **Phân rã Atomic Tasks**:
  1. **Task 4.1 (Xác Nhận Bàn Giao 48H, Khiếu Nại `BR07, BR13` & Tự Động Chuyển Giao Passport `BR26, BR31`)**:
     - Luồng xác nhận bàn giao 2 chiều (`ACCEPTED` ➔ `WAITING_CONFIRMATION` ➔ `COMPLETED` / `AUTO_COMPLETED` sau 48h) và chuyển tin đăng sang `SOLD` (BR10).
     - Nút khiếu nại **"Tôi chưa nhận hàng"** trong cửa sổ 48h lập tức chặn auto-complete và chuyển đơn sang `DISPUTED` cho Admin xử lý (BR13).
     - Khi đơn hoàn tất: Tự động cập nhật `Item.currentOwnerId` sang người mua, sinh `PassportOwner` đời chủ kế tiếp (`seq + 1`, `ownerHash` ngẫu nhiên độc lập theo BR34, ẩn danh mặc định theo BR29), ghi `PassportEvent` (`TRANSFERRED`, mức xác nhận `BOTH` hoặc `ONE_SIDE` theo BR31) và tạo `ChainTx` (`QUEUED`).
  2. **Task 4.2 (Đánh Giá Uy Tín Bí Mật 48 Giờ - Blind Review `BR08, BR09, BR14, BR23, BR35`)**:
     - API & Modal đánh giá 1-5 sao kèm tag nhanh cho đơn đã `COMPLETED` / `AUTO_COMPLETED` (mỗi bên 1 lần theo BR08, BR09).
     - Cơ chế **Blind Review 48h (BR14)**: Giữ bí mật nội dung đánh giá cho đến khi cả hai bên cùng nộp hoặc sau 48 giờ để chống trả đũa.
     - Tự động tính toán lại điểm uy tín sinh viên (`reputationScore` theo BR23) và chặn cộng điểm ảo nếu lặp lại giao dịch bất thường giữa cùng cặp tài khoản (BR35).
  3. **Task 4.3 (Trang Xác Minh Passport `/passport/[id]`, "Đồ Của Tôi" `/my-items` & Bán Lại Kế Thừa Passport `BR24, BR25, BR29, BR30, BR33`)**:
     - Trang công khai `/passport/[id]`: Hiển thị timeline chuỗi đời chủ (Chủ #1 ➔ Chủ #2...), đối chiếu trực quan ảnh qua các đời chủ (BR24), mã QR số màn hình và tuyên bố giới hạn bắt buộc (BR30).
     - Trang `/my-items` ("Đồ của tôi"): Quản lý các món đồ đang sở hữu, bật/tắt hiển thị tên trên lịch sử Passport (BR29), hiển thị mã QR số khi gặp mặt.
     - Luồng **"Bán lại 1-chạm"** (`/sell?resellItemId=...`): Chỉ cho phép chủ sở hữu hiện tại (BR25), kế thừa nguyên vẹn `passportId` duy nhất (BR33) và bắt buộc tải lên bộ ảnh mới phản ánh tình trạng hiện tại (BR24).
- **Kết quả nghiệm thu (Deliverables)**:
  - Xác nhận bàn giao 2 chiều hoặc khiếu nại chặn auto-complete hoạt động chuẩn xác;
  - Đánh giá Blind Review ẩn/hiện đúng quy tắc 48h và cập nhật điểm sao;
  - Món đồ sau khi mua tự động xuất hiện trong `/my-items` của người mua, xem được timeline `/passport/[id]` và đăng "Bán lại" kế thừa lịch sử thành công.

---

### 🏃 Sprint 5: Xác Minh Sinh Viên, Kiểm Duyệt, Lát Cắt Fuji On-Chain/Off-Chain & Triển Khai (Polishing & Demo)
- **Mục tiêu**: Hoàn thiện lát cắt Blockchain trên Avalanche Fuji Testnet với kiến trúc lai **On-chain ↔ Off-chain** minh bạch, triển khai xác minh sinh viên & xóa tài khoản Crypto-shredding, xây dựng trang Quản trị Admin phân xử tranh chấp/Flag Passport, và sẵn sàng cho kịch bản bảo vệ đồ án **A ➔ B ➔ C**.
- **Kiến trúc Lai On-Chain ↔ Off-Chain (Trọng tâm Sprint 5)**:
  - **Off-chain (PostgreSQL / Supabase)**: Nguồn dữ liệu vận hành chính tốc độ cao (< 3s trên 4G); lưu trữ toàn bộ thông tin cá nhân (PII), ảnh thật (`sha256`), giá bán, đánh giá bí mật, `itemSalt` bí mật và bảng ánh xạ `PassportOwner.userId ↔ ownerHash` hỗ trợ **Crypto-shredding (BR34)**.
  - **On-chain (Avalanche Fuji Testnet - Chain ID `43113`)**: Lớp bảo chứng bất biến & kiểm chứng công khai qua Smart Contract `UniCyclePassport.sol`; chỉ lưu mã băm ẩn danh (`passportId`, `itemCommit`, `ownerHash`, `orderHash`) và phát sự kiện (`PassportRegistered`, `OwnershipTransferred`, `PassportFlagged`, `PassportUnflagged`). Relayer (`viem`) trả phí gas hộ sinh viên và chạy bất đồng bộ qua bảng `chain_txs` để không làm nghẽn giao dịch web (**BR27, BR28**).
- **Phân rã Atomic Tasks**:
  1. **Task 5.1 (Lát Cắt Blockchain Avalanche Fuji `UniCyclePassport.sol`, Relayer `viem` & Bộ Kiểm Chứng Đối Chiếu On-Chain ↔ Off-Chain `BR27, BR28, BR30, BR31, BR32`)**:
     - Viết và hướng dẫn triển khai Smart Contract `contracts/UniCyclePassport.sol` (`AccessControl`, `RECORDER_ROLE`, `register`, `transfer`, `flag`, `unflag`) lên **Avalanche Fuji Testnet**.
     - Xây dựng bộ **Relayer bất đồng bộ** (`lib/blockchain/relayer.ts`): Tự động serialize hàng đợi `chain_txs` (`QUEUED` ➔ `SUBMITTED` ➔ `CONFIRMED`), gọi `register` + `transfer` + `flag`/`unflag`, lưu `txHash` thật và hỗ trợ retry (≤ 3 lần) không nghẽn luồng web (**BR28**).
     - Xây dựng **Bộ Kiểm Chứng Độc Lập** (`lib/blockchain/verifier.ts` & `GET/POST /api/passport/[id]/verify`): Đọc trực tiếp trạng thái & event logs từ Fuji RPC, so khớp 1-1 với dữ liệu PostgreSQL (`itemCommit`, `currentOwnerHash`, `transferCount`, `flagged`).
     - Nâng cấp trang `/passport/[id]` (`PassportClient.tsx`): Bảng đối chiếu trực quan 2 cột **Off-chain (PostgreSQL) ↔ On-chain (Avalanche Fuji)**, nút **"🔍 Xác minh trực tiếp trên Blockchain (Fuji RPC)"**, nút **"⚡ Đồng bộ Relayer lên Fuji ngay"** và link tra cứu **Snowtrace Fuji Explorer**.
  2. **Task 5.2 (Xác Minh Danh Tính Sinh Viên `/verify-student`, Hồ Sơ Cá Nhân `/profile`, `/users/[id]` & Xóa Tài Khoản Crypto-Shredding `BR19, BR34, NĐ 13/2023/NĐ-CP`)**:
     - Trang `/verify-student` & API `/api/auth/verify-student`: Xác minh tức thì qua email `.edu.vn` khớp tên miền trường (`School.emailDomain`) hoặc tải lên ảnh chụp thẻ sinh viên (kèm cam kết tự động xóa vĩnh viễn ảnh thẻ ngay sau khi Admin phê duyệt theo **Nghị định 13/2023/NĐ-CP**).
     - Trang Hồ sơ cá nhân (`/profile`) & Hồ sơ công khai (`/users/[id]`): Quản lý thông tin trường/KTX, điểm uy tín, danh sách tin đang bán và đánh giá công khai (tuyệt đối không lộ email/SĐT/MSSV).
     - Cơ chế **Xóa tài khoản Crypto-shredding (`DELETE /api/auth/account` - BR34)**: Đặt `PassportOwner.userId = NULL`, `showName = false` (giữ nguyên `ownerHash`, `seq`, `since` để chuỗi lịch sử trên DB & Fuji không gãy), chuyển `Item` đang sở hữu sang `ARCHIVED_OWNER_DELETED` và ẩn danh hóa tài khoản.
  3. **Task 5.3 (Báo Cáo Vi Phạm `/api/reports`, Trang Quản Trị Admin `/admin`, Phân Xử `DISPUTED` SLA 72h, Flag Passport `BR17, BR32, BR39`, Cron Job & Trang Pháp Lý)**:
     - API `POST /api/reports` & `ReportModal`: Cho phép sinh viên báo cáo tin đăng, người dùng hoặc Passport nghi vấn ngay trên `/products/[id]` và `/passport/[id]`.
     - Trang Quản trị Admin (`/admin` & `API /api/admin`):
       - Phân xử đơn `DISPUTED` (SLA 72h) theo đúng 3 kết luận (`BUYER_RECEIVED`, `NOT_DELIVERED`, `INSUFFICIENT_EVIDENCE`).
       - Gắn cờ (`FLAG`) / Gỡ cờ (`UNFLAG`) Passport thực thi trọn vẹn hiệu lực **BR39** (ẩn tin `AVAILABLE` ➔ `HIDDEN`, từ chối `PENDING`, chuyển `ACCEPTED`/`WAITING_CONFIRMATION` ➔ `DISPUTED`, ghi `PassportEvent` & xếp hàng ghi `ChainTx` lên Fuji).
       - Duyệt báo cáo vi phạm (**BR17**), duyệt thẻ sinh viên (tự động xóa ảnh thẻ khỏi DB/Storage sau duyệt) và giám sát/kích hoạt lại hàng đợi `ChainTx`.
     - Cron Job định kỳ (`GET /api/cron/reconcile`) xử lý timeout SLA 72h đơn `DISPUTED`, hết hạn tin 30 ngày (**BR15**) & retry hàng đợi blockchain; bổ sung trang Điều khoản (`/terms`) và Chính sách bảo mật (`/privacy`).
- **Kết quả nghiệm thu (Deliverables)**:
  - Demo trọn vẹn kịch bản bảo vệ **A ➔ B ➔ C** có giao dịch ghi sự kiện thật trên Avalanche Fuji Testnet, bấm nút **"Xác minh trên Blockchain"** trả về *"Khớp toàn vẹn 100% ✓"* và mở được `txHash` trên Snowtrace Fuji Explorer;
  - Sinh viên xác minh được tài khoản (`.edu.vn` hoặc thẻ SV tự xóa ảnh sau duyệt) và xóa tài khoản đúng chuẩn Crypto-shredding (**BR34**);
  - Admin phân xử được đơn `DISPUTED`, gắn/gỡ cờ Passport đúng hiệu lực **BR39** và toàn bộ cron timeout/trang pháp lý hoạt động ổn định.

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

