// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UniCyclePassport
 * @dev Hộ chiếu đồ vật số (Digital Product Passport) cho sinh viên trên Avalanche Fuji C-Chain.
 * Ghi nhận chuỗi chuyển nhượng quyền sở hữu bất biến và trạng thái cờ vi phạm (Flag/Unflag).
 * Chỉ lưu mã băm ẩn danh (bytes32) để bảo vệ dữ liệu cá nhân theo quy tắc BR27.
 */
contract UniCyclePassport is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    struct Passport {
        bytes32 itemCommit;      // Hash cam kết thông tin & ảnh món đồ (có salt bí mật giữ off-chain)
        bytes32 currentOwner;    // Pseudonym hash ngẫu nhiên của chủ sở hữu hiện tại
        uint32  transferCount;   // Số lần chuyển giao thành công
        bool    flagged;         // Đang bị gắn cờ vi phạm (đồ báo mất, gian lận)
        bool    exists;          // Đã được đăng ký trên chuỗi
    }

    mapping(bytes32 => Passport) public passports;

    // --- SỰ KIỆN ON-CHAIN ---
    event PassportRegistered(
        bytes32 indexed passportId,
        bytes32 indexed ownerHash,
        bytes32 itemCommit,
        uint64 timestamp
    );

    event OwnershipTransferred(
        bytes32 indexed passportId,
        bytes32 indexed fromHash,
        bytes32 indexed toHash,
        bytes32 orderHash,        // keccak256(orderId ‖ itemSalt); không lộ dữ liệu đơn hàng
        uint32  seq,              // Thứ tự chuyển giao (1, 2, 3...)
        uint8   confirmation,     // 1 = Hai bên xác nhận (BOTH), 2 = Một bên (ONE_SIDE - tự hoàn tất)
        uint64  timestamp
    );

    event PassportFlagged(
        bytes32 indexed passportId,
        bytes32 reasonHash,
        uint64 timestamp
    );

    event PassportUnflagged(
        bytes32 indexed passportId,
        uint64 timestamp
    );

    /**
     * @dev Khởi tạo hợp đồng và cấp quyền Admin & Relayer (Recorder)
     * @param admin Địa chỉ ví quản trị viên (có quyền flag/unflag và quản lý vai trò)
     * @param recorder Địa chỉ ví Relayer tự động ký giao dịch hộ sinh viên
     */
    constructor(address admin, address recorder) {
        require(admin != address(0), "Admin address cannot be zero");
        require(recorder != address(0), "Recorder address cannot be zero");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, recorder);
    }

    /**
     * @dev Đăng ký Hộ chiếu đồ vật lần đầu lên blockchain
     */
    function register(
        bytes32 passportId,
        bytes32 ownerHash,
        bytes32 itemCommit
    ) external onlyRole(RECORDER_ROLE) {
        require(!passports[passportId].exists, "Passport already registered");
        require(ownerHash != bytes32(0), "Invalid owner hash");
        require(itemCommit != bytes32(0), "Invalid item commit");

        passports[passportId] = Passport({
            itemCommit: itemCommit,
            currentOwner: ownerHash,
            transferCount: 0,
            flagged: false,
            exists: true
        });

        emit PassportRegistered(passportId, ownerHash, itemCommit, uint64(block.timestamp));
    }

    /**
     * @dev Chuyển giao quyền sở hữu cho chủ kế tiếp khi đơn hàng hoàn tất
     */
    function transfer(
        bytes32 passportId,
        bytes32 fromHash,
        bytes32 toHash,
        bytes32 orderHash,
        uint8 confirmation
    ) external onlyRole(RECORDER_ROLE) {
        Passport storage p = passports[passportId];
        require(p.exists, "Passport does not exist");
        require(!p.flagged, "Passport is flagged");
        require(confirmation == 1 || confirmation == 2, "Invalid confirmation level");
        require(p.currentOwner == fromHash, "Sender is not current owner");
        require(toHash != fromHash, "Cannot transfer to same owner");
        require(toHash != bytes32(0), "Invalid recipient hash");

        p.currentOwner = toHash;
        p.transferCount += 1;

        emit OwnershipTransferred(
            passportId,
            fromHash,
            toHash,
            orderHash,
            p.transferCount,
            confirmation,
            uint64(block.timestamp)
        );
    }

    /**
     * @dev Gắn cờ vi phạm cho Passport (đồ bị mất cắp/gian lận theo BR32, BR39)
     */
    function flag(bytes32 passportId, bytes32 reasonHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Passport storage p = passports[passportId];
        require(p.exists, "Passport does not exist");
        require(!p.flagged, "Already flagged");

        p.flagged = true;
        emit PassportFlagged(passportId, reasonHash, uint64(block.timestamp));
    }

    /**
     * @dev Gỡ cờ vi phạm (khi khiếu nại đã giải quyết hoặc gỡ cờ nhầm)
     */
    function unflag(bytes32 passportId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Passport storage p = passports[passportId];
        require(p.exists, "Passport does not exist");
        require(p.flagged, "Not flagged");

        p.flagged = false;
        emit PassportUnflagged(passportId, uint64(block.timestamp));
    }

    /**
     * @dev Hàm đọc tiện lợi trả về toàn bộ thông tin Passport
     */
    function getPassport(bytes32 passportId)
        external
        view
        returns (
            bytes32 itemCommit,
            bytes32 currentOwner,
            uint32 transferCount,
            bool flagged,
            bool exists
        )
    {
        Passport memory p = passports[passportId];
        return (p.itemCommit, p.currentOwner, p.transferCount, p.flagged, p.exists);
    }
}
