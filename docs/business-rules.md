## 4. Quy tắc nghiệp vụ 

### 4.1. Tài khoản & quyền

| Mã | Quy tắc |
|---|---|
| BR01 | Người dùng phải đăng nhập (qua Google hoặc Email) mới được đăng bán, gửi yêu cầu hẹn mua, nhắn tin Zalo hoặc đánh giá. Việc xem và tìm kiếm không yêu cầu đăng nhập |
| BR19 | Mọi tài khoản đã đăng nhập đều có thể đăng bán. Tài khoản xác minh danh tính sinh viên (qua thẻ sinh viên hoặc email trường) được cấp Huy hiệu "Sinh viên đã xác minh" và tin đăng được ưu tiên hiển thị |
| BR20 | Một người dùng có thể đồng thời là Buyer và Seller (không tách loại tài khoản) |

### 4.2. Sản phẩm

| Mã | Quy tắc |
|---|---|
| BR02 | Mỗi sản phẩm phải có tên, danh mục, giá, mô tả, tình trạng, khu vực và ít nhất một hình ảnh |
| BR03 | Người bán chỉ được sửa/xóa sản phẩm của chính mình |
| BR10 | Sản phẩm đã bán không hiển thị như còn hàng |
| BR15 | Tin đăng tự hết hạn sau 30 ngày, có thể gia hạn |
| BR16 | Giới hạn số ảnh/tin (tối đa 5), dung lượng ảnh, và số tin đăng mới mỗi ngày để chống spam |
| BR17 | Có danh mục hàng cấm (hàng giả, hàng bị đánh cắp, chất cấm, rượu, thuốc, tài liệu vi phạm bản quyền…); admin được quyền ẩn tin vi phạm |
| BR18 | Không được xóa sản phẩm đang `RESERVED`; phải hủy giữ trước |

### 4.3. Giao dịch

| Mã | Quy tắc |
|---|---|
| BR04 | Người mua không được tạo yêu cầu cho sản phẩm của chính mình |
| BR05 | Cho phép **nhiều yêu cầu `PENDING`** trên một sản phẩm (mặc định số lượng = 1) |
| BR11 | Tại một thời điểm chỉ **một** yêu cầu được `ACCEPTED`; khi chấp nhận, sản phẩm chuyển `RESERVED` và các yêu cầu `PENDING` khác tự động `REJECTED` |
| BR06 | Người bán có quyền chấp nhận hoặc từ chối yêu cầu |
| BR12 | Yêu cầu `PENDING` quá 48 giờ không được phản hồi sẽ tự động `EXPIRED` |
| BR07 | Đơn chỉ `COMPLETED` khi cả hai xác nhận thành công (đã giao và đã nhận hàng) |
| BR13 | Nếu một bên đã xác nhận hoàn tất nhưng bên kia không phản hồi sau **48 giờ**, đơn tự chuyển `AUTO_COMPLETED` (tránh kẹt trạng thái giữ đồ vô hạn) |
| BR21 | Hai bên có thể hủy trước khi hoàn tất; hủy nhiều lần liên tiếp sẽ bị ghi nhận và có thể ảnh hưởng uy tín |
| BR22 | Nếu người bán đổi giá/điều kiện sau khi có yêu cầu `PENDING`, người mua được thông báo và yêu cầu cần được xác nhận lại |
| BR36 | Người bán có thể bật liên hệ nhanh qua **Zalo (Deep link `zalo.me/<sdt>`)** kèm lời nhắn mẫu; người bán có thể chọn ẩn số điện thoại thật để bảo vệ riêng tư |

### 4.4. Đánh giá & uy tín

| Mã | Quy tắc |
|---|---|
| BR08 | Chỉ hai bên của giao dịch đã `COMPLETED`/`AUTO_COMPLETED` mới được đánh giá nhau |
| BR09 | Mỗi người chỉ đánh giá một lần cho mỗi giao dịch |
| BR14 | Đánh giá **hiển thị khi cả hai đã nộp** hoặc sau **48 giờ** kể từ khi đơn hoàn tất (blind review, chống trả đũa) |
| BR23 | Điểm uy tín tính từ giao dịch hoàn tất, tỷ lệ phản hồi, tỷ lệ hủy và đánh giá; phát hiện bất thường (nhiều giao dịch qua lại giữa cùng cặp tài khoản) |

### 4.5. Lịch sử đồ vật (Digital Product Passport) & Blockchain

| Mã | Quy tắc |
|---|---|
| BR24 | Passport là **tùy chọn** khi đăng bán (khuyến nghị bật). Món đồ có passport được cấp mã số định danh và hiển thị huy hiệu "Có lịch sử đồ vật". Mã QR là dạng số hiển thị trên màn hình ứng dụng/web (không bắt buộc in dán vật lý lên đồ) |
| BR25 | Với món đồ có passport, chỉ **chủ sở hữu hiện tại** (theo bản ghi DB/chain) mới được đăng bán lại hoặc chuyển quyền |
| BR26 | Chuyển giao chỉ được ghi nhận khi: (a) đơn `COMPLETED`/`AUTO_COMPLETED`, hoặc (b) chuyển quyền trực tiếp được cả hai bên xác nhận. Không ghi khi đơn mới `ACCEPTED` |
| BR27 | Ở MVP, toàn bộ lịch sử được lưu trữ nhất quán trong cơ sở dữ liệu hệ thống (Off-chain). Khi kích hoạt Blockchain (P1), **chỉ ghi hash/pseudonym lên chain**, tuyệt đối không ghi thông tin cá nhân (tên, SĐT, email, giá) lên chain |
| BR28 | Ghi chain (ở P1) là quy trình **bất đồng bộ**; lỗi mạng blockchain không được làm nghẽn nghiệp vụ giao dịch web |
| BR29 | Lịch sử hiển thị công khai ở dạng ẩn danh: "Chủ #n · Trường · Tháng/Năm". Tên hiển thị chỉ xuất hiện nếu chủ đó **chủ động đồng ý** |
| BR30 | Passport **không chứng nhận** chất lượng hay tính xác thực của món đồ. Mọi trang passport phải hiển thị tuyên bố này |
| BR31 | Chuyển giao do `AUTO_COMPLETED` (chỉ một bên xác nhận) được ghi với mức xác nhận "một bên" và hiển thị khác với "hai bên xác nhận" |
| BR32 | Admin có thể đánh dấu (flag) passport nghi vấn (đồ bị báo mất, gian lận); trạng thái flag hiển thị cảnh báo trên tin đăng và được ghi nhận bằng sự kiện trên chain |
| BR33 | Một món đồ chỉ có một passport. Người dùng không được tạo passport mới cho món đã có passport; khi bán lại phải dùng "Bán lại" từ "Đồ của tôi" |
| BR34 | Khi người dùng xóa tài khoản, ánh xạ pseudonym ↔ tài khoản bị xóa (crypto-shredding); lịch sử trên chain vẫn còn nhưng không còn liên kết được với người đó |
| BR35 | Chuỗi chuyển giao dạng vòng lặp bất thường (A → B → A) hoặc giữa các tài khoản nghi ngờ thông đồng bị gắn cảnh báo và không được tính vào chỉ số uy tín |