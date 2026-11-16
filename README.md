# UniCycle

UniCycle là một marketplace dành cho sinh viên, nơi mọi người có thể mua, bán
hoặc tặng lại những món đồ đã qua sử dụng. Dự án tập trung vào các nhu cầu
thường gặp như mua giáo trình, tìm đồ dùng cho phòng trọ hoặc thanh lý đồ khi
chuyển trọ, chuyển ký túc xá hay tốt nghiệp.

Mục tiêu của UniCycle khá đơn giản: giúp sinh viên tìm được món đồ phù hợp với
ngân sách quanh trường và ký túc xá của mình, đồng thời kéo dài vòng đời của
những sản phẩm vẫn còn sử dụng tốt.

> Dự án đang trong giai đoạn xây dựng phiên bản MVP theo hướng ưu tiên trải
> nghiệm web trên điện thoại. Phần hộ chiếu đồ vật (Product Passport) chạy trên
> cơ sở dữ liệu ở MVP và có lát cắt thử nghiệm trên mạng Avalanche Fuji Testnet.

## Tính năng trong phạm vi MVP

- Xem danh sách sản phẩm, tìm kiếm tiếng Việt có hoặc không dấu, lọc theo trường
  đại học, ký túc xá, danh mục, tình trạng, khoảng giá và đồ tặng 0đ.
- Đăng nhập nhanh bằng Google hoặc email; xác minh thêm thẻ sinh viên hoặc email
  trường để nhận huy hiệu sinh viên trên hồ sơ (ảnh thẻ được xóa ngay sau khi
  duyệt).
- Đăng tin bán hoặc tặng đồ với tối đa 5 ảnh được nén trực tiếp trên trình
  duyệt, tùy chọn ẩn số điện thoại công khai và bật hộ chiếu đồ vật.
- Liên hệ người bán qua Zalo thông qua route trung gian `/api/zalo/[listingId]`
  (có giới hạn lượt gọi để chống thu thập số điện thoại hàng loạt) hoặc gửi lời
  mời chốt bán có hạn 24 giờ cho khách đã trao đổi qua Zalo.
- Đặt lịch hẹn xem hàng tại các điểm công cộng trong trường hoặc ký túc xá; khóa
  giữ chỗ sản phẩm (`RESERVED`) khi người bán đồng ý hẹn và tự mở bán lại nếu quá
  giờ hẹn 24 giờ mà hai bên không phản hồi.
- Xác nhận bàn giao trực tiếp trong chu kỳ 48 giờ, hỗ trợ khiếu nại khi chưa
  nhận hàng và đánh giá hai chiều ẩn đối ứng (blind review) trong 48 giờ.
- Quản lý vòng đời món đồ qua Product Passport: hiển thị chuỗi đời chủ kèm mã QR
  trên màn hình điện thoại, quản lý trong mục "Đồ của tôi" và đăng bán lại kế
  thừa lịch sử cũ với bộ ảnh mới chụp.

## Công nghệ

- [Next.js 16](https://nextjs.org/) với App Router
- [React 19](https://react.dev/) và [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- PostgreSQL kết hợp Prisma hoặc Drizzle ORM (theo thiết kế hệ thống)
- Xác thực qua Google OAuth và Email/Password
- Lưu trữ hình ảnh qua Cloudinary hoặc Supabase Storage
- Tác vụ định kỳ qua `pg_cron` hoặc GitHub Actions Scheduled Workflows
- Solidity (`UniCyclePassport.sol`) trên Avalanche Fuji Testnet cho lát cắt đối
  chiếu lịch sử đồ vật on-chain

Các tính năng như chuyển quyền sở hữu trực tiếp không qua tin đăng, nhắn tin
trực tiếp trên web (Supabase Realtime) và cơ chế giữ tiền (Smart Escrow) nằm
trong lộ trình mở rộng P1 và P2 sau khi MVP vận hành ổn định.

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

## Cấu trúc chính

```text
app/                     # Giao diện và route của ứng dụng (Next.js App Router)
docs/                    # Tài liệu đặc tả nghiệp vụ, kiến trúc và kế hoạch
public/                  # Tài nguyên tĩnh (logo, icon, hình ảnh)
```

Tài liệu thiết kế chi tiết trong thư mục `docs/`:

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

## Bản quyền

UniCycle được phát triển bởi UniCycle Team H.Y cho cộng đồng sinh viên.
