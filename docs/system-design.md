## 7. Máy trạng thái (State Machine)

### 7.1. Sản phẩm (Listing)

```
DRAFT → AVAILABLE → RESERVED → SOLD
            ↑            │
            └────────────┘   (hủy giữ / no-show / hết hạn đơn)

AVAILABLE → HIDDEN (người bán tạm ẩn)
AVAILABLE → EXPIRED (quá 30 ngày; có thể gia hạn)
Mọi trạng thái → REMOVED (admin ẩn do vi phạm)
```

### 7.2. Yêu cầu/Đơn (Order)

```
PENDING ──(người bán chấp nhận)──→ ACCEPTED ──(cả hai xác nhận)──→ COMPLETED
   │                                  │
   ├─(người bán từ chối)──→ REJECTED  ├─(một bên hủy)──────────→ CANCELLED
   ├─(người mua hủy)──────→ CANCELLED ├─(no-show)──────────────→ CANCELLED (ghi nhận)
   ├─(quá 48 giờ)─────────→ EXPIRED   ├─(quá meet_time + 24h cả 2 im lặng)──→ EXPIRED (nhả RESERVED)
   └─(đơn khác được chấp nhận)→ REJECTED  │
                                      └─(1 bên xác nhận trước)─→ WAITING_CONFIRMATION
                                           ├─(bên kia xác nhận)──→ COMPLETED
                                           ├─(người mua khiếu nại "Tôi chưa nhận")──→ DISPUTED (Admin can thiệp)
                                           └─(im lặng quá 48h)───→ AUTO_COMPLETED
```

`COMPLETED` / `AUTO_COMPLETED` là điểm kích hoạt: mở cửa sổ đánh giá bí mật (trong 48 giờ) và cập nhật chuyển giao quyền sở hữu Digital Passport trong CSDL (và xếp hàng ghi chain ở P1).
`DISPUTED`: Đơn bị tạm dừng auto-complete, chuyển Admin xem xét bằng chứng và phân giải. Nút khiếu nại chỉ hiển thị cho người mua khi bên bấm xác nhận trước là người bán (`orders.confirmed_first_by = 'seller'`).

#### Đầu ra của DISPUTED

| Admin kết luận | Order | Listing | Passport | Uy tín |
|---|---|---|---|---|
| Người mua đã nhận hàng (khiếu nại sai) | `COMPLETED` | `SOLD` | Chuyển chủ, mức xác nhận “hai bên” | Ghi nhận khiếu nại sai cho người mua |
| Chưa giao hàng / giao không đúng | `CANCELLED` | Về `AVAILABLE` | Giữ nguyên chủ cũ | Ghi nhận lỗi cho người bán |
| Không đủ căn cứ | `CANCELLED` | Về `AVAILABLE` | Giữ nguyên chủ cũ | Không ghi nhận |

- **SLA xử lý**: Admin xử lý trong **72 giờ**. Quá hạn 72 giờ mà chưa có kết luận phân giải thì hệ thống tự động chuyển đơn sang `CANCELLED` và nhả listing về `AVAILABLE` (vì chưa chứng minh được việc bàn giao).
- **Trạng thái tạm thời**: Trong lúc `DISPUTED`, passport chưa chuyển chủ và listing vẫn giữ ở trạng thái `RESERVED`.

### 7.3. Đánh giá (Review)

```
OPEN (trong 48 giờ) → SUBMITTED (ẩn đối ứng) → VISIBLE (khi cả hai nộp hoặc hết 48 giờ)
```

### 7.4. Digital Passport / quyền sở hữu

```
Giai đoạn MVP (Off-chain trong PostgreSQL):
NONE (không bật passport)
   │ (người bán bật khi đăng)
   ▼
ACTIVE (off-chain DB, chủ #1 = người bán, cấp passport_id + QR số trên màn hình)
   │ (mỗi lần giao dịch hoàn tất hoặc chuyển quyền)
   ▼
TRANSFERRED(n) ──(lặp lại các đời chủ)──→ TRANSFERRED(n+1)

Mọi trạng thái → FLAGGED (admin đánh dấu nghi vấn đồ mất cắp/gian lận)
FLAGGED ──(admin gỡ cờ)──→ trạng thái trước đó (ACTIVE hoặc TRANSFERRED(n))
Khi chủ hiện tại xóa tài khoản → ARCHIVED_OWNER_DELETED (đóng băng, không cho bán lại)

Giai đoạn P1 (Kích hoạt Avalanche C-Chain):
Đồng bộ các sự kiện chuyển giao lên Smart Contract (REGISTERED → TRANSFERRED on-chain).
```

> **Lưu ý kiểm soát dữ liệu MVP**: Ở giai đoạn MVP, toàn bộ dữ liệu Digital Passport nằm trong cơ sở dữ liệu PostgreSQL. Do đó, quản trị viên (Admin) hoàn toàn có thể can thiệp xử lý các trường hợp khiếu nại (`DISPUTED`), hỗ trợ điều chỉnh sai sót hoặc hoàn tác dữ liệu trước khi kích hoạt tính năng bất biến trên Blockchain ở giai đoạn P1.

### 7.5. Giao dịch ghi chain (Chain Tx)

```
QUEUED → SUBMITTED → CONFIRMED
            │
            └→ FAILED ──(thử lại ≤ 3 lần, backoff)──→ SUBMITTED
                  │
                  └─(vẫn lỗi)→ NEEDS_ATTENTION (admin xử lý thủ công)
```

Quy tắc: tại một thời điểm chỉ một tx đang xử lý cho mỗi passport (tránh sai thứ tự `seq`). Giao diện hiển thị: "Đang ghi lên blockchain…" → "Đã xác nhận ✓".

---

## 8. Mô hình dữ liệu

### 8.1. Các thực thể và trường chính

| Bảng | Trường chính |
|---|---|
| `users` | id, email, auth_provider (google/email), is_student_verified (bool), student_card_url, display_name, avatar_url, school_id, dorm, role (user/admin), status, reputation_score, created_at, **deleted_at (timestamp, nullable)** |
| `schools` | id, name, email_domain, area |
| `categories` | id, name, slug |
| **`items`** | **id, current_owner_id, category_id, passport_enabled, passport_id (bytes32, unique, nullable), identity_level (LIGHT/SERIAL), item_commit (bytes32), item_salt (mã hóa, bí mật), passport_status (ACTIVE/FLAGGED/ARCHIVED_OWNER_DELETED), flag_reason (nullable), flagged_at, created_at** |
| `listings` | id, **item_id**, seller_id, title, category_id, price, is_free, condition, description, school_id/area, zalo_phone, hide_phone (bool), status, expires_at, created_at |
| `listing_images` | id, listing_id, url, **sha256**, position |
| `orders` | id, listing_id, buyer_id, seller_id, proposed_price, meet_place, meet_time, message, status (PENDING / ACCEPTED / WAITING_CONFIRMATION / COMPLETED / AUTO_COMPLETED / DISPUTED / REJECTED / CANCELLED / EXPIRED), confirmed_first_by (buyer/seller, nullable), buyer_confirmed_at, seller_confirmed_at, dispute_reason, disputed_at, resolved_by (nullable), resolved_at (nullable), resolution_note (nullable), expires_at, created_at |
| **`order_invites`** | **id, listing_id, code_hash, expires_at, status (PENDING/ACCEPTED/EXPIRED/REVOKED), accepted_by (user_id, nullable), created_at** |
| `reviews` | id, order_id, reviewer_id, reviewee_id, rating (1–5), comment, submitted_at, visible_at |
| `reports` | id, reporter_id, target_type (listing/user/passport), target_id, reason, status, handled_by, created_at |
| `notifications` | id, user_id, type, payload, read_at, created_at |
| **`passport_owners`** | **id, item_id, seq (1,2,3…), user_id (nullable, đặt NULL khi xóa tài khoản), owner_hash (bytes32, ngẫu nhiên per (user, item) để crypto-shredding an toàn), show_name (bool), since** |
| **`passport_events`** | **id, item_id, seq, event_type (REGISTERED/TRANSFERRED/FLAGGED/UNFLAGGED), from_owner_hash, to_owner_hash, order_id (nullable), transfer_kind (SALE/DIRECT), confirmation_level (BOTH/ONE_SIDE), actor_admin_id (nullable), reason (nullable), chain_tx_id, occurred_at** |
| **`chain_txs`** | **id, item_id, kind, payload_hash, status, tx_hash, attempts, last_error, submitted_at, confirmed_at** |
| **`direct_transfers` (P1)** | **id, item_id, from_user_id, to_user_id (nullable), code_hash, expires_at, status** |
| `favorites` (P1) | user_id, listing_id |
| `messages`, `conversations` (P1) | conversation_id, sender_id, content, created_at |
| `chain_anchors` (P1) | id, batch_hash (Merkle root), tx_hash, created_at |

### 8.2. Ràng buộc quan trọng (đi cùng Business Rules)

| Ràng buộc | Quy tắc liên quan |
|---|---|
| `CHECK (buyer_id <> seller_id)` trên `orders` | BR04 |
| Unique partial index: một `ACCEPTED` hoạt động duy nhất cho mỗi `listing_id` | BR11 |
| `UNIQUE (order_id, reviewer_id)` trên `reviews` | BR09 |
| Chỉ cho tạo review khi `orders.status IN (COMPLETED, AUTO_COMPLETED)` và reviewer là buyer hoặc seller | BR08 |
| Người dùng đã đăng nhập (qua Google hoặc email) được phép đăng bán; tài khoản có `is_student_verified = true` được gắn huy hiệu uy tín | BR19 |
| Listing có `item_id` với passport: kiểm tra `listings.seller_id = items.current_owner_id` thông qua **Database Transaction trong Application Layer hoặc PostgreSQL Trigger** (vì ràng buộc CHECK thuần túy không thể truy vấn xuyên bảng) | BR25 |
| Không tạo `orders` mới nếu `items.passport_status = FLAGGED` (kiểm tra trong Database Transaction ở tầng ứng dụng) | BR39 |
| `UNIQUE (item_id, seq)` trên `passport_owners` và `passport_events` | Thứ tự chuyển giao |
| `UNIQUE (passport_id)` trên `items` | BR33 |
| Mỗi `item_id` tối đa một `chain_txs` ở trạng thái `QUEUED`/`SUBMITTED` (ở P1) | Tránh sai thứ tự (mục 7.5) |
| Job định kỳ: hết hạn đơn `PENDING` > 48 giờ, timeout đơn `ACCEPTED` sau `meet_time + 24h` (BR37), tự hoàn tất sau 48h (BR13), timeout đơn `DISPUTED` sau 72h tự động CANCELLED và nhả `AVAILABLE`, hết hạn tin theo BR15, thử lại `chain_txs` FAILED (ở P1) | BR12, BR13, BR15, BR28, BR37 |
| Xóa tài khoản (`deleted_at`): đặt `passport_owners.user_id = NULL` và `show_name = false` (crypto-shredding nhưng giữ nguyên `owner_hash`, `seq`, `since` để bảo toàn timeline); chuyển các `items` đang sở hữu sang `ARCHIVED_OWNER_DELETED` | BR34 |
