import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { removeVietnameseTones } from "@/lib/utils/vietnamese";
import { checkProhibitedContent } from "@/lib/utils/prohibited-words";
import { reconcileExpiredOrders } from "@/lib/utils/order-timeouts";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";
import { processItemChainQueue } from "@/lib/blockchain/relayer";
import { SNOWTRACE_BASE_URL } from "@/lib/blockchain/abi";

const SCHOOL_CODE_TO_SHORTNAME: Record<string, string> = {
  "ktx-b": "KTX Khu B",
  "ktx-a": "KTX Khu A",
  hcmut: "ĐH Bách Khoa",
  hcmus: "ĐH KHTN",
  ueh: "UEH",
  uit: "ĐH CNTT",
};

export async function GET(req: NextRequest) {
  // Dọn dẹp các đơn timeout nhả hàng về AVAILABLE (BR37)
  reconcileExpiredOrders().catch((err) => console.warn("Lỗi reconcile listings:", err));

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const categorySlug = searchParams.get("category");
  const campus = searchParams.get("campus"); // schoolId hoặc shortName
  const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
  const condition = searchParams.get("condition");
  const isFree = searchParams.get("isFree") === "true";
  const hasPassport = searchParams.get("hasPassport") === "true";
  const verifiedOnly = searchParams.get("verifiedOnly") === "true";
  const sort = searchParams.get("sort") || "verified_priority"; // verified_priority, newest, price_asc, price_desc

  try {
    const andConditions: Prisma.ListingWhereInput[] = [];
    const where: Prisma.ListingWhereInput = {
      status: "AVAILABLE",
      expiresAt: {
        gt: new Date(),
      },
    };

    if (categorySlug && categorySlug !== "all") {
      where.category = { slug: categorySlug };
    }

    if (campus && campus !== "all") {
      const mappedShortName = SCHOOL_CODE_TO_SHORTNAME[campus];
      andConditions.push({
        OR: [
          { schoolId: campus },
          ...(mappedShortName ? [{ school: { shortName: mappedShortName } }] : []),
          { school: { shortName: { contains: campus, mode: "insensitive" } } },
        ],
      });
    }

    if (isFree) {
      andConditions.push({
        OR: [{ isFree: true }, { price: 0 }],
      });
    } else {
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (condition && condition !== "all") {
      where.condition = { contains: condition, mode: "insensitive" };
    }

    if (hasPassport) {
      where.item = {
        passportEnabled: true,
      };
    }

    if (verifiedOnly) {
      where.seller = {
        isStudentVerified: true,
      };
    }

    let listings = await prisma.listing.findMany({
      where,
      include: {
        school: true,
        category: true,
        seller: true,
        item: {
          include: {
            owners: true,
          },
        },
        images: {
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    // Lọc tìm kiếm tiếng Việt có/không dấu phía backend
    if (q) {
      const normalizedQuery = removeVietnameseTones(q);
      listings = listings.filter((l) => {
        const titleNorm = removeVietnameseTones(l.title);
        const descNorm = removeVietnameseTones(l.description);
        const catNorm = l.category ? removeVietnameseTones(l.category.name) : "";
        const schoolNorm = l.school ? removeVietnameseTones(l.school.name + " " + l.school.shortName) : "";

        return (
          titleNorm.includes(normalizedQuery) ||
          descNorm.includes(normalizedQuery) ||
          catNorm.includes(normalizedQuery) ||
          schoolNorm.includes(normalizedQuery)
        );
      });
    }

    // Sắp xếp
    listings.sort((a, b) => {
      if (sort === "verified_priority") {
        // Ưu tiên tin của Sinh viên đã xác minh (BR19)
        const aVerified = a.seller?.isStudentVerified ? 1 : 0;
        const bVerified = b.seller?.isStudentVerified ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Định dạng dữ liệu an toàn (BR01, BR36: Ẩn SĐT công khai nếu người bán chọn hidePhone)
    const formatted = listings.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      isFree: l.isFree,
      condition: l.condition,
      description: l.description,
      zaloPhone: l.hidePhone ? undefined : l.zaloPhone,
      hidePhone: l.hidePhone,
      createdAt: l.createdAt.toISOString(),
      school: l.school
        ? {
            id: l.school.id,
            name: l.school.name,
            shortName: l.school.shortName,
            area: l.school.area,
          }
        : null,
      category: l.category
        ? {
            id: l.category.id,
            name: l.category.name,
            slug: l.category.slug,
          }
        : null,
      seller: {
        id: l.seller.id,
        displayName: l.seller.displayName,
        avatarUrl: l.seller.avatarUrl,
        isStudentVerified: l.seller.isStudentVerified,
        reputationScore: l.seller.reputationScore,
        dorm: l.seller.dorm,
      },
      item: l.item
        ? {
            id: l.item.id,
            passportEnabled: l.item.passportEnabled,
            passportId: l.item.passportId,
            passportStatus: l.item.passportStatus,
            owners: l.item.owners.map((o) => ({
              seq: o.seq,
              showName: o.showName,
            })),
          }
        : null,
      images: l.images.map((img) => ({
        id: img.id,
        url: img.url,
      })),
    }));

    return NextResponse.json({
      listings: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.warn("⚠️ Lỗi truy vấn Database /api/listings (dùng fallback):", error);
    return NextResponse.json({
      listings: FALLBACK_PRODUCTS,
      total: FALLBACK_PRODUCTS.length,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra đăng nhập (BR01)
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để đăng tin bán món đồ (BR01)." },
        { status: 401 }
      );
    }

    // 2. Đọc payload
    const body = await req.json();
    const {
      title,
      categoryId,
      price,
      isFree,
      condition,
      description,
      schoolId,
      zaloPhone,
      hidePhone,
      passportEnabled,
      showNameOnPassport,
      resellItemId,
      images,
    } = body;

    // 3. Kiểm tra các trường bắt buộc (BR02)
    if (!title || typeof title !== "string" || title.trim().length < 5) {
      return NextResponse.json(
        { error: "Tiêu đề món đồ cần ít nhất 5 ký tự để người mua dễ nhận biết." },
        { status: 400 }
      );
    }

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json(
        { error: "Vui lòng chọn danh mục cho món đồ." },
        { status: 400 }
      );
    }

    if (!condition || typeof condition !== "string") {
      return NextResponse.json(
        { error: "Vui lòng chọn tình trạng món đồ (ví dụ: Mới 99%, Còn rất tốt...)." },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Mô tả chi tiết món đồ cần ít nhất 10 ký tự." },
        { status: 400 }
      );
    }

    if (!schoolId || typeof schoolId !== "string") {
      return NextResponse.json(
        { error: "Vui lòng chọn trường đại học hoặc khu ký túc xá giao dịch." },
        { status: 400 }
      );
    }

    if (!zaloPhone || typeof zaloPhone !== "string" || !/^(0[3|5|7|8|9])[0-9]{8}$/.test(zaloPhone.trim())) {
      return NextResponse.json(
        { error: "Số điện thoại Zalo không đúng định dạng 10 chữ số (VD: 0987654321)." },
        { status: 400 }
      );
    }

    if (!images || !Array.isArray(images) || images.length < 1) {
      return NextResponse.json(
        { error: "Vui lòng tải lên ít nhất 1 hình ảnh thật của món đồ." },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: "Mỗi tin đăng được tối đa 5 hình ảnh thật theo quy định (BR16)." },
        { status: 400 }
      );
    }

    // 4. Kiểm tra từ khóa hàng cấm (BR17)
    const prohibitedWord = checkProhibitedContent(`${title} ${description}`);
    if (prohibitedWord) {
      return NextResponse.json(
        {
          error: `Tin đăng chứa từ khóa thuộc danh mục cấm: "${prohibitedWord}". UniCycle nghiêm cấm giao dịch chất kích thích, cồn, vũ khí hoặc giấy tờ giả trong môi trường học đường (BR17).`,
        },
        { status: 400 }
      );
    }

    // 5. Tính toán giá và quà tặng 0đ
    const numericPrice = isFree ? 0 : Math.max(0, parseInt(String(price)) || 0);
    const finalIsFree = isFree === true || numericPrice === 0;

    // 6. Thời hạn tin đăng: 30 ngày (BR15)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const shouldEnablePassport = passportEnabled !== false;

    // 7. Phân giải khóa ngoại thực tế trong PostgreSQL (User, Category, School), kiểm tra BR16 và ghi DB qua Transaction
    let createdListing = null;
    let finalPassportId: string | null = null;
    let finalItemId: string | null = null;

    try {
      // 7a. Tìm hoặc đồng bộ người bán trong DB theo id hoặc email
      let dbSeller = await prisma.user.findFirst({
        where: {
          OR: [{ id: user.id }, { email: user.email }],
        },
        select: { id: true },
      });

      if (!dbSeller) {
        dbSeller = await prisma.user.create({
          data: {
            email: user.email,
            displayName: user.displayName || "Sinh viên UniCycle",
            avatarUrl: user.avatarUrl || null,
            authProvider: "email",
            role: user.role === "ADMIN" ? "ADMIN" : "USER",
            isStudentVerified: Boolean(user.isStudentVerified),
            studentVerifiedAt: user.isStudentVerified ? new Date() : null,
            dorm: user.dorm || null,
            reputationScore: user.reputationScore || 5.0,
          },
          select: { id: true },
        });
      }

      const sellerDbId = dbSeller.id;

      // 7b. Phân giải Category theo UUID id hoặc slug (VD: "giao-trinh-sach")
      const dbCategory = await prisma.category.findFirst({
        where: {
          OR: [{ id: categoryId }, { slug: categoryId }],
        },
        select: { id: true },
      });

      if (!dbCategory) {
        return NextResponse.json(
          { error: "Danh mục sản phẩm không tồn tại trong hệ thống." },
          { status: 400 }
        );
      }

      // 7c. Phân giải School theo UUID id hoặc mã ngắn (VD: "ktx-b" -> "KTX Khu B")
      const mappedShortName = SCHOOL_CODE_TO_SHORTNAME[schoolId];
      const dbSchool = await prisma.school.findFirst({
        where: {
          OR: [
            { id: schoolId },
            ...(mappedShortName ? [{ shortName: mappedShortName }] : []),
            { shortName: { contains: schoolId, mode: "insensitive" } },
            { name: { contains: schoolId, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });

      const resolvedCategoryId = dbCategory.id;
      const resolvedSchoolId = dbSchool?.id || null;

      // 7d. Kiểm tra giới hạn 10 tin/ngày (BR16)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const todayListingsCount = await prisma.listing.count({
        where: {
          sellerId: sellerDbId,
          createdAt: {
            gte: yesterday,
          },
        },
      });

      if (todayListingsCount >= 10) {
        return NextResponse.json(
          {
            error: "Bạn đã đạt giới hạn tối đa 10 tin đăng trong vòng 24 giờ theo quy định chống spam (BR16).",
          },
          { status: 429 }
        );
      }

      const txResult = await prisma.$transaction(async (tx) => {
        let createdItem = null;
        let generatedPassportId: string | null = null;

        // Nếu là luồng Bán Lại (Resell) món đồ đang sở hữu (BR24, BR25, BR33)
        if (resellItemId) {
          const existingItem = await tx.item.findUnique({
            where: { id: resellItemId },
            include: {
              listings: {
                where: {
                  status: { in: ["AVAILABLE", "RESERVED"] },
                },
              },
              owners: {
                where: { userId: sellerDbId },
                orderBy: { seq: "desc" },
                take: 1,
              },
            },
          });

          if (!existingItem) {
            throw new Error("Không tìm thấy món đồ gốc để đăng bán lại.");
          }

          if (existingItem.currentOwnerId !== sellerDbId) {
            throw new Error("Chỉ chủ sở hữu hiện tại mới có quyền đăng bán lại món đồ này (BR25).");
          }

          if (existingItem.passportStatus === "FLAGGED") {
            throw new Error(
              "Hộ chiếu món đồ này hiện đang bị gắn cờ cảnh báo vi phạm, không thể đăng bán lại (BR39)."
            );
          }

          if (existingItem.passportStatus === "ARCHIVED_OWNER_DELETED") {
            throw new Error(
              "Hộ chiếu món đồ này đang ở trạng thái lưu trữ đóng băng do tài khoản chủ cũ đã xóa (BR34)."
            );
          }

          if (existingItem.listings.length > 0) {
            throw new Error("Món đồ này hiện đang có tin đăng mở bán hoặc đang giữ chỗ trên sàn (BR18).");
          }

          // Cập nhật tùy chọn hiển thị tên nếu người dùng thay đổi (BR29)
          if (existingItem.owners[0] && typeof showNameOnPassport === "boolean") {
            await tx.passportOwner.update({
              where: { id: existingItem.owners[0].id },
              data: { showName: Boolean(showNameOnPassport) },
            });
          }

          createdItem = existingItem;
          generatedPassportId = existingItem.passportId;
        } else if (shouldEnablePassport) {
          generatedPassportId = "0x" + crypto.randomBytes(32).toString("hex");
          const itemSalt = crypto.randomBytes(16).toString("hex");
          const itemCommit = crypto
            .createHash("sha256")
            .update(`${generatedPassportId}:${title}:${resolvedCategoryId}:${itemSalt}`)
            .digest("hex");

          createdItem = await tx.item.create({
            data: {
              categoryId: resolvedCategoryId,
              currentOwnerId: sellerDbId,
              passportEnabled: true,
              passportId: generatedPassportId,
              identityLevel: "LIGHT",
              itemCommit,
              itemSalt,
              passportStatus: "ACTIVE",
            },
          });

          // Tạo Đời chủ #1 (BR29: showName theo lựa chọn, mặc định false)
          const ownerHash = "0x" + crypto.randomBytes(32).toString("hex");
          await tx.passportOwner.create({
            data: {
              itemId: createdItem.id,
              seq: 1,
              userId: sellerDbId,
              ownerHash,
              showName: Boolean(showNameOnPassport),
              since: new Date(),
            },
          });

          // Tạo sự kiện REGISTERED
          await tx.passportEvent.create({
            data: {
              itemId: createdItem.id,
              seq: 1,
              eventType: "REGISTERED",
              toOwnerHash: ownerHash,
              transferKind: "SALE",
              confirmationLevel: "BOTH",
            },
          });

          // Xếp hàng giao dịch REGISTER cho Avalanche Fuji Relayer (BR28)
          const payloadHash =
            "0x" +
            crypto
              .createHash("sha256")
              .update(`REGISTER:${createdItem.id}:${generatedPassportId}`)
              .digest("hex");

          await tx.chainTx.create({
            data: {
              itemId: createdItem.id,
              kind: "REGISTER",
              payloadHash,
              status: "QUEUED",
            },
          });
        }

        const listing = await tx.listing.create({
          data: {
            itemId: createdItem?.id || null,
            sellerId: sellerDbId,
            schoolId: resolvedSchoolId,
            categoryId: resolvedCategoryId,
            title: title.trim(),
            description: description.trim(),
            price: numericPrice,
            isFree: finalIsFree,
            condition,
            zaloPhone: zaloPhone.trim(),
            hidePhone: Boolean(hidePhone),
            status: "AVAILABLE",
            expiresAt,
            images: {
              create: images.map((img: { url: string; sha256?: string }, idx: number) => ({
                url: img.url,
                sha256: img.sha256 || null,
                position: idx,
              })),
            },
          },
          include: {
            images: true,
            school: true,
            category: true,
            item: true,
          },
        });

        return {
          listing,
          passportId: generatedPassportId,
          itemId: createdItem?.id || null,
        };
      });

      createdListing = txResult.listing;
      finalPassportId = txResult.passportId;
      finalItemId = txResult.itemId;
    } catch (dbError) {
      if (
        dbError instanceof Error &&
        (dbError.message.includes("BR") ||
          dbError.message.includes("Không tìm thấy món đồ") ||
          dbError.message.includes("quyền"))
      ) {
        return NextResponse.json(
          { error: dbError.message },
          { status: 400 }
        );
      }
      console.error("❌ Lỗi Prisma khi tạo tin đăng:", dbError);
      return NextResponse.json(
        {
          error:
            "Không thể lưu tin đăng vào cơ sở dữ liệu. Vui lòng kiểm tra kết nối và thử lại.",
        },
        { status: 500 }
      );
    }

    let latestTxHash: string | null = null;
    let snowtraceUrl: string | null = null;

    if (finalItemId && finalPassportId) {
      try {
        const syncResult = await processItemChainQueue(finalItemId);
        latestTxHash = syncResult.latestTxHash;
        snowtraceUrl =
          syncResult.snowtraceUrl ||
          (latestTxHash ? `${SNOWTRACE_BASE_URL}/tx/${latestTxHash}` : null);
      } catch (chainErr) {
        console.warn("⚠️ Lỗi phát sóng giao dịch Passport lên Fuji ngay khi đăng tin:", chainErr);
      }
    }

    return NextResponse.json(
      {
        message: "Đăng tin bán món đồ thành công!",
        listing: createdListing,
        passportId: finalPassportId,
        txHash: latestTxHash,
        snowtraceUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lỗi xử lý POST /api/listings:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi máy chủ trong quá trình đăng tin." },
      { status: 500 }
    );
  }
}
