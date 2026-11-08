# UniCycle - Design System

Tài liệu này định nghĩa ngôn ngữ giao diện cho UniCycle: một marketplace C2C dành cho sinh viên, ưu tiên cảm giác tin cậy, dễ đọc và thân thiện. Mọi màn hình mới nên dùng các token và quy tắc dưới đây thay vì tự tạo màu hoặc kiểu chữ riêng.

## 1. Định hướng thị giác

**Từ khóa:** tin cậy, gọn gàng, trẻ trung vừa phải, có hơi hướng bền vững.

- Dùng nền xanh xám rất nhạt để tách nội dung khỏi khung trình duyệt.
- Dùng xanh teal đậm làm màu thương hiệu duy nhất cho hành động chính.
- Dùng mint làm điểm nhấn cho trạng thái tích cực, không dùng nhiều màu cạnh tranh trong cùng một khu vực.
- Ưu tiên bề mặt phẳng, border nhẹ và shadow rất nhỏ. Không dùng gradient cho nút hoặc toàn trang.
- Hình ảnh sản phẩm là điểm nhấn chính; UI không được có quá nhiều badge, icon hoặc hiệu ứng.

## 2. Color tokens

| Token | Hex | Vai trò |
|---|---|---|
| `canvas` | `#F7F9FC` | Nền toàn trang |
| `surface` | `#FFFFFF` | Card, form, modal |
| `surface-subtle` | `#EAF2F4` | Nền khu vực phụ, hover nhẹ |
| `brand` | `#1F5E7A` | CTA chính, link, focus ring |
| `brand-strong` | `#174A61` | Hover/active của CTA |
| `accent` | `#5FB3A2` | Điểm nhấn bền vững, trạng thái thành công |
| `accent-subtle` | `#E6F4F1` | Nền badge/chip tích cực |
| `text` | `#102A43` | Heading và nội dung chính |
| `text-muted` | `#627D98` | Metadata, placeholder, mô tả phụ |
| `border` | `#D9E2EC` | Border và divider |
| `warning` | `#B7791F` | Cảnh báo và trạng thái giữ chỗ |
| `danger` | `#C05640` | Lỗi, xóa, hủy |

### Quy tắc dùng màu

- Chữ thường trên nền sáng phải đạt tương phản tối thiểu 4.5:1; không dùng `text-muted` cho nội dung quan trọng.
- Một khu vực chỉ nên có một màu hành động chính. `accent`, `warning` và `danger` chỉ mô tả trạng thái, không dùng làm CTA mặc định.
- Không truyền đạt trạng thái chỉ bằng màu; kết hợp với nhãn hoặc icon có tên truy cập được.
- Trạng thái focus dùng outline `2px` màu `brand`, có khoảng cách tối thiểu `2px` với control.

## 3. Typography

### Font family

- Font chính: system sans-serif ổn định; ưu tiên **Geist Sans** khi được tải qua `next/font`, fallback theo thứ tự `"Segoe UI", Arial, sans-serif`.
- Không trộn nhiều font sans-serif trong cùng một màn hình.
- Không dùng `font-black` cho heading. Độ đậm 600-700 đủ tạo phân cấp mà vẫn giữ cảm giác mềm và dễ đọc.

### Type scale

| Vai trò | Kích thước | Weight | Line height |
|---|---:|---:|---:|
| Display/H1 | 36px, mobile 30px | 700 | 1.15 |
| H2 | 26px, mobile 22px | 700 | 1.25 |
| H3 | 18px | 600 | 1.35 |
| Body | 16px | 400 | 1.6 |
| Small/Meta | 14px | 400-500 | 1.45 |
| Label/Badge | 12px | 600 | 1.2 |

Giới hạn chiều dài đoạn văn ở khoảng 65-75 ký tự mỗi dòng. Dùng `tracking-tight` cho heading lớn, nhưng không ép letter-spacing cho body text hoặc label.

## 4. Layout và spacing

- Dùng thang spacing theo bội số 4: `4 / 8 / 12 / 16 / 24 / 32 / 48`.
- Container desktop tối đa `1200px`, mobile dùng padding ngang `16px`, desktop `24px`.
- Card dùng `border-radius: 12px`; modal và khu vực lớn dùng tối đa `16px`. Tránh bo tròn quá mức làm giao diện giống ứng dụng đồ chơi.
- Card nền trắng có border `border` và shadow nhẹ `0 2px 8px rgba(16, 42, 67, 0.06)`.
- Hình ảnh sản phẩm dùng tỷ lệ 4:3, không làm méo ảnh và không đặt text lên ảnh nếu không cần thiết.

## 5. Component và trạng thái

### Buttons

- **Primary:** nền `brand`, chữ trắng; hover dùng `brand-strong`.
- **Secondary:** nền `surface`, chữ `brand`, border `brand` với độ đậm vừa phải.
- **Tertiary:** không nền, chỉ dùng cho hành động phụ.
- Chiều cao tối thiểu `40px`, vùng bấm tối thiểu `44px`; trạng thái loading giữ nguyên kích thước nút.

### Product card

- Thứ tự thị giác: ảnh → tên sản phẩm → giá → tình trạng/vị trí → người bán.
- Chỉ hiển thị badge khi badge giúp ra quyết định; tối đa hai badge trên một card.
- Giá dùng `text`, không dùng màu xanh lá quá sáng. Trạng thái `Like new` hoặc xác thực mới dùng `accent`.
- Hover chỉ tăng nhẹ shadow hoặc đổi border; không phóng to card làm xô lệch grid.

### Forms

- Label luôn hiển thị phía trên input; placeholder không thay thế label.
- Input dùng nền `surface`, border `border`, focus bằng `brand`.
- Lỗi hiển thị ngay cạnh field và có thông báo tổng hợp khi submit nhiều field.
- Cho phép paste và password manager; dùng `autocomplete` đúng loại thông tin.

## 6. Motion và accessibility

- Transition màu, border và shadow trong `150-200ms`, easing tự nhiên.
- Không dùng animation liên tục cho nội dung không cần chú ý. Tôn trọng `prefers-reduced-motion`.
- Mọi icon đứng cạnh text chỉ mang tính trang trí phải được ẩn khỏi accessibility tree; icon button phải có accessible name.
- Kiểm tra màn hình ở 375px, 768px và desktop; không để focus bị che bởi header hoặc footer cố định.

## 7. Checklist trước khi bàn giao

- [ ] Màn hình chỉ dùng token màu đã định nghĩa.
- [ ] Heading, body và metadata có cấp bậc rõ ràng, không trộn font.
- [ ] CTA chính dùng `brand`; trạng thái không bị dùng như màu trang trí.
- [ ] Contrast text đạt WCAG 2.2 AA.
- [ ] Hover, focus, disabled và loading đều có trạng thái rõ ràng nhưng không làm layout nhảy.
- [ ] Giao diện vẫn dễ đọc khi giảm motion và ở viewport mobile.
