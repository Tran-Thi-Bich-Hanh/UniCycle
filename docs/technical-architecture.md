## 9. Kiến trúc kỹ thuật đề xuất

> Đây là gợi ý; chọn công nghệ theo kỹ năng của nhóm.

| Lớp | Gợi ý |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS; SSR cho trang công khai (SEO, Open Graph khi chia sẻ link, trang passport) |
| Backend | Next.js API / Route Handlers (Node.js, TypeScript) |
| CSDL | PostgreSQL (hỗ trợ full-text search + extension `unaccent` cho tìm kiếm tiếng Việt không dấu) |
| ORM | Prisma hoặc Drizzle ORM |
| Xác thực | Đăng nhập Google (Google OAuth / NextAuth.js / Supabase Auth) + Email & Mật khẩu; Xác minh sinh viên (thẻ SV hoặc email trường) để cấp huy hiệu |
| Lưu ảnh | Cloudinary hoặc Supabase Storage / S3-compatible; nén ảnh phía client, tạo thumbnail |
| Kênh liên hệ | **Ưu tiên MVP: Zalo Deep link (`zalo.me/<sdt>`)** kèm tin nhắn mẫu + Form đặt lịch hẹn xem hàng tại cổng trường/KTX |
| Chat realtime (P1) | Supabase Realtime hoặc Socket.IO (khi cần mở rộng sau MVP) |
| Thông báo | Email thông báo (Resend); thông báo trong ứng dụng |
| Job nền | Cron / Queue (pg-boss hoặc BullMQ / Vercel Cron) xử lý hết hạn đơn, tự động hoàn tất sau 48h (BR13) |
| **Digital Passport (MVP)** | **Lưu trữ CSDL PostgreSQL (bảng `items`, `passport_owners`, `passport_events`), tạo mã QR số động bằng thư viện `qrcode` hiển thị trên màn hình** |
| **Blockchain (P1)** | **Avalanche C-Chain (tương thích EVM); phát triển/demo trên Fuji testnet, pilot trên mainnet** |
| **Smart contract (P1)** | **Solidity + Hardhat/Foundry; OpenZeppelin (`AccessControl`); xác minh mã nguồn trên Snowtrace** |
| **Tương tác chain (P1)** | **viem hoặc ethers.js; ví relayer (có `RECORDER_ROLE`) trả phí gas bằng AVAX; khóa bí mật lưu an toàn trong KMS/Secret Manager** |
| Triển khai | Vercel (frontend & API) + managed PostgreSQL (Neon / Supabase); worker cron gọn nhẹ |
| Giám sát | Sentry, log có cấu trúc, Google Analytics / PostHog |

### Sơ đồ luồng ghi chain (Giai đoạn P1)

```
Đơn COMPLETED (trên web)
   │ (transaction DB: tạo passport_events + chain_txs = QUEUED)
   ▼
Worker (một luồng/passport)
   │ lấy chain_txs QUEUED → ký bằng ví relayer
   ▼
Contract trên Avalanche  ──(sự kiện)──▶ Block explorer / RPC
   │
   ▼
Worker nhận receipt → chain_txs = CONFIRMED, lưu tx_hash
   │
   ▼
Thông báo cho hai bên + hiển thị mã kiểm chứng on-chain trên /passport/[id]
```

### Thiết kế API (nhóm endpoint chính)

| Nhóm | Ví dụ |
|---|---|
| Auth | `POST /auth/login/google`, `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-student` (upload thẻ SV hoặc email trường) |
| Listings | `GET /listings`, `GET /listings/:id`, `POST /listings` (kèm Zalo phone, Digital Passport), `PATCH /listings/:id`, `POST /listings/:id/mark-sold` |
| Orders | `POST /listings/:id/orders` (đặt lịch hẹn), `POST /orders/:id/accept`, `.../reject`, `.../cancel`, `.../confirm` |
| Reviews | `POST /orders/:id/reviews`, `GET /users/:id/reviews` (chu kỳ 48h blind) |
| **Passport** | **`GET /passports/:id` (timeline công khai), `GET /me/items` (danh sách đồ của tôi), `POST /items/:id/resell` (bán lại 1-click), `GET /items/:id/qr` (QR số màn hình), `GET /passports/:id/verify` (ở P1)** |
| **Chuyển quyền** | **`POST /items/:id/transfer` (tạo mã), `POST /transfers/:code/accept`, `POST /transfers/:id/cancel`** |
| Reports | `POST /reports` (báo cáo tin/người dùng/passport nghi vấn) |
| Admin | `GET /admin/reports`, `POST /admin/listings/:id/hide`, `POST /admin/users/:id/suspend`, `POST /admin/passports/:id/flag` |

---