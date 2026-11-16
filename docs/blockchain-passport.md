## Tích hợp Avalanche & Lịch sử đồ vật (Digital Product Passport)

> **Lộ trình triển khai:**
> - **Giai đoạn MVP (Web-First)**: Tính năng Lịch sử đồ vật (Digital Passport) được quản lý tập trung và lưu trữ minh bạch trong cơ sở dữ liệu hệ thống (PostgreSQL). Mã QR là mã số điện tử hiển thị trực tiếp trên màn hình điện thoại/web (không bắt buộc in dán vật lý).
> - **Giai đoạn P1**: Kích hoạt module tích hợp **Avalanche C-Chain** (Fuji testnet → Mainnet) để neo (anchor) và bảo chứng bất biến chuỗi chuyển giao quyền sở hữu mà không cần sửa đổi kiến trúc dữ liệu cốt lõi.

### 1. Blockchain làm được gì, không làm được gì

**Làm được (khi kích hoạt ở P1):**
- Ghi lại chuỗi chuyển giao quyền sở hữu (Chủ #1 → #2 → #3) theo thứ tự, có thời điểm, **không thể bị sửa hoặc xóa sau khi ghi**.
- Cho phép **bất kỳ ai kiểm chứng độc lập** dữ liệu lịch sử mà không cần tin hoàn toàn vào UniCycle (đọc sự kiện từ chain và so với trang hiển thị).
- Bắt buộc tính nhất quán: một chuyển giao chỉ hợp lệ nếu người chuyển đúng là chủ hiện tại trên chain.

**Không làm được (cần nói thẳng với người dùng và trong tài liệu):**
- Không biết món đồ ngoài đời có thực sự là món gắn với passport hay không (vấn đề "oracle"). Cần ảnh thật, mã QR hiển thị màn hình đối chiếu, serial/IMEI với đồ giá trị cao để giảm rủi ro.
- Không biết người đăng ký đầu tiên có phải chủ hợp pháp hay không. Cần xác minh tài khoản sinh viên, báo cáo, flag.
- Không đảm bảo chất lượng, tình trạng hay giá hợp lý của món đồ.
- Ở giai đoạn đầu, backend UniCycle là bên gọi hợp đồng thay cho người dùng, nên blockchain đem lại **tính không thể sửa và khả năng kiểm chứng công khai**, chưa phải "hoàn toàn phi tập trung". Muốn tiến xa hơn, cần người dùng tự ký xác nhận qua ví nhúng (P2).

> Cách nói trung thực với người dùng: **"Lịch sử chuyển giao được ghi nhận minh bạch và không thể sửa đổi"**, không phải **"hàng đã được thẩm định chất lượng"**.

### 2. Kiến trúc lai (hybrid)

| Dữ liệu | Lưu ở đâu | Lý do |
|---|---|---|
| Thông tin món đồ, ảnh, mô tả, giá, tên người dùng, đánh giá | PostgreSQL / lưu trữ ảnh (off-chain) | Cần sửa, xóa, truy vấn nhanh, bảo vệ dữ liệu cá nhân |
| Passport ID, pseudonym chủ sở hữu (hash), hash cam kết món đồ, hash đơn hàng, mức xác nhận, thời điểm | Avalanche (on-chain) | Cần bất biến và kiểm chứng công khai |
| Ánh xạ pseudonym ↔ tài khoản | PostgreSQL (bí mật, xóa được) | Quyền riêng tư, crypto-shredding |

Nguyên tắc: **DB là nguồn dữ liệu chính để vận hành; chain là bằng chứng đối chiếu**. Người dùng thấy lịch sử nhanh từ DB, và nút "Xác minh" so khớp với chain.

### 3. Smart contract đề xuất (bản phác thảo)

Một hợp đồng nhỏ, chỉ lưu trạng thái tối thiểu và phát sự kiện (rẻ hơn lưu dữ liệu).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract UniCyclePassport is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    struct Passport {
        bytes32 itemCommit;      // hash cam kết thông tin món đồ (có salt, giữ off-chain)
        bytes32 currentOwner;    // pseudonym hash của chủ hiện tại
        uint32  transferCount;
        bool    flagged;
        bool    exists;
    }

    mapping(bytes32 => Passport) public passports;

    event PassportRegistered(
        bytes32 indexed passportId,
        bytes32 indexed ownerHash,
        bytes32 itemCommit,
        uint64 timestamp
    );

    event OwnershipTransferred(
        bytes32 indexed passportId,
        bytes32 indexed fromHash,
        bytes32 indexed toHash,
        bytes32 orderHash,        // hash của (orderId, secret); không lộ dữ liệu đơn
        uint32  seq,              // số thứ tự chuyển giao
        uint8   confirmation,     // 1 = hai bên xác nhận, 2 = một bên (tự hoàn tất)
        uint64  timestamp
    );

    event PassportFlagged(bytes32 indexed passportId, bytes32 reasonHash, uint64 timestamp);
    event PassportUnflagged(bytes32 indexed passportId, uint64 timestamp);

    constructor(address admin, address recorder) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, recorder);
    }

    function register(bytes32 passportId, bytes32 ownerHash, bytes32 itemCommit)
        external onlyRole(RECORDER_ROLE)
    {
        require(!passports[passportId].exists, "already registered");
        passports[passportId] = Passport(itemCommit, ownerHash, 0, false, true);
        emit PassportRegistered(passportId, ownerHash, itemCommit, uint64(block.timestamp));
    }

    function transfer(
        bytes32 passportId,
        bytes32 fromHash,
        bytes32 toHash,
        bytes32 orderHash,
        uint8 confirmation
    ) external onlyRole(RECORDER_ROLE) {
        Passport storage p = passports[passportId];
        require(p.exists, "no passport");
        require(!p.flagged, "passport flagged");
        require(confirmation == 1 || confirmation == 2, "invalid confirmation");
        require(p.currentOwner == fromHash, "not current owner");
        require(toHash != fromHash, "same owner");
        p.currentOwner = toHash;
        p.transferCount += 1;
        emit OwnershipTransferred(
            passportId, fromHash, toHash, orderHash,
            p.transferCount, confirmation, uint64(block.timestamp)
        );
    }

    function flag(bytes32 passportId, bytes32 reasonHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(passports[passportId].exists, "no passport");
        passports[passportId].flagged = true;
        emit PassportFlagged(passportId, reasonHash, uint64(block.timestamp));
    }

    function unflag(bytes32 passportId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(passports[passportId].exists, "no passport");
        passports[passportId].flagged = false;
        emit PassportUnflagged(passportId, uint64(block.timestamp));
    }
}
```

> Đây là phác thảo để minh họa thiết kế, **cần được viết test, review và kiểm tra bảo mật trước khi dùng thật**. Hợp đồng không lưu tên, giá, ảnh hay dữ liệu cá nhân.

### 4. Pseudonym và quyền riêng tư

- **Owner hash ngẫu nhiên theo từng món đồ:** `ownerHash` là một giá trị ngẫu nhiên cryptographically secure (32 bytes) được sinh riêng cho mỗi cặp (user, item) khi phát sinh quyền sở hữu và lưu trong bảng `passport_owners`. Do không dùng công thức dẫn xuất toán học từ `userId`, ngay cả khi lộ database cũng không thể liên kết các món đồ khác nhau của cùng một người trên blockchain.
- **Order hash:** `orderHash = keccak256(orderId ‖ randomSalt)`; không lộ mã đơn hay giá.
- **Hiển thị công khai (BR29):** "Chủ #n · Trường · Tháng/Năm". Người dùng có thể bật "hiển thị tên của tôi trong lịch sử đồ vật" (mặc định tắt).
- **Xóa tài khoản (BR34):** Xóa dòng ánh xạ trong bảng `passport_owners` (crypto-shredding). Vì `ownerHash` là số ngẫu nhiên lưu độc lập, khi đã xóa mapping thì vĩnh viễn không còn cách nào truy ngược từ hash on-chain về danh tính thật.
- **Không ghi lên chain:** tên, email, SĐT, MSSV, ảnh, giá, nội dung đánh giá (BR27).

### 5. Gắn passport với món đồ (Định danh số & Đối chiếu khi Bán lại)

Passport có ý nghĩa liên kết chặt chẽ với món đồ qua 2 mức định danh số:

| Mức | Dùng cho | Cách nhận diện & Đối chiếu | `itemCommit` gồm |
|---|---|---|---|
| **LIGHT** (mặc định) | Đa số đồ (bàn, ghế, quạt, giáo trình) | Ảnh chụp sản phẩm thật + **mã QR số hiển thị trực tiếp trên màn hình điện thoại/web** (không cần in dán vật lý) | `hash(passportId ‖ category ‖ hash các ảnh ‖ salt)` |
| **SERIAL** (khuyến nghị cho đồ giá trị cao) | Laptop, điện thoại, máy tính Casio, xe máy | LIGHT + đối chiếu số serial/IMEI có sẵn của nhà sản xuất | LIGHT + `hash(serial chuẩn hóa ‖ salt)` |

**Cơ chế đối chiếu ảnh khi "Bán lại" (Resell)**:
- Mỗi khi bán lại qua các đời chủ, người bán bắt buộc phải chụp bộ ảnh mới. Hệ thống tính hash SHA-256 cho từng ảnh và lưu vào `listing_images.sha256`.
- Người mua đối chiếu trực quan ảnh hiện tại với ảnh của các chủ trước trên timeline lịch sử để nhận biết độ hao mòn thực tế, đồng thời hệ thống kiểm chứng tính toàn vẹn của dữ liệu bằng mã hash.
- Mã QR số trỏ tới URL `unicycle.vn/passport/[id]`. Khi gặp mặt giao dịch, mở màn hình điện thoại cho người mua quét đối chiếu ngay tức thì.

### 6. Chi tiết luồng ghi chain

**Lần đầu (đăng ký + chuyển giao #1):**

1. Đơn đầu tiên của món đồ chuyển `COMPLETED`/`AUTO_COMPLETED`.
2. Trong một transaction DB: tạo `passport_events` (REGISTERED, TRANSFERRED #1) và `chain_txs` = `QUEUED`.
3. Worker lấy việc, gọi `register(passportId, hash(A), itemCommit)` rồi `transfer(passportId, hash(A), hash(B), orderHash, confirmation)`.
4. Chờ receipt; lưu `tx_hash`; `chain_txs = CONFIRMED`.
5. Thông báo cho hai bên; cập nhật trang passport.

**Các lần sau (bán lại):** chỉ gọi `transfer(...)`.

**Chuyển quyền trực tiếp:** giống trên nhưng không có `order_id`; `orderHash` được tạo từ mã chuyển quyền.

**Xử lý lỗi:**
- Tx thất bại → `FAILED`, thử lại với backoff (tối đa 3 lần); vẫn lỗi → `NEEDS_ATTENTION`, báo admin.
- Hợp đồng revert vì `not current owner` → đánh dấu bất nhất (DB lệch chain), admin điều tra; không tự ý sửa.
- Chủ động xử lý trùng (idempotency): mỗi `chain_txs` có `payload_hash` để tránh gửi lặp.

### 7. Giao diện xác minh

- **Trang `/passport/[id]`:** timeline Chủ #1 → #2 → #3 (ví dụ ở mục 5.5), mức xác nhận ("hai bên"/"một bên"), link tới tx trên block explorer, cảnh báo nếu bị flag, tuyên bố giới hạn (BR30).
- **Nút "Xác minh trên blockchain":** đọc các sự kiện `PassportRegistered` / `OwnershipTransferred` của passport từ RPC, so với dữ liệu hiển thị; trả về "Khớp ✓" hoặc "Không khớp, đã báo quản trị".
- **Trên tin đăng:** huy hiệu "Có lịch sử đồ vật", số chủ, thời điểm chuyển giao gần nhất; tin có passport bị flag hiển thị cảnh báo nổi bật.
- **Trong "Đồ của tôi":** danh sách món đồ, trạng thái chain ("Đang ghi…/Đã xác nhận"), nút Bán lại, Chuyển quyền, Tải QR.

### 8. Mạng, chi phí và triển khai

| Hạng mục | Đề xuất |
|---|---|
| Mạng | Avalanche **C-Chain** (EVM): dùng Solidity, công cụ Ethereum quen thuộc |
| Phát triển, demo, kiểm thử | **Fuji testnet** (AVAX testnet lấy từ faucet) |
| Pilot với người dùng thật | **Mainnet C-Chain** nếu muốn bằng chứng thật; phí mỗi giao dịch rất thấp nên một quỹ AVAX nhỏ cho relayer là đủ ở quy mô pilot (ước lượng bằng số tx thực tế sau khi chạy thử trên Fuji) |
| Người dùng trả phí? | **Không.** Relayer trả phí gas; người dùng không cần ví, không cần biết blockchain |
| Xác minh mã nguồn | Đăng mã nguồn lên block explorer của Avalanche để ai cũng đọc được logic |
| Khả năng nâng cấp | Hợp đồng đơn giản, không dùng proxy ở MVP; nếu cần đổi, triển khai hợp đồng mới, cập nhật địa chỉ trong cấu hình và giữ địa chỉ cũ để kiểm chứng lịch sử cũ |

### 9. Hướng phát triển (sau MVP)

| Hạng mục | Mô tả | Ưu tiên |
|---|---|---|
| Người dùng tự ký chuyển giao | Dùng ví nhúng (embedded wallet): cả hai bên ký xác nhận (ví dụ chữ ký EIP-712), hợp đồng kiểm chữ ký; giảm phụ thuộc vào backend | P1 |
| Neo hash đánh giá/uy tín | Gom đánh giá thành lô, ghi Merkle root lên Avalanche; người dùng xác minh đánh giá bằng Merkle proof, không lộ nội dung | P1 |
| Ghi lịch sử bảo dưỡng | Đối tác (tiệm sửa, nhà bán) ghi sự kiện vào passport | P2 |
| Smart Escrow | Giữ tiền cho giao dịch từ xa/giao hàng | P2 |
| Avalanche L1 riêng | Cân nhắc khi lượng giao dịch lớn hoặc cần quy tắc phí riêng | P2 |

### 10. Lưu ý khi dùng trong đồ án

- Trình bày Passport như **tính năng chống chỉnh sửa lịch sử và kiểm chứng công khai**, không phải "xác thực hàng thật".
- **Lát cắt Blockchain tối thiểu (Minimal Slice) cho buổi bảo vệ đồ án**:
  - Triển khai contract `UniCyclePassport.sol` lên **Avalanche Fuji Testnet**.
  - Demo trọn vòng **A → B → C**: A đăng bán có passport ➔ B mua ➔ cập nhật timeline ➔ B bán lại cho C ➔ bấm nút "Xác minh trên blockchain" mở Snowtrace Fuji Explorer để đối chiếu tx hash thực tế.
  - Phân định rành mạch với hội đồng: MVP web chạy Off-chain trên PostgreSQL cho tốc độ cao và trải nghiệm không cần ví; lát cắt Blockchain trên Fuji chứng minh tính khả thi kỹ thuật cho bước mở rộng tiếp theo.
- Chuẩn bị sẵn câu trả lời cho các câu hỏi phản biện: "Nếu backend sai thì sao?" (nêu hướng ví nhúng EIP-712 ở P2), "Đồ giả/đồ trộm đăng ký passport thì sao?" (xác minh tài khoản, serial number, báo cáo và flag), "Dữ liệu cá nhân trên chain?" (chỉ hash ngẫu nhiên, crypto-shredding an toàn).
