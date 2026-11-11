// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UniCyclePoint (UNIP)
 * @notice Đồng điểm nội bộ chuẩn ERC-20 (1 VNĐ = 1 UNIP) kết hợp Sổ cọc thông minh (Escrow)
 *         trên mạng Avalanche Fuji Testnet dành cho chợ đồ cũ sinh viên UniCycle.
 * @dev Ví Chủ (Master Wallet - Owner) đại diện hệ thống thực thi đúc điểm sau khi
 *      xác nhận thanh toán MoMo Test và tài trợ phí gas (Gasless UX) cho sinh viên.
 */
contract UniCyclePoint is ERC20, Ownable {
    enum EscrowStatus {
        NONE,
        LOCKED,
        RELEASED,
        REFUNDED
    }

    struct EscrowOrder {
        string orderId;
        address buyer;
        address seller;
        uint256 amount;
        bytes32 passportHash;
        EscrowStatus status;
        uint256 createdAt;
        uint256 settledAt;
    }

    // Lưu trạng thái đơn đặt cọc theo mã băm của orderId
    mapping(bytes32 => EscrowOrder) private _escrows;

    // Chống nạp trùng cùng một mã giao dịch MoMo
    mapping(bytes32 => bool) public processedMomoOrders;

    // Sự kiện ghi vết công khai trên Avalanche Fuji Snowtrace
    event MomoTopupMinted(
        address indexed userWallet,
        uint256 amount,
        string momoOrderId,
        uint256 timestamp
    );

    event EscrowLocked(
        string orderId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        bytes32 indexed passportHash,
        uint256 timestamp
    );

    event EscrowReleased(
        string orderId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        bytes32 indexed passportHash,
        uint256 timestamp
    );

    event EscrowRefunded(
        string orderId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        bytes32 indexed passportHash,
        uint256 timestamp
    );

    constructor() ERC20("UniCycle Point", "UNIP") Ownable(msg.sender) {}

    /**
     * @notice Sử dụng 0 chữ số thập phân để 1 UNIP tương ứng chính xác 1 VNĐ (VD: 50,000 UNIP = 50.000đ)
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * @notice Đúc (Mint) đồng UNIP vào ví riêng của sinh viên sau khi nạp MoMo Test thành công
     * @param to Địa chỉ ví Blockchain riêng của sinh viên (0x...)
     * @param amount Số lượng UNIP cần đúc (1 VNĐ = 1 UNIP)
     * @param momoOrderId Mã tham chiếu đơn nạp tiền MoMo
     */
    function mintTopup(
        address to,
        uint256 amount,
        string calldata momoOrderId
    ) external onlyOwner {
        require(to != address(0), "UniCycle: Dia chi vi khong hop le");
        require(amount > 0, "UniCycle: So diem nap phai lon hon 0");

        bytes32 momoKey = keccak256(abi.encodePacked(momoOrderId));
        require(!processedMomoOrders[momoKey], "UniCycle: Ma giao dich MoMo nay da duoc xu ly");

        processedMomoOrders[momoKey] = true;
        _mint(to, amount);

        emit MomoTopupMinted(to, amount, momoOrderId, block.timestamp);
    }

    /**
     * @notice Khóa tạm UNIP từ ví người mua vào hợp đồng để giữ chỗ món đồ kèm mã băm Sổ đỏ (Passport Hash)
     */
    function lockEscrow(
        string calldata orderId,
        address buyer,
        address seller,
        uint256 amount,
        bytes32 passportHash
    ) external onlyOwner {
        require(buyer != address(0) && seller != address(0), "UniCycle: Dia chi vi khong hop le");
        require(buyer != seller, "UniCycle: Nguoi mua va nguoi ban phai khac nhau");
        require(amount > 0, "UniCycle: So diem dat coc phai lon hon 0");
        require(passportHash != bytes32(0), "UniCycle: Ma bam Passport khong duoc de trong");
        require(balanceOf(buyer) >= amount, "UniCycle: So du UNIP cua nguoi mua khong du");

        bytes32 orderKey = keccak256(abi.encodePacked(orderId));
        require(_escrows[orderKey].status == EscrowStatus.NONE, "UniCycle: Ma don dat coc da ton tai");

        // Chuyển UNIP từ ví người mua vào hợp đồng giữ cọc
        _transfer(buyer, address(this), amount);

        _escrows[orderKey] = EscrowOrder({
            orderId: orderId,
            buyer: buyer,
            seller: seller,
            amount: amount,
            passportHash: passportHash,
            status: EscrowStatus.LOCKED,
            createdAt: block.timestamp,
            settledAt: 0
        });

        emit EscrowLocked(orderId, buyer, seller, amount, passportHash, block.timestamp);
    }

    /**
     * @notice Giải ngân UNIP từ hợp đồng sang ví người bán khi người mua xác nhận đã nhận đúng đồ
     */
    function releaseEscrow(string calldata orderId) external onlyOwner {
        bytes32 orderKey = keccak256(abi.encodePacked(orderId));
        EscrowOrder storage order = _escrows[orderKey];

        require(order.status == EscrowStatus.LOCKED, "UniCycle: Don coc khong o trang thai LOCKED");

        order.status = EscrowStatus.RELEASED;
        order.settledAt = block.timestamp;

        _transfer(address(this), order.seller, order.amount);

        emit EscrowReleased(
            order.orderId,
            order.buyer,
            order.seller,
            order.amount,
            order.passportHash,
            block.timestamp
        );
    }

    /**
     * @notice Hoàn trả 100% UNIP về lại ví người mua khi hai bên hủy kèo giao dịch
     */
    function refundEscrow(string calldata orderId) external onlyOwner {
        bytes32 orderKey = keccak256(abi.encodePacked(orderId));
        EscrowOrder storage order = _escrows[orderKey];

        require(order.status == EscrowStatus.LOCKED, "UniCycle: Don coc khong o trang thai LOCKED");

        order.status = EscrowStatus.REFUNDED;
        order.settledAt = block.timestamp;

        _transfer(address(this), order.buyer, order.amount);

        emit EscrowRefunded(
            order.orderId,
            order.buyer,
            order.seller,
            order.amount,
            order.passportHash,
            block.timestamp
        );
    }

    /**
     * @notice Tra cứu thông tin chi tiết của một đơn đặt cọc trên Blockchain
     */
    function getEscrow(
        string calldata orderId
    )
        external
        view
        returns (
            address buyer,
            address seller,
            uint256 amount,
            bytes32 passportHash,
            EscrowStatus status,
            uint256 createdAt,
            uint256 settledAt
        )
    {
        bytes32 orderKey = keccak256(abi.encodePacked(orderId));
        EscrowOrder memory order = _escrows[orderKey];
        return (
            order.buyer,
            order.seller,
            order.amount,
            order.passportHash,
            order.status,
            order.createdAt,
            order.settledAt
        );
    }
}

