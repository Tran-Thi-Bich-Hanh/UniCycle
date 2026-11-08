# UniCycle – Hệ Thống Thiết Kế (Design System & Color Tokens)

Tài liệu này định nghĩa hệ thống màu sắc và quy chuẩn giao diện cho **UniCycle** theo bảng màu tối giản 5 cấp độ xanh (Blue Palette) do người dùng cung cấp, tuân thủ nguyên tắc thiết kế **ui-ux-pro-max**:
- **Nền trắng tinh gọn (Clean White Background)**: Tập trung làm nổi bật sản phẩm, hạn chế dùng quá nhiều màu hỗn tạp.
- **Hệ thống 2-3 màu chủ đạo**: Phối hợp hài hòa giữa Midnight Navy (`#001B48`), Ocean Blue (`#02457A`) và Vibrant Cerulean Blue (`#018ABE`).
- **Khối Hero đầu tiên có hiệu ứng loang màu**: Sử dụng gradient chuyển màu mượt mà từ Midnight Navy sang Cerulean Blue và loang dần về nền trắng.

---

## 1. Bảng Màu Chuẩn (Official Color Palette)

```
┌────────────────────────────────────────────────────────────────────────┐
│  BẢNG MÀU CHỦ ĐẠO UNICYCLE (THEO THIẾT KẾ ĐƯỢC DUYỆT)                  │
├────────────────────────────────────────────────────────────────────────┤
│  [1] #001B48  Midnight Navy    - Màu tối nhất: Logo, Text H1, Footer   │
│  [2] #02457A  Deep Ocean Blue  - Màu nhấn 2: Header section, Link      │
│  [3] #018ABE  Cerulean Blue    - Màu CTA chính: Nút bấm, Icon, Focus   │
│  [4] #97CADB  Soft Sky Blue    - Màu bổ trợ: Hiệu ứng loang, border nhạt│
│  [5] #D6E8EE  Ice Blue Tint    - Màu nền mềm: Badge, Pill, Card hover   │
│  [+] #FFFFFF  Pure White       - Nền canvas chủ đạo của toàn bộ website│
└────────────────────────────────────────────────────────────────────────┘
```

### Chi tiết cách áp dụng từng màu:

| Mã Hex | Tên gọi | Tailwind Token | Vai trò trong giao diện |
|---|---|---|---|
| **`#001B48`** | Midnight Navy | `brand-dark` | Màu chữ chính, Logo UniCycle, Thanh Footer, Text tiêu đề lớn. Mang lại cảm giác tin cậy tuyệt đối và độ tương phản cao (>10:1). |
| **`#02457A`** | Ocean Blue | `brand-deep` | Tiêu đề danh mục, đường viền nhấn, nhãn giá tiền, nút phụ (secondary action). |
| **`#018ABE`** | Cerulean Blue | `brand-primary` | Màu hành động chính (Primary CTA): Nút "Đăng tin", "Khám phá đồ", "Đăng nhập", trạng thái active và focus-ring. |
| **`#97CADB`** | Soft Sky Blue | `brand-soft` | Hiệu ứng loang màu (gradient stop) ở hero banner, viền thẻ nhẹ nhàng, icon bổ trợ. |
| **`#D6E8EE`** | Ice Blue | `brand-ice` | Nền thẻ mềm mại (Soft pill), nền icon danh mục, hover trạng thái nhẹ không chói mắt. |
| **`#FFFFFF`** | Pure White | `white` | Nền trang chủ đạo, nền thẻ sản phẩm (Card surface), tạo sự thông thoáng tối đa. |

---

## 2. Kỹ Thuật Loang Màu Cho Khối Hero (Hero Gradient Bleed)

Theo yêu cầu "class nền đầu tiên có thể làm loang màu", khối Hero đầu trang sử dụng kỹ thuật gradient đa tầng kết hợp:
1. **Linear Gradient chuyển tiếp**: Chạy từ `#001B48` (Midnight Navy) qua `#02457A` (Ocean Blue) tới `#018ABE` (Cerulean Blue).
2. **Radial Mesh Blur Overlay**: Các điểm loang ánh sáng mềm mại từ `#97CADB` và `#018ABE` mờ dần (opacity 15-25%) tạo chiều sâu không gian công nghệ, sau đó chuyển tiếp nhẹ nhàng sang nền trắng của nội dung bên dưới.

---

## 3. Quy Chuẩn Tương Tác & Accessible Standards

- **Độ tương phản (Contrast)**: Mọi chữ trên nền trắng phải dùng `#001B48` (đạt 13.5:1) hoặc `#02457A` (đạt 7.8:1), vượt xa tiêu chuẩn WCAG 2.2 AA (4.5:1).
- **Trạng thái Focus**: `focus:ring-2 focus:ring-[#018ABE]/30 focus:border-[#018ABE]`.
- **Nút bấm chính (CTA)**:
  - Nền gradient: `bg-gradient-to-r from-[#02457A] via-[#018ABE] to-[#018ABE] hover:from-[#001B48] hover:to-[#02457A]`.
  - Chữ trắng, đổ bóng nhẹ theo tông xanh: `shadow-md shadow-[#018ABE]/20`.
- **Thẻ sản phẩm (Product Card)**:
  - Nền trắng tinh khôi (`bg-white`), viền xám xanh siêu nhẹ (`border-[#D6E8EE]`).
  - Khi hover: Viền chuyển sang `#97CADB`, bóng đổ mềm `#02457A/8` và ảnh hơi zoom nhẹ 103%.
- **Nhãn tình trạng (Condition Badges)**:
  - Dùng nền nhạt `#D6E8EE` với viền `#97CADB` và chữ `#001B48` để giữ giao diện đồng nhất 2-3 màu chính, không bị biến thành "bảy sắc cầu vồng".
