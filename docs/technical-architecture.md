## 9. Kiến trúc kỹ thuật đề xuất

> Đây là gợi ý; chọn công nghệ theo kỹ năng của nhóm.

| Lớp | Gợi ý |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS; SSR cho trang công khai (SEO, Open Graph khi chia sẻ link, trang passport) |
| Backend | Next.js API / Route Handlers (Node.js, TypeScript) |
| CSDL | PostgreSQL (hỗ trợ full-text search + extension `unaccent` cho tìm kiếm tiếng Việt không dấu) |
| ORM | Prisma hoặc Drizzle ORM |
| Xác thực | Đăng nhập Google (Google OAuth / NextAuth.js / Supabase Auth) + Email & Mật khẩu; Xác minh sinh viên (thẻ SV hoặc email trường) để cấp huy hiệu. **Chính sách riêng tư:** Ảnh chụp thẻ sinh viên được tự động xóa vĩnh viễn khỏi Storage ngay sau khi Admin phê duyệt (tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân). |
| Lưu ảnh | Cloudinary hoặc Supabase Storage / S3-compatible; nén ảnh phía client, tạo thumbnail |
| Kênh liên hệ | **Ưu tiên MVP: Zalo Deep link** kèm tin nhắn mẫu + Form đặt lịch hẹn xem hàng tại cổng trường/KTX. Route trung gian `/api/zalo/[listingId]` để chống thu thập SĐT hàng loạt; rate limit 10 lượt/giờ/tài khoản (gợi ý); người bán có thể chọn ẩn số điện thoại công khai. |
| Chat realtime (P1) | Supabase Realtime hoặc Socket.IO (khi cần mở rộng sau MVP) |
| Thông báo | Email thông báo (Resend); thông báo trong ứng dụng |
| Job nền | **`pg_cron` (Supabase / PostgreSQL extension)** hoặc **GitHub Actions Scheduled Workflows** (chạy mỗi 1-2 giờ gọi Route Handler bảo mật với `CRON_SECRET`) để quét hết hạn đơn `PENDING` (> 48h), timeout đơn `ACCEPTED` sau `meet_time + 24h` (BR37), tự hoàn tất sau 48h (BR13), và timeout đơn `DISPUTED` quá SLA 72h (tự chuyển `CANCELLED`, nhả `AVAILABLE`). *(Tránh dùng BullMQ trên Vercel do thiếu process thường trực; Vercel Cron Hobby bị giới hạn tần suất 1 lần/ngày)*. |
| **Digital Passport (MVP)** | **Lưu trữ CSDL PostgreSQL (bảng `items`, `passport_owners`, `passport_events`), tạo mã QR số động bằng thư viện `qrcode` hiển thị trên màn hình** |
| **Blockchain (P1)** | **Avalanche C-Chain (tương thích EVM); phát triển/demo trên Fuji testnet, pilot trên mainnet** |
| **Smart contract (P1)** | **Solidity + Hardhat/Foundry; OpenZeppelin (`AccessControl`); xác minh mã nguồn trên Snowtrace** |
| **Tương tác chain (P1)** | **viem hoặc ethers.js; ví relayer (có `RECORDER_ROLE`) trả phí gas bằng AVAX; khóa bí mật lưu trong KMS/Secret Manager; serialize giao dịch tuần tự theo ví relayer (quản lý transaction queue để tránh đụng nonce và tranh chấp gas)** |
| Triển khai | Vercel (frontend & API) + managed PostgreSQL (Neon / Supabase); cron job qua `pg_cron` / GitHub Actions |
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
| Zalo Proxy & Invites | `GET /api/zalo/:listingId` (route trung gian bảo mật mở Zalo; trả 401 kèm `returnTo` nếu chưa đăng nhập để frontend mở popup), `POST /listings/:id/invites` (tạo lời mời chốt bán BR38), `POST /invites/:code/accept` (người mua chấp nhận lời mời) |
| Orders | `POST /listings/:id/orders` (đặt lịch hẹn), `POST /orders/:id/accept`, `.../reject`, `.../cancel`, `.../confirm`, **`POST /orders/:id/dispute` (khiếu nại "Tôi chưa nhận hàng", chặn auto-complete)** |
| Reviews | `POST /orders/:id/reviews`, `GET /users/:id/reviews` (chu kỳ 48h blind) |
| **Passport** | **`GET /passports/:id` (timeline công khai), `GET /me/items` (danh sách đồ của tôi), `POST /items/:id/resell` (bán lại 1-click), `GET /items/:id/qr` (QR số màn hình), `GET /passports/:id/verify` (ở P1)** |
| **Chuyển quyền (P1)** | **`POST /items/:id/transfer` (tạo mã), `POST /transfers/:code/accept`, `POST /transfers/:id/cancel`** |
| Reports | `POST /reports` (báo cáo tin/người dùng/passport nghi vấn) |
| Admin | `GET /admin/reports`, `POST /admin/listings/:id/hide`, `POST /admin/users/:id/suspend`, `POST /admin/orders/:id/resolve-dispute`, `POST /admin/passports/:id/flag` |

---