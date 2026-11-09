# UniCycle

UniCycle là một marketplace dành cho sinh viên, nơi mọi người có thể mua, bán
hoặc tặng lại những món đồ đã qua sử dụng. Dự án tập trung vào các nhu cầu
thường gặp như mua giáo trình, tìm đồ dùng cho phòng trọ hoặc thanh lý đồ khi
chuyển trọ, chuyển ký túc xá hay tốt nghiệp.

Mục tiêu của UniCycle khá đơn giản: giúp sinh viên tìm được món đồ phù hợp với
ngân sách, đồng thời kéo dài vòng đời của những sản phẩm vẫn còn sử dụng tốt.

> Đây là phiên bản MVP đang được phát triển. Phần marketplace cốt lõi đã có
> thể chạy thử; các tính năng Blockchain và thanh toán an toàn vẫn nằm trong
> lộ trình tiếp theo.

## Tính năng hiện có

- Xem danh sách sản phẩm, tìm kiếm theo từ khóa và lọc theo danh mục, tình
  trạng, khoảng giá.
- Xem trang chi tiết với hình ảnh, mô tả, giá và địa điểm nhận hàng.
- Đăng ký, đăng nhập, đăng xuất và quản lý hồ sơ cá nhân.
- Đăng tin bán hoặc tặng đồ với tối đa 5 ảnh, chọn ảnh bìa và xem trước ảnh.
- Chỉnh sửa, ẩn, đánh dấu đã bán hoặc mở bán lại tin đăng.
- Xem các tin đăng của mình theo trạng thái.
- Chỉ hiển thị thông tin liên hệ của người bán cho tài khoản đã đăng nhập.
- Gợi ý địa điểm gặp mặt an toàn và nhắc người dùng không chuyển khoản đặt
  cọc trước khi kiểm tra sản phẩm.

## Công nghệ

- [Next.js 16](https://nextjs.org/) với App Router
- [React 19](https://react.dev/) và [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- SQLite chạy trực tiếp trên Node.js
- JWT lưu trong HttpOnly cookie để quản lý phiên đăng nhập
- `node:crypto` với `scrypt` để băm và kiểm tra mật khẩu
- Lưu ảnh cục bộ trong `public/uploads/`

Avalanche, UniCycle Passport và cơ chế escrow là các phần được chuẩn bị cho
những giai đoạn sau, chưa phải luồng thanh toán đang hoạt động trong MVP.

## Chạy dự án ở máy local

### Yêu cầu

- Node.js 20 trở lên (khuyến nghị Node.js 24)
- npm

### Cài đặt

```bash
git clone https://github.com/Tran-Thi-Bich-Hanh/UniCycle.git
cd UniCycle
npm install
```

Khởi động server phát triển:

```bash
npm run dev
```

Sau đó mở <http://localhost:3000>.

Các lệnh thường dùng khác:

```bash
npm run lint    # Kiểm tra mã nguồn
npm run build   # Tạo bản build production
npm start       # Chạy bản build production
```

Ứng dụng sử dụng cơ sở dữ liệu SQLite tại `data/unicycle.db`. Trong lần chạy
đầu tiên, cơ sở dữ liệu sẽ được tạo schema và seed dữ liệu mẫu nếu cần. Vì đây
là dữ liệu local, không nên xóa hoặc commit các file WAL/SHM khi đang có server
chạy.

## Tài khoản dùng thử

Bạn có thể đăng nhập bằng các tài khoản seed sẵn dưới đây:

| Người dùng | Email | Mật khẩu |
| --- | --- | --- |
| Nguyễn Hoàng Nam | `an.nguyen@student.hcmut.edu.vn` | `Password123` |
| Trần Hải Yến | `mai.tran@student.hcmus.edu.vn` | `Password123` |

Trang đăng nhập cũng có nút đăng nhập nhanh cho hai tài khoản mẫu này.

## Cấu trúc chính

```text
app/
├── api/                 # API route cho auth, sản phẩm, danh mục và upload
├── products/            # Danh sách, chi tiết, tạo và sửa tin đăng
├── profile/             # Hồ sơ và các tin đăng của người dùng
├── login/               # Đăng nhập
└── register/            # Đăng ký
components/              # Component giao diện dùng chung
lib/                     # Xác thực, SQLite, QR, Passport và tiện ích
data/                    # Cơ sở dữ liệu local
docs/                    # Tài liệu kiến trúc, thiết kế và định hướng sản phẩm
public/                  # Logo, icon và ảnh upload
```

Một số tài liệu liên quan:

- [Tổng quan dự án](./docs/project-overview.md)
- [Kiến trúc kỹ thuật](./docs/architecture.md)
- [Hệ thống thiết kế](./docs/design.md)

## Lộ trình

- [x] Marketplace cơ bản: tìm kiếm, lọc, đăng tin và quản lý tin đăng
- [x] Đăng nhập, hồ sơ sinh viên và upload ảnh
- [ ] Hoàn thiện UniCycle Passport và mã băm thông tin sản phẩm
- [ ] Tích hợp smart contract escrow trên Avalanche Fuji
- [ ] Xây dựng danh tiếng on-chain và triển khai bản production

## Bản quyền

UniCycle được phát triển bởi UniCycle Team H.Y cho cộng đồng sinh viên.
