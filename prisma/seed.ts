import { PrismaClient, Role, UserStatus, IdentityLevel, PassportStatus, PassportEventType, ConfirmationLevel, TransferKind, ListingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu gieo mầm dữ liệu mẫu UniCycle (Seed data)...");

  // 1. Dọn dẹp dữ liệu cũ theo thứ tự quan hệ khóa ngoại
  await prisma.review.deleteMany();
  await prisma.orderInvite.deleteMany();
  await prisma.passportEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.chainTx.deleteMany();
  await prisma.passportOwner.deleteMany();
  await prisma.item.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  await prisma.category.deleteMany();

  console.log("✓ Đã làm sạch CSDL cũ.");

  // 2. Tạo danh sách trường học & KTX trọng điểm
  const schools = await Promise.all([
    prisma.school.create({
      data: {
        name: "Ký túc xá Khu B - ĐHQG TP.HCM",
        shortName: "KTX Khu B",
        emailDomain: "vnuhcm.edu.vn",
        area: "Dĩ An, Bình Dương / Thủ Đức",
      },
    }),
    prisma.school.create({
      data: {
        name: "Ký túc xá Khu A - ĐHQG TP.HCM",
        shortName: "KTX Khu A",
        emailDomain: "vnuhcm.edu.vn",
        area: "Linh Trung, Thủ Đức",
      },
    }),
    prisma.school.create({
      data: {
        name: "Trường ĐH Bách Khoa - ĐHQG TP.HCM",
        shortName: "ĐH Bách Khoa",
        emailDomain: "hcmut.edu.vn",
        area: "Quận 10 & Dĩ An",
      },
    }),
    prisma.school.create({
      data: {
        name: "Trường ĐH Khoa học Tự nhiên",
        shortName: "ĐH KHTN",
        emailDomain: "hcmus.edu.vn",
        area: "Quận 5 & Linh Trung",
      },
    }),
    prisma.school.create({
      data: {
        name: "Trường ĐH Kinh tế TP.HCM (UEH)",
        shortName: "UEH",
        emailDomain: "ueh.edu.vn",
        area: "Quận 3 & Nguyễn Văn Linh",
      },
    }),
    prisma.school.create({
      data: {
        name: "Trường ĐH Công nghệ Thông tin (UIT)",
        shortName: "ĐH CNTT",
        emailDomain: "uit.edu.vn",
        area: "Khu đô thị ĐHQG TP.HCM",
      },
    }),
  ]);

  const ktxB = schools[0];
  const hcmut = schools[2];
  console.log(`✓ Đã tạo ${schools.length} trường học & KTX.`);

  // 3. Tạo danh mục sản phẩm sinh viên chuẩn
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        slug: "giao-trinh-sach",
        name: "Giáo trình & Sách học",
        description: "Giáo trình đại cương, chuyên ngành, tài liệu ôn thi",
        icon: "BookOpenIcon",
      },
    }),
    prisma.category.create({
      data: {
        slug: "ban-ghe-tu-ktx",
        name: "Bàn ghế & Tủ KTX",
        description: "Bàn học gấp, ghế xoay, kệ sách, tủ vải sinh viên",
        icon: "ArchiveBoxIcon",
      },
    }),
    prisma.category.create({
      data: {
        slug: "do-gia-dung-quat",
        name: "Đồ gia dụng & Quạt điện",
        description: "Quạt đứng Senko, ấm siêu tốc, nồi cơm mini, đèn bàn",
        icon: "BoltIcon",
      },
    }),
    prisma.category.create({
      data: {
        slug: "do-dien-tu-phu-kien",
        name: "Đồ điện tử & Phụ kiện",
        description: "Máy tính Casio fx-580VNX, chuột, bàn phím, tai nghe",
        icon: "CpuChipIcon",
      },
    }),
    prisma.category.create({
      data: {
        slug: "xe-dap-phuong-tien",
        name: "Xe đạp & Phương tiện",
        description: "Xe đạp đi học trong làng đại học, mũ bảo hiểm",
        icon: "TruckIcon",
      },
    }),
    prisma.category.create({
      data: {
        slug: "goc-0d-cho-tang",
        name: "Góc 0đ Cho Tặng",
        description: "Chia sẻ đồ dùng, sách vở hoàn toàn miễn phí cho bạn bè",
        icon: "GiftIcon",
      },
    }),
  ]);

  const catElectronics = categories[3];
  const catHome = categories[2];
  const catFree = categories[5];
  console.log(`✓ Đã tạo ${categories.length} danh mục sản phẩm.`);

  // 4. Tạo tài khoản người dùng mẫu
  const studentPasswordHash = await bcrypt.hash("Student@123456", 10);
  const adminPasswordHash = await bcrypt.hash("Admin@123456", 10);

  // Admin
  await prisma.user.create({
    data: {
      email: "admin@unicycle.vn",
      passwordHash: adminPasswordHash,
      displayName: "Ban Quản Trị UniCycle",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isStudentVerified: true,
      studentVerifiedAt: new Date(),
      reputationScore: 5.0,
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    },
  });

  // Sinh viên 1: Nguyễn Hoàng Nam (Bách Khoa KTX B)
  const studentNam = await prisma.user.create({
    data: {
      email: "hoangnam.bka@gmail.com",
      passwordHash: studentPasswordHash,
      displayName: "Nguyễn Hoàng Nam",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isStudentVerified: true,
      studentVerifiedAt: new Date(),
      schoolId: hcmut.id,
      dorm: "Tòa B4 - KTX Khu B ĐHQG",
      reputationScore: 4.95,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
  });

  // Sinh viên 2: Trần Hải Yến (KHTN KTX B)
  const studentYen = await prisma.user.create({
    data: {
      email: "haiyen.khtn@gmail.com",
      passwordHash: studentPasswordHash,
      displayName: "Trần Hải Yến",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isStudentVerified: true,
      studentVerifiedAt: new Date(),
      schoolId: ktxB.id,
      dorm: "Tòa BA1 - KTX Khu B ĐHQG",
      reputationScore: 5.0,
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    },
  });

  console.log("✓ Đã tạo tài khoản Admin và 2 Sinh viên (Nam & Yến).");

  // 5. Tạo Món đồ #1 có Hộ chiếu Product Passport (Đã qua 2 đời chủ)
  const itemCasio = await prisma.item.create({
    data: {
      categoryId: catElectronics.id,
      currentOwnerId: studentNam.id,
      passportEnabled: true,
      passportId: "0x6a8f12c4b7890123456789abcdef0123456789abcdef0123456789abcdef01",
      identityLevel: IdentityLevel.SERIAL,
      itemCommit: "0x98fbcde4521764839210457638921abcdef0987654321fedcba098765432101",
      passportStatus: PassportStatus.ACTIVE,
      owners: {
        create: [
          {
            seq: 1,
            userId: studentYen.id,
            ownerHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeefff1",
            showName: false, // Ẩn danh theo BR29
            since: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 tháng trước
          },
          {
            seq: 2,
            userId: studentNam.id,
            ownerHash: "0x222233334444555566667777888899990000aaaabbbbccccddddeeeefff2",
            showName: true,
            since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 tháng trước
          },
        ],
      },
      events: {
        create: [
          {
            seq: 1,
            eventType: PassportEventType.REGISTERED,
            occurredAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          },
          {
            seq: 2,
            eventType: PassportEventType.TRANSFERRED,
            fromOwnerHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeefff1",
            toOwnerHash: "0x222233334444555566667777888899990000aaaabbbbccccddddeeeefff2",
            transferKind: TransferKind.SALE,
            confirmationLevel: ConfirmationLevel.BOTH,
            occurredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Tạo Tin đăng cho Máy tính Casio
  const expiresAfter30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.listing.create({
    data: {
      itemId: itemCasio.id,
      sellerId: studentNam.id,
      schoolId: ktxB.id,
      categoryId: catElectronics.id,
      title: "Máy tính Casio fx-580VNX chính hãng Bitex (Đời chủ #2, nguyên tem)",
      description: "Máy tính dòng X chuyên dụng cho sinh viên thi Giải tích, Đại số tuyến tính và Vật lý. Phím bấm nảy êm, nắp và màn hình không vết trầy, có Product Passport tra cứu minh bạch nguồn gốc.",
      price: 380000,
      isFree: false,
      condition: "Mới 98%",
      zaloPhone: "0909123456",
      status: ListingStatus.AVAILABLE,
      expiresAt: expiresAfter30Days,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600",
            position: 0,
          },
        ],
      },
    },
  });

  // 6. Tạo Món đồ #2: Quạt Senko KTX
  const itemFan = await prisma.item.create({
    data: {
      categoryId: catHome.id,
      currentOwnerId: studentNam.id,
      passportEnabled: true,
      passportId: "0x7b9a23d5c890123456789abcdef0123456789abcdef0123456789abcdef02",
      identityLevel: IdentityLevel.LIGHT,
      passportStatus: PassportStatus.ACTIVE,
      owners: {
        create: [
          {
            seq: 1,
            userId: studentNam.id,
            ownerHash: "0x33334444555566667777888899990000aaaabbbbccccddddeeeefff3",
            showName: true,
            since: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      events: {
        create: [
          {
            seq: 1,
            eventType: PassportEventType.REGISTERED,
            occurredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  await prisma.listing.create({
    data: {
      itemId: itemFan.id,
      sellerId: studentNam.id,
      schoolId: ktxB.id,
      categoryId: catHome.id,
      title: "Quạt lỡ Senko êm ru, gió mạnh tiết kiệm điện phòng KTX",
      description: "Quạt đứng Senko cao 1m, 3 nấc gió êm không ồn ban đêm, lồng sắt sơn chống rỉ an toàn. Tặng kèm ổ cắm nối dài 3 chấu cho bạn nào ở KTX Khu B.",
      price: 130000,
      isFree: false,
      condition: "Còn rất tốt",
      zaloPhone: "0909123456",
      status: ListingStatus.AVAILABLE,
      expiresAt: expiresAfter30Days,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=600",
            position: 0,
          },
        ],
      },
    },
  });

  // 7. Tạo Món đồ #3: Góc 0đ Cho Tặng Giáo trình
  await prisma.listing.create({
    data: {
      sellerId: studentYen.id,
      schoolId: ktxB.id,
      categoryId: catFree.id,
      title: "Bộ Giáo trình Giải tích 1 & 2 ĐHQG kèm tuyển tập đề thi (Tặng 0đ)",
      description: "Mình đã qua môn nên tặng lại hoàn toàn miễn phí cho các bạn khóa mới K24, K25. Sách đã đánh dấu sẵn các công thức quan trọng và tip giải nhanh giữa kỳ.",
      price: 0,
      isFree: true,
      condition: "Đã sử dụng",
      zaloPhone: "0918765432",
      status: ListingStatus.AVAILABLE,
      expiresAt: expiresAfter30Days,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
            position: 0,
          },
        ],
      },
    },
  });

  console.log("✓ Đã tạo 3 tin đăng mẫu (Casio fx-580 có Passport 2 đời chủ, Quạt Senko KTX, Bộ Giáo trình tặng 0đ).");
  console.log("🎉 Seed dữ liệu mẫu hoàn tất 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

