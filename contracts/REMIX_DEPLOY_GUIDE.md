# Hướng dẫn Deploy đồng coin `UniCyclePoint (UNIP)` lên Avalanche Fuji bằng Remix IDE

Bạn chỉ cần làm theo đúng 5 bước ngắn dưới đây **1 lần duy nhất** (mất khoảng 3 phút). Không cần cài thêm phần mềm nào vào máy tính.

---

## Bước 1: Chuyển ví MetaMask sang mạng Avalanche Fuji Testnet

1. Mở tiện ích **MetaMask** trên trình duyệt của bạn.
2. Bấm vào biểu tượng chọn mạng (ở góc trên bên trái) và bật nút **Show test networks** (Hiển thị mạng thử nghiệm).
3. Tìm và chọn mạng **Avalanche Fuji** (nếu chưa có sẵn, bạn bấm **Add a custom network** và điền 5 dòng sau):
   - **Network Name**: `Avalanche Fuji C-Chain`
   - **New RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
   - **Chain ID**: `43113`
   - **Currency Symbol**: `AVAX`
   - **Block Explorer URL**: `https://testnet.snowtrace.io`

---

## Bước 2: Nhận 2 đồng AVAX thử nghiệm miễn phí (0đ) làm phí mạng lưới

1. Copy địa chỉ ví MetaMask của bạn (bắt đầu bằng `0x...`).
2. Mở trang phát AVAX thử nghiệm miễn phí:
   - Link 1 (Nhanh nhất, nhập coupon hoặc kết nối ví): https://core.app/tools/testnet-faucet/?subnet=c&token=c
   - Link 2 (Chainlink Faucet): https://faucets.chain.link/fuji
3. Dán địa chỉ ví `0x...` của bạn vào và bấm **Request AVAX**. Sau khoảng 5 giây, ví MetaMask của bạn sẽ hiện số dư `2 AVAX` (đủ dùng cho hàng nghìn giao dịch của sinh viên).

---

## Bước 3: Dán code và Biên dịch (Compile) trên Remix IDE

1. Mở trình duyệt vào trang: https://remix.ethereum.org
2. Ở cột **File Explorer** bên trái, bấm vào thư mục `contracts` $\rightarrow$ bấm nút **Create new file** (biểu tượng trang giấy) và đặt tên là `UniCyclePoint.sol`.
3. Mở file `contracts/UniCyclePoint.sol` trong dự án UniCycle của bạn, copy toàn bộ nội dung và dán vào file `UniCyclePoint.sol` trên Remix IDE.
4. Nhìn thanh công cụ ngoài cùng bên trái, bấm vào biểu tượng thứ 3 từ trên xuống (**Solidity Compiler**):
   - Ở mục **Compiler**, chọn phiên bản `0.8.20` (hoặc `0.8.24` trở lên).
   - Bấm nút màu xanh **Compile UniCyclePoint.sol**.
   - Khi thấy dấu tích màu xanh lá cây hiện lên là hợp đồng đã biên dịch thành công (Remix tự động tải thư viện `@openzeppelin/contracts` về cho bạn).

---

## Bước 4: Bấm Deploy lên mạng Avalanche Fuji

1. Nhìn thanh công cụ ngoài cùng bên trái, bấm vào biểu tượng thứ 4 từ trên xuống (**Deploy & run transactions**).
2. Tại ô **ENVIRONMENT** (dòng đầu tiên), bấm chọn **`Injected Provider - MetaMask`**:
   - Cửa sổ MetaMask sẽ bật lên hỏi quyền kết nối, bạn bấm **Connect**.
   - Kiểm tra dòng chữ nhỏ ngay dưới ô Environment có hiện **`Custom (43113) network`** là đúng mạng Avalanche Fuji.
3. Tại ô **CONTRACT**, đảm bảo đang chọn **`UniCyclePoint - contracts/UniCyclePoint.sol`**.
4. Bấm nút màu cam **Deploy** $\rightarrow$ Ví MetaMask bật lên hỏi xác nhận, bạn bấm **Confirm**.
5. Chờ khoảng 3 giây, nhìn xuống góc dưới bên trái mục **Deployed Contracts**, bạn sẽ thấy dòng `UNICYCLEPOINT AT 0x...` xuất hiện.

---

## Bước 5: Copy Địa chỉ Hợp đồng dán vào `.env.local`

1. Ở mục **Deployed Contracts** vừa hiện ra trên Remix, bấm nút **Copy** cạnh dòng `UNICYCLEPOINT AT 0x...` để lấy địa chỉ hợp đồng.
2. Tại thư mục gốc của dự án `unicycle`, tạo (hoặc mở) file `.env.local` và điền 3 dòng sau:

```env
# 1. Địa chỉ hợp đồng UniCyclePoint (UNIP) vừa copy từ Remix IDE
NEXT_PUBLIC_UNIP_CONTRACT_ADDRESS=0xDiaChiHopDongCuaBan

# 2. Private Key của Ví Chủ (MetaMask vừa dùng để Deploy)
# Cách lấy: Mở MetaMask -> Bấm dấu 3 chấm -> Account details -> Show private key -> Copy
MASTER_WALLET_PRIVATE_KEY=0xKhoaBiMatViChuCuaBan

# 3. Đường dẫn RPC mạng Avalanche Fuji Testnet
NEXT_PUBLIC_AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
```

> **Lưu ý an toàn:** File `.env.local` đã được `.gitignore` chặn lại nên khóa bí mật của Ví Chủ chỉ nằm trên máy của bạn, không bao giờ bị đẩy lên GitHub. Ngoài ra, nếu bạn chưa kịp điền `.env.local`, hệ thống ở Task 3.2 vẫn hỗ trợ chế độ chạy thử nghiệm an toàn để giao diện web không bao giờ bị lỗi.

