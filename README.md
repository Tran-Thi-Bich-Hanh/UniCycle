# UniCycle

**UniCycle** là nền tảng trao đổi, mua bán và cho tặng đồ dùng đã qua sử dụng dành riêng cho cộng đồng sinh viên TP.HCM (KTX Khu A, KTX Khu B ĐHQG, ĐH Bách Khoa, ĐH KHTN, UEH, UIT...). Dự án giải quyết bài toán tìm đồ theo trường/ký túc xá, đăng bán nhanh dưới 60 giây, kết nối hẹn gặp an toàn và minh bạch hóa lịch sử món đồ qua **Digital Product Passport (Hộ chiếu đồ vật số)** tích hợp **Avalanche Fuji C-Chain (Chain ID `43113`)**.

> **Kiến trúc lai Off-chain ↔ On-chain:** Các thao tác vận hành web (tin đăng, lịch hẹn, đánh giá, ảnh, thông tin cá nhân) lưu trữ và truy vấn tốc độ cao trên **PostgreSQL (Supabase + Prisma ORM)**. Chuỗi lịch sử định danh và chuyển giao quyền sở hữu **Product Passport** được Relayer tự động neo bất biến lên **Avalanche Fuji Testnet** (ví Relayer tài trợ phí gas AVAX hộ sinh viên) và kiểm chứng công khai qua **Snowtrace Fuji Explorer**.

---

## Tính năng chính đã triển khai

### 1. Khám phá, tìm kiếm & lọc theo trường / KTX
- Tìm kiếm tiếng Việt **có dấu hoặc không dấu** theo tiêu đề, mô tả, danh mục và trường/KTX.
- Lọc đa tiêu chí: Trường/Ký túc xá, Danh mục (`Giáo trình & Sách học`, `Bàn ghế & Tủ KTX`, `Đồ gia dụng & Quạt điện`, `Đồ điện tử & Phụ kiện`, `Xe đạp & Phương tiện`, `Góc 0đ Cho Tặng`), tình trạng, khoảng giá, đồ tặng `0đ`, món đồ có **Product Passport** và ưu tiên tin của sinh viên đã xác minh (`BR19`).

### 2. Định danh sinh viên & bảo vệ dữ liệu cá nhân
- Đăng nhập bằng **Google OAuth** (Supabase Auth) hoặc **Email/Mật khẩu**, hỗ trợ đăng nhập nhanh 1-Click với các tài khoản mẫu dùng thử.
- Xác minh sinh viên (`/verify-student`) qua email `.edu.vn` hoặc gửi ảnh thẻ sinh viên cho Admin duyệt; **ảnh thẻ sinh viên được xóa tự động ngay sau khi duyệt** theo Nghị định 13/2023/NĐ-CP.
- Xóa tài khoản tại `/settings` với cơ chế **Crypto-shredding (`BR34`)**: gỡ liên kết định danh (`userId = null`, `showName = false`), ẩn danh hóa lịch sử mà không làm đứt chuỗi vòng đời Passport.

### 3. Đăng bán siêu tốc (< 60s) & bán lại 1-chạm
- Form đăng tin (`/sell`) tự động nén ảnh qua HTML5 Canvas trên trình duyệt (tối đa 5 ảnh - `BR16`), tính mã băm toàn vẹn `SHA-256` cho từng ảnh, kiểm tra từ khóa hàng cấm (`BR17`) và chống spam tối đa 10 tin/24h (`BR16`).
- **Bán lại 1-chạm (`/my-items` → `/sell?resellItemId=...`)**: Kế thừa nguyên vẹn mã `passportId` và chuỗi đời chủ sang người bán mới, yêu cầu tải lên bộ ảnh thực tế mới để người mua sau đối chiếu trực quan (`BR24`, `BR25`, `BR33`).

### 4. Liên hệ Zalo bảo mật & chốt bán Zalo 24h
- Bảo vệ số điện thoại sinh viên (`BR36`): SĐT Zalo không bị nhúng công khai vào HTML cho khách vãng lai khi bật ẩn SĐT; mọi lượt mở liên hệ đi qua `/api/zalo/[listingId]` (bắt buộc đăng nhập, giới hạn tốc độ 20 lượt/phút/tài khoản), hiển thị mã QR Zalo, số điện thoại (hoặc số đã che) và tự động sao chép lời nhắn gợi ý.
- **Lời mời chốt bán Zalo (`BR38`)**: Người bán tạo link/mã QR chốt đơn dùng một lần (hạn 24 giờ) gửi qua Zalo; khi người mua xác nhận mua tại `/invites/[code]`, tin đăng tự chuyển ngay sang giữ chỗ (`RESERVED`).

### 5. Đặt lịch hẹn trao tay, xác nhận 2 chiều 48h & Blind Review
- Đặt lịch hẹn xem đồ tại cổng KTX, thư viện, căng tin (`/products/[id]` → `/orders/[id]`).
- Khi người bán chấp nhận hẹn (`ACCEPTED`), tin đăng tự chuyển sang giữ chỗ độc quyền (`RESERVED`) và tự động từ chối các yêu cầu chờ khác (`BR11`).
- Tự động xử lý timeout qua `/api/cron/reconcile`: tin đăng quá hạn 30 ngày (`BR15`), giữ chỗ quá giờ hẹn 24h (`BR37`), và tự động tất toán đơn sau 48h chờ xác nhận (`BR13`).
- Hỗ trợ người mua gửi khiếu nại **"Tôi chưa nhận hàng"** (`DISPUTED`) để chặn tự hoàn tất và chuyển Ban Quản Trị phân xử trong SLA 72h.
- **Đánh giá uy tín bí mật đối ứng 48h (Blind Review - `BR14`)**: Chỉ công khai nhận xét khi cả hai bên đã đánh giá hoặc sau 48 giờ.

### 6. Digital Product Passport & Blockchain Avalanche Fuji Testnet
- **Hộ chiếu đồ vật (`/passport/[id]`)**:
  - Hiển thị mã định danh `bytes32` (`passportId`), mã QR số toàn màn hình để đối chiếu trực tiếp khi gặp mặt tại KTX, tuyên bố giới hạn trách nhiệm bắt buộc (`BR30`: Passport không phải chứng thư giám định chất lượng hay bảo hành vật lý).
  - Timeline chuỗi đời chủ (`Đời chủ #1 ➔ Đời chủ #2...`) kèm chế độ ẩn danh mặc định (`BR29`), mức xác nhận bàn giao (`BOTH` / `ONE_SIDE` - `BR31`) và ảnh đối chiếu qua từng đời chủ (`BR24`).
- **Tích hợp Avalanche Fuji C-Chain (Chain ID `43113`)**:
  - Hỗ trợ Smart Contract `contracts/UniCyclePassport.sol` (`register`, `transfer`, `flag`, `unflag`) và cơ chế **2 lớp On-Chain** (Smart Contract Call + On-Chain Calldata Anchor qua `viem`) để Ví Chủ Relayer tự động trả phí gas AVAX hộ sinh viên và ghi nhận `txHash` thật lên Fuji ngay khi đăng tin hoặc hoàn tất đơn hàng.
  - Nút **"Xác minh trực tiếp trên Blockchain (Fuji RPC)"** đối chiếu 5 tiêu chí giữa PostgreSQL và Avalanche Fuji RPC, kèm link mở xem trực tiếp biên lai giao dịch trên **Snowtrace Fuji Testnet Explorer** (`https://testnet.snowtrace.io/tx/...`) ngay tại trang Passport, từng Đời chủ trên Timeline, Modal đăng tin thành công, Chi tiết đơn hàng và Đồ của tôi.

### 7. Trung tâm Quản trị & Kiểm duyệt (`/admin`)
- Phân xử đơn tranh chấp `DISPUTED` (chốt hoàn tất chuyển giao Passport hoặc hủy mở bán lại).
- Gắn/gỡ cờ vi phạm Passport (`FLAGGED` / `ACTIVE` - `BR39`) đồng thời ẩn tin đăng liên quan.
- Duyệt yêu cầu xác minh sinh viên, xử lý báo cáo vi phạm (`LISTING`, `USER`, `PASSPORT`) và theo dõi/kích hoạt lại hàng đợi giao dịch Avalanche Fuji (`ChainTx`).

---

## Ngăn xếp Công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng |
|---|---|
| **Framework** | [Next.js 16.4.5](https://nextjs.org/) (App Router, Webpack build), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Database & ORM** | PostgreSQL ([Supabase](https://supabase.com/)) + [Prisma ORM 6.4.1](https://www.prisma.io/) |
| **Authentication & Security** | Supabase Auth (Google OAuth), HMAC-SHA256 Session Cookie, `bcryptjs` |
| **Blockchain** | [Solidity 0.8.24](https://soliditylang.org/) (`contracts/UniCyclePassport.sol`), **Avalanche Fuji C-Chain (Chain ID: `43113`)**, [viem v2](https://viem.sh/), Snowtrace Fuji Explorer |

---

## Chạy dự án ở máy local

### 1. Yêu cầu môi trường
- **Node.js 20+** (khuyến nghị Node.js 20 hoặc 24) và `npm`
- Một database PostgreSQL (Supabase / PostgreSQL local)

### 2. Cài đặt thư viện
```bash
git clone https://github.com/Tran-Thi-Bich-Hanh/UniCycle.git
cd UniCycle
npm install
```

### 3. Cấu hình biến môi trường (`.env`)
Sao chép mẫu cấu hình từ `.env.example` sang `.env` và điền các giá trị phù hợp:

```env
# PostgreSQL (Supabase Pooler & Direct URL cho Prisma)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Auth & Storage
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# URL ứng dụng
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Avalanche Fuji Testnet (Chain ID: 43113)
NEXT_PUBLIC_AVALANCHE_FUJI_RPC="https://api.avax-test.network/ext/bc/C/rpc"
NEXT_PUBLIC_PASSPORT_CONTRACT_ADDRESS="0x..."   # Địa chỉ UniCyclePassport sau khi deploy (tùy chọn)
MASTER_WALLET_PRIVATE_KEY="0x..."               # Private Key ví Relayer testnet có AVAX Fuji trả gas hộ
```

> Lưu ý: Để bật ghi giao dịch thật lên Snowtrace Fuji Testnet, hãy cấp cho ví `MASTER_WALLET_PRIVATE_KEY` một ít AVAX thử nghiệm miễn phí tại Avalanche Fuji Faucet. Tham khảo hướng dẫn deploy contract tại [`contracts/DEPLOY_GUIDE.md`](./contracts/DEPLOY_GUIDE.md).

### 4. Khởi tạo Cơ sở dữ liệu & Seed dữ liệu mẫu
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5. Khởi chạy ứng dụng
```bash
npm run dev
```

Mở trình duyệt tại <http://localhost:3000>.

Các lệnh kiểm tra & build khác:
```bash
npm run lint     # Kiểm tra ESLint
npm run build    # Prisma generate + Next.js production build (--webpack)
npm start        # Chạy bản build production
```

---

## Tài khoản dùng thử & Kịch bản kiểm thử nhanh

Tại trang [`/login`](http://localhost:3000/login), hệ thống cung cấp sẵn 3 tài khoản mẫu đăng nhập **1-Click** (được tạo từ `prisma/seed.ts`):

| Vai trò | Tên hiển thị | Email | Mật khẩu |
|---|---|---|---|
| Sinh viên Bách Khoa | Nguyễn Hoàng Nam | `hoangnam.bka@gmail.com` | `Student@123456` |
| Sinh viên KHTN | Trần Hải Yến | `haiyen.khtn@gmail.com` | `Student@123456` |
| Quản trị viên | Ban Quản Trị UniCycle | `admin@unicycle.vn` | `Admin@123456` |

### Luồng kiểm thử tiêu biểu (A ➔ B ➔ Snowtrace Fuji)
1. Đăng nhập bằng tài khoản **Trần Hải Yến** ➔ vào `/sell` ➔ đăng 1 món đồ mới có bật **Digital Product Passport**.
2. Ngay trong popup thành công, bấm **"Xem Passport ↗"** để mở `/passport/[id]` và bấm **"Xem trực tiếp trên Snowtrace Fuji ↗"** để đối chiếu mã giao dịch `REGISTER` trên `https://testnet.snowtrace.io/tx/...`.
3. Chuyển sang tài khoản **Nguyễn Hoàng Nam** ➔ mở sản phẩm ➔ thử **"Nhắn Zalo"** và **"Đặt lịch hẹn"**.
4. Hai bên lần lượt xác nhận **Chấp nhận giữ đồ** ➔ **Xác nhận bàn giao / Đã nhận đồ** tại `/orders/[id]` ➔ đơn chuyển `COMPLETED` và Passport tự động chuyển sang **Đời chủ #2**, hiển thị tại `/my-items` kèm nút **Bán lại 1-chạm** và mã giao dịch `TRANSFER` trên Snowtrace Fuji.

---

## Cấu trúc thư mục dự án

```text
app/                     # Next.js App Router (Pages & API Route Handlers)
├── admin/               # Trang quản trị & phân xử tranh chấp SLA 72h
├── api/                 # API endpoints (auth, listings, orders, invites, passport, zalo, admin, cron)
├── categories/[slug]/   # Danh sách sản phẩm theo danh mục
├── invites/[code]/      # Xác nhận lời mời chốt bán Zalo 24h (BR38)
├── my-items/            # Tủ đồ đang sở hữu, QR số & Bán lại 1-chạm
├── my-products/         # Quản lý tin đăng & tạo link chốt bán Zalo
├── orders/              # Quản lý đơn hẹn, bàn giao 48h, khiếu nại & Blind Review
├── passport/[id]/       # Tra cứu Hộ chiếu số & kiểm chứng Avalanche Fuji
├── products/            # Sàn sản phẩm & trang chi tiết sản phẩm
├── sell/                # Đăng bán / tặng đồ & Bán lại kế thừa Passport
├── users/[id]/          # Hồ sơ công khai & đánh giá uy tín sinh viên
└── verify-student/      # Xác minh danh tính sinh viên
components/              # UI Components theo từng phân hệ chức năng
contracts/               # Smart Contract UniCyclePassport.sol & hướng dẫn deploy Fuji
docs/                    # Tài liệu đặc tả nghiệp vụ, kiến trúc, CSDL & UI/UX
lib/
├── blockchain/          # ABI, Relayer phát sóng giao dịch & Verifier đối chiếu Fuji RPC
├── data/                # Dữ liệu fallback khi offline
└── utils/               # Helper chuyển giao Passport, timeout 24h/48h/30d, nén ảnh, tiếng Việt
prisma/                  # Prisma Schema (schema.prisma) & dữ liệu mẫu (seed.ts)
public/                  # Tài nguyên tĩnh (logo, icon, hình ảnh)
```

### Tài liệu thiết kế chi tiết trong thư mục `docs/`
- [Tổng quan dự án](./docs/project-overview.md)
- [Phân tích yêu cầu](./docs/requirements.md)
- [Quy tắc nghiệp vụ](./docs/business-rules.md)
- [Luồng người dùng](./docs/user-flow.md)
- [Kiến trúc thông tin](./docs/information-architecture.md)
- [Thiết kế hệ thống & CSDL](./docs/system-design.md)
- [Kiến trúc kỹ thuật](./docs/technical-architecture.md)
- [Tích hợp Avalanche & Product Passport](./docs/blockchain-passport.md)
- [Thiết kế giao diện & trải nghiệm (UI/UX)](./docs/ui-ux.md)
- [Kế hoạch phát triển dự án](./docs/project-planning.md)
- [Hướng dẫn Deploy Contract trên Avalanche Fuji](./contracts/DEPLOY_GUIDE.md)

---

## Bản quyền

UniCycle được phát triển bởi **UniCycle Team H.Y** cho cộng đồng sinh viên.
