## 4. Quy tắc nghiệp vụ 

### 4.1. Tài khoản & quyền

| Mã | Quy tắc |
|---|---|
| BR01 | Người dùng phải đăng nhập (qua Google hoặc Email) mới được đăng bán, gửi yêu cầu hẹn, liên hệ Zalo hoặc đánh giá. Nút “Nhắn qua Zalo” và “Đặt lịch hẹn” luôn hiển thị với khách; khi khách bấm, hệ thống mở cửa sổ đăng nhập (ưu tiên Google 1 chạm) rồi tự động quay lại và tiếp tục hành động đã chọn. Số điện thoại không bao giờ có trong HTML trả về cho khách. Việc xem danh sách, chi tiết và tìm kiếm không yêu cầu đăng nhập |
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
| BR18 | Không được xóa sản phẩm đang `RESERVED`. Chỉ được sửa/xóa khi đơn liên quan đã bị hủy hoặc hết hạn (`EXPIRED`) và sản phẩm quay về `AVAILABLE` |

### 4.3. Giao dịch

| Mã | Quy tắc |
|---|---|
| BR04 | Người mua không được tạo yêu cầu cho sản phẩm của chính mình |
| BR05 | Cho phép **nhiều yêu cầu `PENDING`** trên một sản phẩm (mặc định số lượng = 1) |
| BR11 | Tại một thời điểm chỉ **một** yêu cầu được `ACCEPTED`; khi chấp nhận, sản phẩm chuyển `RESERVED` và các yêu cầu `PENDING` khác tự động `REJECTED` |
| BR06 | Người bán có quyền chấp nhận hoặc từ chối yêu cầu |
| BR12 | Yêu cầu `PENDING` quá 48 giờ không được phản hồi sẽ tự động `EXPIRED` |
| BR07 | Đơn chỉ `COMPLETED` khi cả hai xác nhận thành công (đã giao và đã nhận hàng) |
| BR13 | Nếu một bên (thường là người bán) đã bấm xác nhận hoàn tất nhưng bên kia chưa phản hồi: Trong vòng **48 giờ**, người mua có quyền bấm **"Tôi chưa nhận hàng" (Khiếu nại)** để lập tức chặn auto-complete và chuyển đơn sang trạng thái `DISPUTED` cho Admin can thiệp xử lý. Nếu quá 48 giờ mà người mua hoàn toàn im lặng, đơn tự chuyển `AUTO_COMPLETED` |
| BR21 | Hai bên có thể hủy trước khi hoàn tất; hủy nhiều lần liên tiếp sẽ bị ghi nhận và có thể ảnh hưởng uy tín |
| BR22 | Nếu người bán đổi giá/điều kiện sau khi có yêu cầu `PENDING`, người mua được thông báo và yêu cầu cần được xác nhận lại |
| BR36 | Người bán có thể bật liên hệ nhanh qua Zalo kèm lời nhắn mẫu. Link Zalo luôn đi qua route trung gian `/api/zalo/[listingId]` (yêu cầu đăng nhập, có rate limit theo tài khoản và IP) để chống thu thập số điện thoại hàng loạt. Khi người bán chọn ẩn SĐT (`hide_phone = true`), số không xuất hiện trong HTML/API trả về client và không có nút “Sao chép số”. Lưu ý: người mua vẫn có thể thấy thông tin tài khoản Zalo của người bán sau khi mở cuộc trò chuyện. UniCycle không cam kết ẩn tuyệt đối số điện thoại khỏi người đã liên hệ |
| BR37 | **Timeout cho đơn `ACCEPTED`**: Quá thời gian hẹn (`meet_time`) + **24 giờ** mà không bên nào bấm xác nhận giao dịch thành công, đơn hàng tự động chuyển sang `EXPIRED` (hết hạn) và sản phẩm tự động nhả trạng thái `RESERVED` quay về `AVAILABLE` để người khác có thể đặt mua |
| BR38 | **Chốt bán cho khách Zalo**: Người bán tạo lời mời chốt bán (link/QR dùng một lần, hết hạn sau 24 giờ) và gửi cho người mua qua Zalo. Đơn chỉ được tạo (`ACCEPTED`, listing `RESERVED`) sau khi người mua đăng nhập và bấm "Xác nhận mua". Người bán không nhập SĐT/username để tạo đơn thay người mua. Đơn tạo qua lời mời vẫn chịu BR04, BR13, BR37 và vẫn cần xác nhận bàn giao. Giao dịch cùng một cặp tài khoản lặp lại nhiều lần bị xét theo BR23/BR35 |

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
| BR24 | Passport là **tùy chọn** khi đăng bán (khuyến nghị bật). Món đồ có passport được cấp mã số định danh và hiển thị huy hiệu "Có lịch sử đồ vật". Mã QR là dạng số hiển thị trên màn hình ứng dụng/web (không bắt buộc in dán vật lý lên đồ). Khi dùng chức năng **"Bán lại"**, hệ thống không tự động sao chép ảnh của tin cũ mà **yêu cầu người bán tải lên bộ ảnh mới** phản ánh tình trạng hiện tại; trang sản phẩm và passport hiển thị ảnh qua các đời chủ để **người mua so sánh trực quan** (ở P1 có thể bổ sung perceptual hash - pHash để cảnh báo ảnh trùng lặp) |
| BR25 | Với món đồ có passport, chỉ **chủ sở hữu hiện tại** (theo bản ghi DB/chain) mới được đăng bán lại hoặc chuyển quyền trực tiếp (P1) |
| BR26 | Chuyển giao chỉ được ghi nhận khi: (a) đơn `COMPLETED`/`AUTO_COMPLETED` (bao gồm cả đơn tạo qua lời mời chốt bán BR38 cho đồ giao dịch ngoài hệ thống ở MVP), hoặc (b) chuyển quyền trực tiếp được cả hai bên xác nhận (ở P1). Không ghi khi đơn mới `ACCEPTED` |
| BR27 | Ở MVP, toàn bộ lịch sử được lưu trữ nhất quán trong cơ sở dữ liệu hệ thống (Off-chain). Khi kích hoạt Blockchain (P1), **chỉ ghi hash/pseudonym lên chain**, tuyệt đối không ghi thông tin cá nhân (tên, SĐT, email, giá) lên chain |
| BR28 | Ghi chain (ở P1) là quy trình **bất đồng bộ**; lỗi mạng blockchain không được làm nghẽn nghiệp vụ giao dịch web |
| BR29 | Lịch sử hiển thị công khai ở dạng ẩn danh: "Chủ #n · Trường · Tháng/Năm". Tên hiển thị chỉ xuất hiện nếu chủ đó **chủ động đồng ý** |
| BR30 | Passport **không chứng nhận** chất lượng hay tính xác thực của món đồ. Mọi trang passport phải hiển thị tuyên bố này |
| BR31 | Chuyển giao do `AUTO_COMPLETED` (chỉ một bên xác nhận) được ghi với mức xác nhận "một bên" và hiển thị khác với "hai bên xác nhận" |
| BR32 | Admin có thể đánh dấu (flag) passport nghi vấn (đồ bị báo mất, gian lận). Trạng thái flag hiển thị cảnh báo nổi bật trên tin đăng và trang passport; ở P1 được ghi nhận bằng sự kiện trên chain. Hậu quả nghiệp vụ theo BR39 |
| BR39 | **Hiệu lực của flag**: Khi passport bị flag: (a) không cho tạo đơn mới, không cho “Bán lại” hay chuyển quyền; (b) tin đăng liên quan chuyển `HIDDEN` (admin vẫn xem được); (c) đơn `PENDING` tự động `REJECTED`; đơn `ACCEPTED`/`WAITING_CONFIRMATION` chuyển `DISPUTED` để admin xử lý theo bảng kết quả; (d) chủ hiện tại và các bên liên quan được thông báo kèm lý do chung (không lộ người báo cáo). Khi admin gỡ flag (unflag), tin đăng được khôi phục nếu còn hạn. Mọi thao tác flag/unflag ghi vào `passport_events` kèm reason và admin thực hiện |
| BR33 | Một món đồ chỉ có một passport duy nhất. Người dùng không được tạo passport mới cho món đã có passport; khi bán lại phải dùng "Bán lại" từ "Đồ của tôi" và yêu cầu tải lên bộ ảnh mới để người mua đối chiếu trực quan với ảnh đời chủ trước |
| BR34 | **Xử lý khi người dùng xóa tài khoản (Crypto-shredding)**: Hệ thống đặt `passport_owners.user_id = NULL` và `show_name = false` (giữ nguyên bản ghi cùng `owner_hash`, `seq`, `since` để không làm mất thứ tự hay thời điểm trên timeline), đồng thời xóa thông tin định danh cá nhân. Vì `owner_hash` là giá trị ngẫu nhiên độc lập, khi đã gỡ `user_id = NULL` thì lịch sử trên DB/chain vẫn liền mạch nhưng không còn liên kết đến danh tính cá nhân. Với các món đồ (`items`) mà người xóa tài khoản đang là **chủ sở hữu hiện tại**: Passport sẽ tự động chuyển sang trạng thái `ARCHIVED_OWNER_DELETED` (lưu trữ đóng băng), không thể tạo tin đăng bán lại cho đến khi có yêu cầu khôi phục hoặc xác minh qua Admin |
| BR35 | Chuỗi chuyển giao dạng vòng lặp bất thường (A → B → A) hoặc giữa các tài khoản nghi ngờ thông đồng bị gắn cảnh báo và không được tính vào chỉ số uy tín |