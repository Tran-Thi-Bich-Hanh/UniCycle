# Hướng Dẫn Deploy Smart Contract UniCyclePassport Trên Avalanche Fuji Testnet

Tài liệu này hướng dẫn chi tiết cách triển khai hợp đồng `UniCyclePassport.sol` lên mạng thử nghiệm **Avalanche Fuji C-Chain (Chain ID: 43113)** bằng **Remix IDE** trong dưới 3 phút để phục vụ buổi bảo vệ đồ án tốt nghiệp.

---

## 1. Chuẩn Bị Trước Khi Deploy

1. **Ví MetaMask hoặc Core Wallet**:
   - Thêm mạng **Avalanche Fuji C-Chain**:
     - **Network Name**: `Avalanche Fuji C-Chain`
     - **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
     - **Chain ID**: `43113`
     - **Symbol**: `AVAX`
     - **Explorer**: `https://testnet.snowtrace.io/`
2. **Nhận AVAX Testnet Miễn Phí (Faucet)**:
   - Truy cập: [https://core.app/tools/testnet-faucet/](https://core.app/tools/testnet-faucet/) (hoặc [faucets.chain.link/fuji](https://faucets.chain.link/fuji)).
   - Chọn mạng **Fuji (C-Chain)**, nhập địa chỉ ví của bạn và bấm **Request AVAX** (nhận 1–2 AVAX miễn phí để trả gas).

---

## 2. Các Bước Triển Khai Trên Remix IDE

### Bước 1: Mở Remix & Tạo File Hợp Đồng
1. Truy cập: [https://remix.ethereum.org](https://remix.ethereum.org)
2. Ở mục **File Explorer** (thanh menu trái), tạo một file mới đặt tên: `UniCyclePassport.sol`.
3. Copy toàn bộ nội dung file [contracts/UniCyclePassport.sol](file:///d:/Linh%20tinh/unicycle/contracts/UniCyclePassport.sol) và dán vào Remix.

### Bước 2: Biên Dịch Hợp Đồng (Compile)
1. Ở menu bên trái, chọn tab **Solidity Compiler** (biểu tượng chữ S).
2. Chọn phiên bản **Compiler**: `0.8.24` (hoặc mới hơn: `0.8.28`).
3. Bấm nút xanh: **Compile UniCyclePassport.sol**.
4. Khi thấy dấu tích xanh lá hiện lên là hợp đồng đã biên dịch thành công!

### Bước 3: Triển Khai (Deploy) Lên Mạng Fuji
1. Ở menu bên trái, chọn tab **Deploy & Run Transactions** (biểu tượng ví Ethereum).
2. Tại mục **Environment**: Chọn **Injected Provider - MetaMask** (MetaMask sẽ hiện popup yêu cầu kết nối, đảm bảo bạn đang chọn mạng **Fuji**).
3. Tại mục **Contract**: Chọn `UniCyclePassport - UniCyclePassport.sol`.
4. Mở rộng ô nhập tham số cạnh nút **Deploy**:
   - `admin`: Nhập địa chỉ ví MetaMask của bạn (Ví dụ: `0x...`).
   - `recorder`: Nhập địa chỉ ví Relayer của hệ thống (Nếu chưa tách ví riêng, bạn có thể nhập cùng địa chỉ ví của bạn để chính ví này vừa là Admin vừa là Relayer).
5. Bấm nút màu cam: **transact** (hoặc **Deploy**).
6. MetaMask hiện popup xác nhận giao dịch $\rightarrow$ Bấm **Confirm**.
7. Chờ 2–3 giây, giao dịch được xác nhận trên Avalanche Fuji!

---

## 3. Cấu Hình Vào Dự Án UniCycle

1. Tại mục **Deployed Contracts** ở góc dưới Remix, bạn bấm vào biểu tượng copy 📋 bên cạnh tên contract để lấy địa chỉ (VD: `0x123456789...`).
2. Mở file [`.env`](file:///d:/Linh%20tinh/unicycle/.env) trong dự án và cập nhật:
   ```env
   # Địa chỉ Smart Contract sau khi deploy
   NEXT_PUBLIC_PASSPORT_CONTRACT_ADDRESS=0x[DIA_CHI_CONTRACT_VUA_DEPLOY]

   # Khóa bí mật (Private Key) của ví recorder ở trên (dùng để backend tự động ký giao dịch)
   MASTER_WALLET_PRIVATE_KEY=[PRIVATE_KEY_VI_CUA_BAN]

   # RPC công khai mạng Fuji
   NEXT_PUBLIC_AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
   ```
3. Khởi động lại ứng dụng web: `npm run dev`.
4. Bây giờ, mọi đơn hàng hoàn tất hoặc đăng ký Passport sẽ tự động được Relayer ghi nhận và bạn có thể bấm nút **"Xác minh trên Blockchain"** để so khớp trực tiếp với Avalanche Fuji RPC!
