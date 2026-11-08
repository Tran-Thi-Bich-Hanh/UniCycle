# UniCycle – Tổng quan dự án (Project Overview)

## 1. Giới thiệu dự án

**UniCycle** là nền tảng marketplace dành cho cộng đồng sinh viên, giúp sinh viên mua bán và tái sử dụng các món đồ đã qua sử dụng từ những anh chị sinh viên khóa trước hoặc từ các sinh viên khác.

Các mặt hàng trên UniCycle không chỉ giới hạn ở sách và tài liệu học tập, mà còn bao gồm nhiều vật dụng phục vụ đời sống sinh viên như bàn học, ghế, đèn bàn, quạt, mền, gối, đồ gia dụng, thiết bị học tập và các vật dụng cá nhân phù hợp khác.

Dự án hướng đến việc xây dựng một môi trường mua bán đồ cũ minh bạch và đáng tin cậy hơn. Người mua có thể xem thông tin, hình ảnh và tình trạng thực tế của sản phẩm trước khi giao dịch; khoản thanh toán có thể được bảo vệ thông qua Smart Contract; lịch sử giao dịch của người dùng có thể được xác minh trên Blockchain.

Thay vì chỉ đóng vai trò là một sàn đăng tin và kết nối người mua với người bán, UniCycle tập trung giải quyết vấn đề quan trọng trong giao dịch hàng hóa đã qua sử dụng giữa những người chưa quen biết: **niềm tin**. Đồng thời, nền tảng khuyến khích việc tái sử dụng đồ dùng, giúp sinh viên tiết kiệm chi phí và hạn chế lãng phí khi chuyển phòng, kết thúc năm học hoặc không còn nhu cầu sử dụng một món đồ.

**Định hướng sản phẩm:**

- Tên dự án: UniCycle
- Lĩnh vực: Marketplace / Student Community / Sustainable Consumption / Blockchain
- Đối tượng sử dụng: Sinh viên đại học, đặc biệt là sinh viên có nhu cầu mua hoặc thanh lý đồ dùng.
- Phạm vi ban đầu: Cộng đồng sinh viên tại TP. Hồ Chí Minh.
- Nền tảng: Web application, ưu tiên thiết kế mobile-first.
- Blockchain: Avalanche C-Chain.
- Tiền tệ giao dịch: USDC trên Avalanche Fuji Testnet trong giai đoạn thử nghiệm.

**Thông điệp cốt lõi:**

> UniCycle – Mua bán đồ cũ dễ dàng, tái sử dụng thông minh, giao dịch đáng tin cậy.

---

## 2. Vấn đề cần giải quyết

Sinh viên thường có nhu cầu mua sắm nhiều vật dụng khi bắt đầu cuộc sống đại học hoặc chuyển đến nơi ở mới. Những món đồ như sách, bàn học, ghế, quạt, đèn bàn, mền, gối và đồ gia dụng có thể khá tốn kém nếu mua mới.

Trong khi đó, sau mỗi học kỳ hoặc khi chuyển trọ, chuyển ký túc xá, về quê hay tốt nghiệp, nhiều sinh viên lại có những món đồ vẫn còn sử dụng tốt nhưng không còn nhu cầu sử dụng. Tuy nhiên, thông tin mua bán thường bị phân tán trên Facebook, các hội nhóm sinh viên hoặc những nền tảng rao vặt thông thường.

Cách thức này tồn tại một số hạn chế:

### 2.1. Thiếu thông tin đáng tin cậy về tình trạng sản phẩm

Người bán thường tự mô tả tình trạng sản phẩm bằng những thông tin chung chung như "còn mới", "ít sử dụng" hoặc "vẫn dùng tốt".

Tuy nhiên, mỗi loại sản phẩm lại có những đặc điểm cần kiểm tra khác nhau. Ví dụ:

- **Sách:** Có bị thiếu hoặc rách trang không? Có ghi chú, highlight nhiều không? Bìa và gáy sách còn nguyên vẹn không?
- **Bàn, ghế:** Có bị lung lay, nứt, gãy hoặc trầy xước không? Kích thước có phù hợp với không gian sử dụng không?
- **Mền, gối:** Tình trạng vệ sinh, độ mới và mức độ sử dụng như thế nào?
- **Thiết bị học tập, đồ điện:** Sản phẩm có hoạt động bình thường không? Có hư hỏng hoặc thiếu phụ kiện không?

Người mua khó đánh giá chính xác chất lượng sản phẩm nếu chỉ dựa vào mô tả ngắn và một vài hình ảnh.

### 2.2. Rủi ro trong quá trình thanh toán và bàn giao

Khi giao dịch từ xa, người mua có thể phải chuyển tiền trước khi nhận được sản phẩm. Điều này tạo ra nguy cơ người bán không giao hàng hoặc giao sản phẩm không đúng như cam kết.

Ngược lại, người bán cũng có thể gặp trường hợp người mua đã nhận sản phẩm nhưng không thanh toán hoặc cố tình trì hoãn thanh toán.

Với các món đồ cồng kềnh như bàn học, ghế hoặc đồ gia dụng, việc thống nhất địa điểm, thời gian và phương thức bàn giao cũng có thể gây bất tiện.

### 2.3. Thiếu lịch sử giao dịch có thể kiểm chứng

Các đánh giá và nhận xét trên những nền tảng thông thường chưa chắc phản ánh những giao dịch thực sự diễn ra.

Người mua khó biết một người bán đã hoàn thành bao nhiêu giao dịch, có thường xuyên thực hiện giao dịch thành công hay không. Người bán cũng khó đánh giá mức độ đáng tin cậy của người mua.

### 2.4. Thiếu một marketplace tập trung dành riêng cho sinh viên

Thông tin mua bán đồ dùng thường bị phân tán trên nhiều hội nhóm khác nhau. Người mua phải tìm kiếm ở nhiều nơi và khó lọc sản phẩm theo danh mục, mức giá, tình trạng hoặc khu vực.

Trong khi đó, sinh viên thường có nhu cầu tìm những món đồ thiết thực với ngân sách hạn chế, ưu tiên sản phẩm ở gần trường, ký túc xá hoặc nơi ở.

### 2.5. Lãng phí những món đồ vẫn còn giá trị sử dụng

Nhiều món đồ vẫn còn sử dụng tốt nhưng bị bỏ đi khi chủ sở hữu chuyển nơi ở hoặc không còn nhu cầu. Điều này vừa gây lãng phí vừa khiến những sinh viên khác phải mua sản phẩm mới với chi phí cao hơn.

UniCycle hướng đến việc kết nối người có nhu cầu thanh lý với người đang cần sử dụng, kéo dài vòng đời của sản phẩm.

---

## 3. Giải pháp đề xuất

UniCycle xây dựng một marketplace dành cho sinh viên, kết hợp với Blockchain nhằm cải thiện tính minh bạch và độ tin cậy trong giao dịch hàng hóa đã qua sử dụng.

Nền tảng cho phép người dùng đăng bán, tìm kiếm và mua các món đồ thuộc nhiều danh mục khác nhau. Sản phẩm được phát triển dựa trên ba thành phần cốt lõi:

### 3.1. UniCycle Passport – Hồ sơ tình trạng sản phẩm

UniCycle Passport là hồ sơ điện tử ghi nhận thông tin và tình trạng thực tế của mỗi sản phẩm được đăng bán.

Người bán cần cung cấp những thông tin phù hợp với từng loại sản phẩm, chẳng hạn:

- Tên sản phẩm, danh mục và thương hiệu (nếu có).
- Mô tả, thời gian sử dụng và lý do thanh lý (không bắt buộc).
- Giá bán và tình trạng sản phẩm.
- Hình ảnh thực tế từ nhiều góc độ.
- Các vết trầy xước, hư hỏng hoặc khuyết điểm cần lưu ý.
- Thông số phù hợp với sản phẩm như kích thước, chất liệu, màu sắc hoặc phụ kiện đi kèm.

Một số thông tin có thể được bổ sung theo từng danh mục:

| Danh mục | Thông tin tình trạng nên cung cấp |
|---|---|
| Sách và tài liệu | Phiên bản, tình trạng bìa/gáy/trang, mức độ ghi chú |
| Bàn, ghế và nội thất | Kích thước, chất liệu, độ chắc chắn, vết trầy xước hoặc hư hỏng |
| Mền, gối và đồ vải | Kích thước, chất liệu, thời gian sử dụng và tình trạng vệ sinh do người bán cung cấp |
| Thiết bị học tập, đồ điện | Thương hiệu, model, khả năng hoạt động, phụ kiện và lỗi hiện có |
| Đồ gia dụng và vật dụng cá nhân | Chất liệu, kích thước, mức độ sử dụng và các khuyết điểm |

Hệ thống lưu trữ hình ảnh và thông tin chi tiết ngoài Blockchain. Sau đó, dữ liệu được chuẩn hóa và tạo mã băm (hash) để ghi nhận lên Blockchain.

**Giá trị mang lại:**

- Giúp người mua có thêm thông tin trước khi quyết định giao dịch.
- Khuyến khích người bán mô tả sản phẩm rõ ràng và minh bạch.
- Tạo bằng chứng tham chiếu về tình trạng sản phẩm tại thời điểm đăng bán.
- Cho phép kiểm tra dữ liệu có bị thay đổi sau khi ghi nhận hay không.

Lưu ý: Hash chỉ đảm bảo tính toàn vẹn của dữ liệu đã ghi nhận, không tự chứng minh hình ảnh hoặc mô tả ban đầu là trung thực. UniCycle Passport là hồ sơ do người bán cung cấp, không phải chứng nhận kiểm định chất lượng độc lập.

### 3.2. Smart Escrow – Thanh toán an toàn

Smart Escrow là cơ chế giữ tiền thanh toán thông qua Smart Contract trên Avalanche C-Chain.

Thay vì chuyển tiền trực tiếp cho người bán, người mua gửi USDC vào Smart Contract. Số tiền này chỉ được giải ngân khi các điều kiện giao dịch được đáp ứng.

**Quy trình giao dịch cơ bản:**

1. Người mua chọn sản phẩm và tạo đơn hàng.
2. Người mua kết nối ví và gửi USDC vào Smart Contract.
3. Smart Contract khóa số tiền tương ứng với giao dịch.
4. Người bán xác nhận chuẩn bị và bàn giao sản phẩm.
5. Người mua nhận sản phẩm trực tiếp hoặc thông qua phương thức giao hàng đã thống nhất.
6. Người mua kiểm tra sản phẩm và xác nhận hoàn tất giao dịch.
7. Smart Contract chuyển tiền cho người bán.

Nếu giao dịch không thể hoàn thành, hệ thống có thể thực hiện hoàn tiền theo các điều kiện được quy định trong Smart Contract.

Các trường hợp tranh chấp cần có quy trình xử lý riêng, chẳng hạn cơ chế phân xử bởi bên có thẩm quyền. Smart Contract không tự xác định được tình trạng vật lý của sản phẩm hoặc việc giao hàng ngoài đời thực.

**Giá trị mang lại:**

- Hạn chế rủi ro chuyển tiền trước cho người lạ.
- Quy định rõ điều kiện giải ngân và hoàn tiền.
- Công khai trạng thái giao dịch trên Blockchain.
- Giảm sự phụ thuộc vào cam kết đơn phương của người mua hoặc người bán.

### 3.3. On-chain Reputation – Lịch sử giao dịch có thể xác minh

On-chain Reputation là cơ chế xây dựng uy tín người dùng dựa trên các giao dịch thực sự hoàn tất thông qua Smart Contract.

Khi một giao dịch được hoàn thành, Smart Contract phát ra sự kiện `TradeCompleted`. Hệ thống có thể đọc sự kiện này để cập nhật lịch sử giao dịch của người mua và người bán.

Thông tin hiển thị trên hồ sơ người dùng có thể bao gồm:

- Tổng số giao dịch đã hoàn tất.
- Lịch sử mua và bán.
- Số lượng giao dịch bị tranh chấp hoặc hoàn tiền (nếu được thiết kế và ghi nhận).
- Điểm đánh giá và nhận xét từ người dùng khác.

Dữ liệu giao dịch quan trọng được ghi nhận hoặc xác minh thông qua Blockchain; các nội dung như bình luận và đánh giá chi tiết có thể được lưu trữ ngoài Blockchain.

**Giá trị mang lại:**

- Hạn chế tình trạng tự khai báo số lượng giao dịch thành công.
- Giúp người dùng tham khảo lịch sử giao dịch trước khi mua hoặc bán.
- Tạo nền tảng xây dựng uy tín lâu dài trong cộng đồng UniCycle.

Lưu ý: Lịch sử ví chỉ chứng minh hoạt động trên Blockchain, không tự động xác minh danh tính sinh viên ngoài đời thực.

---

## 4. Đối tượng sử dụng

UniCycle hướng đến hai nhóm người dùng chính:

### 4.1. Người bán (Seller)

Là sinh viên có những món đồ không còn nhu cầu sử dụng, chẳng hạn khi chuyển trọ, chuyển ký túc xá, kết thúc năm học hoặc muốn thanh lý vật dụng cá nhân.

Các nhu cầu chính:

- Đăng bán nhiều loại sản phẩm nhanh chóng.
- Cung cấp thông tin và hình ảnh tình trạng sản phẩm.
- Tiếp cận người mua trong cộng đồng sinh viên.
- Nhận thanh toán an toàn.
- Thống nhất phương thức và địa điểm bàn giao.
- Xây dựng uy tín thông qua lịch sử giao dịch.

### 4.2. Người mua (Buyer)

Là sinh viên muốn tìm mua các vật dụng phục vụ học tập và sinh hoạt với chi phí hợp lý.

Các nhu cầu chính:

- Tìm kiếm sản phẩm theo danh mục, tên, mức giá và tình trạng.
- Lọc sản phẩm theo khu vực hoặc trường đại học.
- Kiểm tra thông tin và tình trạng sản phẩm trước khi mua.
- Thanh toán an toàn.
- Theo dõi trạng thái đơn hàng.
- Đánh giá người bán sau giao dịch.

Một người dùng có thể đồng thời đóng vai trò người mua và người bán.

---

## 5. Quy trình hoạt động tổng quan

Một giao dịch trên UniCycle được chia thành các giai đoạn:

**Giai đoạn 1 – Đăng bán**

Người bán tạo bài đăng, chọn danh mục sản phẩm, nhập thông tin và cung cấp hình ảnh thực tế. Hệ thống tạo UniCycle Passport và ghi nhận hash của dữ liệu liên quan.

**Giai đoạn 2 – Tìm kiếm và đặt mua**

Người mua tìm kiếm sản phẩm theo danh mục, mức giá, tình trạng hoặc khu vực; kiểm tra UniCycle Passport, sau đó chọn sản phẩm và tạo đơn hàng.

**Giai đoạn 3 – Thanh toán**

Người mua kết nối ví, xác nhận giao dịch và gửi USDC vào Smart Escrow Contract.

**Giai đoạn 4 – Bàn giao sản phẩm**

Người bán xác nhận chuẩn bị và bàn giao sản phẩm. Hai bên thực hiện giao trực tiếp tại địa điểm đã thống nhất hoặc sử dụng phương thức giao hàng phù hợp. Trạng thái đơn hàng được cập nhật để người mua theo dõi.

**Giai đoạn 5 – Hoàn tất**

Người mua xác nhận đã nhận sản phẩm và chấp nhận giao dịch. Smart Contract giải ngân USDC cho người bán.

**Giai đoạn 6 – Cập nhật uy tín**

Sự kiện giao dịch hoàn tất được ghi nhận. Lịch sử giao dịch của hai bên được cập nhật để phục vụ hệ thống On-chain Reputation.

---

## 6. Kiến trúc công nghệ tổng quan

UniCycle sử dụng mô hình kết hợp giữa dữ liệu ngoài Blockchain (off-chain) và dữ liệu trên Blockchain (on-chain).

| Thành phần | Công nghệ dự kiến | Vai trò |
|---|---|---|
| Frontend | Next.js / React, TypeScript | Giao diện marketplace và quản lý giao dịch |
| Styling | Tailwind CSS | Xây dựng giao diện responsive |
| Smart Contract | Solidity | Xử lý Escrow và ghi nhận giao dịch |
| Blockchain | Avalanche C-Chain | Thực thi Smart Contract và lưu trữ trạng thái on-chain |
| Wallet | MetaMask | Kết nối ví và xác nhận giao dịch |
| Blockchain SDK | ethers.js hoặc viem | Kết nối frontend với Smart Contract |
| Database | PostgreSQL | Lưu tài khoản, bài đăng, đơn hàng và dữ liệu ngoài Blockchain |
| ORM | Prisma | Truy vấn và quản lý dữ liệu |
| File Storage | Dịch vụ lưu trữ phù hợp | Lưu hình ảnh sản phẩm và bằng chứng giao dịch |

### 6.1. Dữ liệu On-chain

Các dữ liệu và hoạt động cần tính minh bạch, khả năng xác minh được ưu tiên ghi nhận trên Blockchain:

- Địa chỉ Smart Contract và các thành viên liên quan đến giao dịch.
- Trạng thái và số tiền trong Escrow.
- Các giao dịch nạp tiền, giải ngân và hoàn tiền.
- Hash của UniCycle Passport.
- Sự kiện hoàn tất giao dịch.

### 6.2. Dữ liệu Off-chain

Các dữ liệu cần truy vấn thường xuyên, có dung lượng lớn hoặc cần chỉnh sửa được lưu trong database và dịch vụ lưu trữ:

- Thông tin tài khoản và hồ sơ người dùng.
- Thông tin sản phẩm, danh mục, mô tả và hình ảnh.
- Nội dung UniCycle Passport.
- Bài đăng, tìm kiếm và bộ lọc.
- Thông tin đơn hàng, phương thức bàn giao và giao hàng.
- Đánh giá, bình luận và thông báo.

**Nguyên tắc thiết kế:** Chỉ đưa lên Blockchain những dữ liệu thực sự cần tính minh bạch và khả năng xác minh. Không lưu hình ảnh hoặc toàn bộ thông tin chi tiết của sản phẩm trực tiếp trên Blockchain.

---

## 7. Phạm vi phát triển MVP

MVP tập trung chứng minh ba thành phần cốt lõi có thể hoạt động trong một quy trình mua bán hoàn chỉnh: UniCycle Passport, Smart Escrow và On-chain Reputation.

Để giới hạn khối lượng phát triển, MVP nên hỗ trợ một số danh mục phổ biến trước, chẳng hạn sách và tài liệu, bàn ghế, đồ dùng phòng ở và một số vật dụng học tập. Có thể bổ sung danh mục khác sau khi quy trình chính hoạt động ổn định.

### 7.1. Chức năng bắt buộc

| Nhóm | Chức năng |
|---|---|
| User | Đăng ký, đăng nhập và quản lý hồ sơ |
| Marketplace | Đăng bán, chỉnh sửa, xem và tìm kiếm sản phẩm |
| Category & Filter | Phân loại sản phẩm; lọc theo danh mục, mức giá và tình trạng |
| UniCycle Passport | Nhập thông tin tình trạng sản phẩm, tải ảnh và tạo hash |
| Wallet | Kết nối ví và hiển thị số dư USDC |
| Smart Escrow | Tạo giao dịch, nạp tiền, xác nhận bàn giao, giải ngân và hoàn tiền theo điều kiện |
| Reputation | Ghi nhận giao dịch hoàn tất và hiển thị lịch sử giao dịch |
| Transaction History | Theo dõi trạng thái và lịch sử giao dịch |

### 7.2. Những chức năng chưa ưu tiên

Các chức năng dưới đây có thể được phát triển sau khi MVP hoạt động ổn định:

- Chat trực tiếp giữa người mua và người bán.
- Tích hợp đơn vị vận chuyển.
- Bản đồ hiển thị sản phẩm gần người dùng.
- Cơ chế phân xử tranh chấp phức tạp.
- Xác minh danh tính sinh viên.
- Gợi ý sản phẩm bằng AI.
- Hệ thống trao đổi hoặc đổi đồ không sử dụng tiền.
- NFT cho từng sản phẩm.
- Yield Farming hoặc các cơ chế tạo lợi suất.

---

## 8. Giá trị khác biệt của UniCycle

UniCycle không định vị mình là một marketplace rao vặt thông thường có tích hợp thêm Blockchain.

Điểm khác biệt của dự án nằm ở việc kết hợp ba cơ chế nhằm xây dựng niềm tin trong giao dịch hàng hóa đã qua sử dụng:

| Thành phần | Giá trị khác biệt |
|---|---|
| UniCycle Passport | Tạo hồ sơ tình trạng sản phẩm có bằng chứng và khả năng kiểm tra tính toàn vẹn |
| Smart Escrow | Bảo vệ khoản thanh toán bằng các điều kiện thực thi trên Smart Contract |
| On-chain Reputation | Xây dựng lịch sử giao dịch có thể kiểm chứng |

Ba thành phần này hỗ trợ lẫn nhau:

- **UniCycle Passport** giúp người mua có thêm cơ sở đánh giá sản phẩm trước khi giao dịch.
- **Smart Escrow** bảo vệ tiền trong quá trình giao dịch.
- **On-chain Reputation** giúp người dùng tham khảo uy tín dựa trên lịch sử giao dịch.

Bên cạnh yếu tố công nghệ, UniCycle còn hướng đến giá trị cộng đồng:

- Giúp sinh viên mua được vật dụng cần thiết với chi phí tiết kiệm hơn.
- Giúp sinh viên khóa trước thanh lý những món đồ còn giá trị sử dụng.
- Tạo một kênh mua bán tập trung dành cho cộng đồng sinh viên.
- Khuyến khích tái sử dụng sản phẩm, giảm lãng phí và kéo dài vòng đời đồ dùng.

Từ đó, UniCycle hướng tới xây dựng một môi trường giao dịch mà niềm tin không chỉ dựa vào lời cam kết giữa hai cá nhân, mà còn được hỗ trợ bởi dữ liệu và cơ chế có thể kiểm chứng.

---

## 9. Lý do lựa chọn Avalanche

UniCycle lựa chọn Avalanche C-Chain vì các lý do:

- **EVM Compatibility:** Hỗ trợ Ethereum Virtual Machine, cho phép phát triển Smart Contract bằng Solidity và sử dụng hệ sinh thái công cụ quen thuộc.
- **Phù hợp với ứng dụng Web3:** Có thể tích hợp với MetaMask, ethers.js, viem và các công cụ phát triển phổ biến.
- **Giao dịch trên Blockchain:** Các hoạt động thanh toán và cập nhật trạng thái Escrow có thể được thực thi và kiểm chứng trên mạng lưới.
- **Khả năng thử nghiệm:** Avalanche Fuji Testnet cho phép nhóm triển khai và kiểm thử ứng dụng mà không cần sử dụng tài sản thật.

Trong giai đoạn MVP, UniCycle sử dụng Fuji Testnet và USDC thử nghiệm. Việc triển khai lên Mainnet chỉ được xem xét sau khi Smart Contract được kiểm thử và đánh giá bảo mật phù hợp.

---

## 10. Mục tiêu của dự án

### Mục tiêu sản phẩm

Xây dựng một marketplace dành cho sinh viên, có thể thực hiện quy trình mua bán đồ dùng đã qua sử dụng từ lúc đăng bán đến khi hoàn tất thanh toán.

### Mục tiêu kỹ thuật

- Xây dựng và triển khai Smart Contract trên Avalanche C-Chain.
- Tích hợp ví Web3 và thanh toán bằng USDC trên Fuji Testnet.
- Kết hợp dữ liệu on-chain và off-chain.
- Xây dựng UniCycle Passport phù hợp với nhiều danh mục sản phẩm.
- Xây dựng cơ chế ghi nhận và xác minh lịch sử giao dịch.
- Đảm bảo quy trình giao dịch có thể kiểm thử và demo end-to-end.

### Mục tiêu trình diễn

Trong buổi demo, nhóm cần chứng minh được một kịch bản hoàn chỉnh:

1. Người bán đăng một món đồ đã qua sử dụng (ví dụ: bàn học) và tạo UniCycle Passport.
2. Người mua xem thông tin, hình ảnh và hồ sơ tình trạng sản phẩm.
3. Người mua kết nối ví và gửi USDC vào Smart Escrow.
4. Người bán xác nhận bàn giao sản phẩm.
5. Người mua xác nhận đã nhận sản phẩm.
6. Smart Contract giải ngân tiền cho người bán.
7. Lịch sử giao dịch của hai bên được cập nhật và có thể kiểm chứng trên Avalanche Explorer.

---

## 11. Định hướng phát triển

Sau khi MVP hoàn thành, UniCycle có thể mở rộng theo các hướng:

- **Student Verification:** Xác minh người dùng thuộc cộng đồng sinh viên thông qua email trường đại học hoặc phương thức phù hợp.
- **Dispute Resolution:** Phát triển quy trình xử lý tranh chấp có bằng chứng và quy tắc phân xử rõ ràng.
- **Campus-based Discovery:** Tìm kiếm và lọc sản phẩm theo trường đại học, ký túc xá hoặc khu vực.
- **Expanded Categories:** Mở rộng danh mục sang thiết bị điện tử, đồ gia dụng, dụng cụ thể thao và các vật dụng phù hợp khác.
- **Direct Exchange:** Phát triển tính năng trao đổi đồ dùng giữa sinh viên bên cạnh hình thức mua bán.
- **Product Lifecycle:** Theo dõi lịch sử tái sử dụng của một sản phẩm qua nhiều chủ sở hữu (nếu phù hợp).
- **Community Expansion:** Mở rộng marketplace tới nhiều trường đại học và cộng đồng sinh viên khác.

---

## 12. Kết luận

UniCycle hướng tới giải quyết một nhu cầu gần gũi với sinh viên: làm thế nào để mua bán và tái sử dụng những món đồ cần thiết cho học tập, sinh hoạt với chi phí hợp lý và giao dịch đáng tin cậy hơn.

Thông qua UniCycle Passport, Smart Escrow và On-chain Reputation, dự án kết hợp những ưu điểm của một marketplace truyền thống với khả năng xác minh và thực thi giao dịch của Blockchain.

**UniCycle không chỉ giúp sinh viên tìm được món đồ mình cần với mức giá hợp lý, mà còn kết nối cộng đồng sinh viên qua việc chia sẻ, mua bán và kéo dài vòng đời của những món đồ vẫn còn giá trị sử dụng.**
