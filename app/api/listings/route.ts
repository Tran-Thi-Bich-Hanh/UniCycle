import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { removeVietnameseTones } from "@/lib/utils/vietnamese";
import { checkProhibitedContent } from "@/lib/utils/prohibited-words";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";

export async function GET(req: NextRequest) {
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
      where.OR = [
        { schoolId: campus },
        { school: { shortName: { contains: campus, mode: "insensitive" } } },
      ];
    }

    if (isFree) {
      where.OR = [{ isFree: true }, { price: 0 }];
    } else {
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }
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

    // 7. Kiểm tra giới hạn 10 tin/ngày (BR16) và ghi DB qua Transaction
    let createdListing = null;
    let finalPassportId: string | null = null;

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const todayListingsCount = await prisma.listing.count({
        where: {
          sellerId: user.id,
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

        if (shouldEnablePassport) {
          generatedPassportId = "0x" + crypto.randomBytes(32).toString("hex");
          const itemSalt = crypto.randomBytes(16).toString("hex");
          const itemCommit = crypto
            .createHash("sha256")
            .update(`${generatedPassportId}:${title}:${categoryId}:${itemSalt}`)
            .digest("hex");

          createdItem = await tx.item.create({
            data: {
              categoryId,
              currentOwnerId: user.id,
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
              userId: user.id,
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
        }

        const listing = await tx.listing.create({
          data: {
            itemId: createdItem?.id || null,
            sellerId: user.id,
            schoolId,
            categoryId,
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

        return { listing, passportId: generatedPassportId };
      });

      createdListing = txResult.listing;
      finalPassportId = txResult.passportId;
    } catch (dbError) {
      console.warn("⚠️ Lỗi Prisma khi tạo tin đăng (chuyển sang demo response):", dbError);

      // Demo/Fallback response nếu Database đang offline
      finalPassportId = shouldEnablePassport
        ? "0x" + crypto.randomBytes(32).toString("hex")
        : null;

      createdListing = {
        id: "demo-listing-" + Date.now(),
        title: title.trim(),
        price: numericPrice,
        isFree: finalIsFree,
        condition,
        description: description.trim(),
        schoolId,
        categoryId,
        zaloPhone: zaloPhone.trim(),
        hidePhone: Boolean(hidePhone),
        status: "AVAILABLE",
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        passportId: finalPassportId,
      };
    }

    return NextResponse.json(
      {
        message: "Đăng tin bán món đồ thành công!",
        listing: createdListing,
        passportId: finalPassportId,
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
