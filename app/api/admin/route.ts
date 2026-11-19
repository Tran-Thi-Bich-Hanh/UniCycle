import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { reconcileExpiredOrders } from "@/lib/utils/order-timeouts";
import { executeOrderCompletionAndPassportTransfer } from "@/lib/utils/passport-transfer";
import { processItemChainQueue } from "@/lib/blockchain/relayer";
import { HEADER_CATEGORIES } from "@/lib/constants/categories";

async function requireAdmin() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return {
      errorResponse: NextResponse.json(
        { error: "Vui lòng đăng nhập bằng tài khoản Quản trị viên." },
        { status: 401 }
      ),
      admin: null,
      actorAdminId: null,
    };
  }

  if (sessionUser.role !== "ADMIN") {
    return {
      errorResponse: NextResponse.json(
        { error: "Bạn không có quyền truy cập khu vực Quản trị (Admin only)." },
        { status: 403 }
      ),
      admin: null,
      actorAdminId: null,
    };
  }

  let actorAdminId = sessionUser.id;
  try {
    const dbAdmin = await prisma.user.findFirst({
      where: { OR: [{ id: sessionUser.id }, { email: sessionUser.email }] },
      select: { id: true },
    });
    if (dbAdmin) {
      actorAdminId = dbAdmin.id;
    }
  } catch {
    // Fallback to session ID
  }

  return { errorResponse: null, admin: sessionUser, actorAdminId };
}

/**
 * GET /api/admin
 * Tải toàn bộ dữ liệu trung tâm điều hành Quản trị viên:
 * - Số liệu tổng quan (người dùng, tin đăng, đơn hẹn, hộ chiếu, khiếu nại, báo cáo)
 * - Biểu đồ phân bố tin đăng theo cơ sở/trường và theo danh mục
 * - Dòng hoạt động nghiệp vụ gần nhất
 * - Danh sách tin đăng quản trị (tìm kiếm, lọc trạng thái, ẩn/khôi phục/gỡ tin)
 * - Danh sách tài khoản người dùng & hàng đợi duyệt thẻ sinh viên
 * - Đơn tranh chấp cần phân xử (SLA 72h)
 * - Báo cáo vi phạm cộng đồng
 * - Giám sát đồng bộ sổ cái blockchain
 */
export async function GET() {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    await reconcileExpiredOrders();

    const [
      totalUsers,
      verifiedUsersCount,
      suspendedUsersCount,
      activeListings,
      totalListings,
      passportListingsCount,
      multiOwnerItemsGroup,
      completedOrdersCount,
      activeOrdersCount,
      disputedOrders,
      passports,
      reports,
      pendingStudents,
      chainTxs,
      flaggedPassportsCount,
      pendingChainTxsCount,
      schoolsWithCount,
      categoriesWithCount,
      recentListings,
      recentOrders,
      rawListings,
      rawUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { status: { not: "DELETED" } } }),
      prisma.user.count({ where: { isStudentVerified: true, status: { not: "DELETED" } } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.listing.count({ where: { status: "AVAILABLE" } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "AVAILABLE", item: { passportEnabled: true } } }),
      prisma.passportOwner.groupBy({
        by: ["itemId"],
        _count: { itemId: true },
        having: { itemId: { _count: { gt: 1 } } },
      }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.order.count({ where: { status: { in: ["ACCEPTED", "WAITING_CONFIRMATION"] } } }),
      prisma.order.findMany({
        where: { status: "DISPUTED" },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
              itemId: true,
              images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
              item: { select: { id: true, passportId: true, passportStatus: true } },
            },
          },
          buyer: {
            select: { id: true, displayName: true, email: true, reputationScore: true },
          },
          seller: {
            select: { id: true, displayName: true, email: true, reputationScore: true },
          },
        },
        orderBy: { disputedAt: "asc" },
      }),
      prisma.item.findMany({
        where: { passportEnabled: true },
        include: {
          category: { select: { name: true } },
          currentOwner: { select: { id: true, displayName: true, email: true } },
          listings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, title: true, status: true },
          },
          _count: { select: { owners: true } },
          chainTxs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true, kind: true, txHash: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.report.findMany({
        include: {
          reporter: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 40,
      }),
      prisma.user.findMany({
        where: {
          studentCardUrl: { not: null },
          isStudentVerified: false,
          status: "ACTIVE",
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          studentCardUrl: true,
          dorm: true,
          createdAt: true,
          school: { select: { id: true, name: true, shortName: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.chainTx.findMany({
        include: {
          item: { select: { id: true, passportId: true, passportStatus: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.item.count({ where: { passportStatus: "FLAGGED" } }),
      prisma.chainTx.count({
        where: { status: { in: ["QUEUED", "FAILED", "NEEDS_ATTENTION"] } },
      }),
      prisma.school.findMany({
        select: {
          name: true,
          shortName: true,
          _count: {
            select: {
              listings: { where: { status: "AVAILABLE" } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          _count: {
            select: {
              listings: { where: { status: "AVAILABLE" } },
            },
          },
        },
      }),
      prisma.listing.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          createdAt: true,
          seller: { select: { displayName: true } },
        },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          status: true,
          createdAt: true,
          listing: { select: { title: true } },
          buyer: { select: { displayName: true } },
          seller: { select: { displayName: true } },
        },
      }),
      prisma.listing.findMany({
        take: 80,
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          school: { select: { id: true, name: true, shortName: true } },
          seller: {
            select: {
              id: true,
              displayName: true,
              email: true,
              isStudentVerified: true,
              dorm: true,
              school: { select: { name: true, shortName: true } },
            },
          },
          item: {
            select: {
              id: true,
              passportId: true,
              passportStatus: true,
              passportEnabled: true,
              owners: { select: { seq: true }, orderBy: { seq: "desc" }, take: 1 },
            },
          },
          images: {
            select: { url: true, position: true },
            orderBy: { position: "asc" },
            take: 1,
          },
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.findMany({
        where: { status: { not: "DELETED" } },
        take: 80,
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          status: true,
          isStudentVerified: true,
          studentVerifiedAt: true,
          studentCardUrl: true,
          reputationScore: true,
          dorm: true,
          createdAt: true,
          school: { select: { id: true, name: true, shortName: true } },
          _count: {
            select: {
              listings: true,
              buyingOrders: true,
              sellingOrders: true,
            },
          },
        },
        orderBy: [{ isStudentVerified: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    const pendingReportsCount = reports.filter((r) => r.status === "PENDING").length;
    const multiOwnerItemsCount = multiOwnerItemsGroup.length;

    // Phân bố theo trường
    const totalActive = activeListings > 0 ? activeListings : 1;
    const distributionBySchool = schoolsWithCount
      .map((s) => ({
        label: s.shortName || s.name,
        count: s._count.listings,
        percentage: Math.round((s._count.listings / totalActive) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Phân bố theo danh mục (chuẩn hóa theo HEADER_CATEGORIES)
    const categoryCountMap = new Map<string, number>();
    for (const c of categoriesWithCount) {
      categoryCountMap.set(c.slug, (categoryCountMap.get(c.slug) || 0) + c._count.listings);
      categoryCountMap.set(c.name.toLowerCase(), (categoryCountMap.get(c.name.toLowerCase()) || 0) + c._count.listings);
    }
    const distributionByCategory = HEADER_CATEGORIES.map((hc) => {
      const matched = categoryCountMap.get(hc.slug) || categoryCountMap.get(hc.name.toLowerCase()) || 0;
      return {
        label: hc.name,
        count: matched,
        percentage: Math.round((matched / totalActive) * 100),
      };
    });

    // Dòng hoạt động nghiệp vụ gần nhất
    interface ActivityItem {
      id: string;
      type: "listing" | "order" | "report";
      title: string;
      subtitle: string;
      time: string;
      status: string;
      statusBadgeColor?: "green" | "blue" | "amber" | "rose" | "slate";
      sortTime: number;
    }

    const activities: ActivityItem[] = [];

    for (const l of recentListings) {
      activities.push({
        id: `listing-${l.id}`,
        type: "listing",
        title: `Tin đăng: ${l.title}`,
        subtitle: `Người bán: ${l.seller.displayName} • ${l.price > 0 ? l.price.toLocaleString("vi-VN") + " đ" : "Tặng 0đ"}`,
        time: l.createdAt.toISOString(),
        status: l.status,
        statusBadgeColor: l.status === "AVAILABLE" ? "green" : l.status === "RESERVED" ? "amber" : "slate",
        sortTime: new Date(l.createdAt).getTime(),
      });
    }

    for (const o of recentOrders) {
      activities.push({
        id: `order-${o.id}`,
        type: "order",
        title: `Đơn hẹn: ${o.listing?.title || "Món đồ"}`,
        subtitle: `${o.buyer.displayName} hẹn gặp ${o.seller.displayName}`,
        time: o.createdAt.toISOString(),
        status: o.status,
        statusBadgeColor: o.status === "COMPLETED" ? "green" : o.status === "DISPUTED" ? "rose" : "blue",
        sortTime: new Date(o.createdAt).getTime(),
      });
    }

    activities.sort((a, b) => b.sortTime - a.sortTime);
    const recentActivities = activities.slice(0, 8).map(({ id, type, title, subtitle, time, status, statusBadgeColor }) => ({
      id,
      type,
      title,
      subtitle,
      time,
      status,
      statusBadgeColor,
    }));

    // Đếm số báo cáo cho từng tin đăng
    const listingIds = rawListings.map((l) => l.id);
    const listingReports = await prisma.report.findMany({
      where: {
        targetType: "LISTING",
        targetId: { in: listingIds },
      },
      select: { targetId: true },
    });

    const reportCountByListing = new Map<string, number>();
    for (const r of listingReports) {
      reportCountByListing.set(r.targetId, (reportCountByListing.get(r.targetId) || 0) + 1);
    }

    const listings = rawListings.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      isFree: l.isFree,
      status: l.status,
      condition: l.condition,
      createdAt: l.createdAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
      category: l.category,
      school: l.school,
      seller: l.seller,
      item: l.item
        ? {
            id: l.item.id,
            passportId: l.item.passportId,
            passportStatus: l.item.passportStatus,
            passportEnabled: l.item.passportEnabled,
            currentOwnerSeq: l.item.owners[0]?.seq,
          }
        : null,
      images: l.images,
      ordersCount: l._count.orders,
      reportsCount: reportCountByListing.get(l.id) || 0,
    }));

    // Sắp xếp người dùng: Ưu tiên hồ sơ tải thẻ SV chờ duyệt lên trước
    const sortedUsers = [...rawUsers].sort((a, b) => {
      const aPending = Boolean(a.studentCardUrl && !a.isStudentVerified);
      const bPending = Boolean(b.studentCardUrl && !b.isStudentVerified);
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const users = sortedUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      status: u.status,
      isStudentVerified: u.isStudentVerified,
      studentVerifiedAt: u.studentVerifiedAt ? u.studentVerifiedAt.toISOString() : null,
      studentCardUrl: u.studentCardUrl,
      reputationScore: u.reputationScore,
      dorm: u.dorm,
      createdAt: u.createdAt.toISOString(),
      school: u.school,
      _count: u._count,
    }));

    return NextResponse.json({
      serverNow: new Date().toISOString(),
      stats: {
        totalUsers,
        verifiedUsersCount,
        suspendedUsersCount,
        activeListings,
        totalListings,
        passportListingsCount,
        multiOwnerItemsCount,
        completedOrdersCount,
        activeOrdersCount,
        disputedOrdersCount: disputedOrders.length,
        pendingReportsCount,
        pendingStudentCardsCount: pendingStudents.length,
        flaggedPassportsCount,
        pendingChainTxsCount,
      },
      distribution: {
        bySchool: distributionBySchool,
        byCategory: distributionByCategory,
      },
      recentActivities,
      listings,
      users,
      disputedOrders,
      passports,
      reports,
      pendingStudents,
      chainTxs,
    });
  } catch (error) {
    console.error("Lỗi GET /api/admin:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải dữ liệu bảng quản trị Admin." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin
 * Thực thi các thao tác vận hành, kiểm duyệt & phân xử của Admin
 */
export async function POST(req: NextRequest) {
  try {
    const { errorResponse, actorAdminId } = await requireAdmin();
    if (errorResponse || !actorAdminId) return errorResponse!;

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const now = new Date();

    // ------------------------------------------------------------------
    // 1. QUẢN LÝ TIN ĐĂNG (ẨN / KHÔI PHỤC / GỠ BỎ TIN)
    // ------------------------------------------------------------------
    if (action === "moderate_listing") {
      const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
      const mode = typeof body.mode === "string" ? body.mode.trim() : "";
      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "Vi phạm quy chế cộng đồng hoặc không phù hợp tiêu chuẩn đăng tin.";

      if (!listingId || !["hide", "restore", "remove"].includes(mode)) {
        return NextResponse.json(
          { error: "Thiếu mã tin đăng hoặc thao tác không hợp lệ." },
          { status: 400 }
        );
      }

      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          orders: {
            where: { status: { in: ["ACCEPTED", "WAITING_CONFIRMATION", "PENDING"] } },
            select: { id: true, status: true, buyerId: true },
          },
        },
      });

      if (!listing) {
        return NextResponse.json({ error: "Không tìm thấy tin đăng." }, { status: 404 });
      }

      // Kiểm tra an toàn: Nếu tin đang có đơn hẹn gặp đã chấp nhận hoặc chờ xác nhận
      const hasActiveOrders = listing.orders.some((o) =>
        ["ACCEPTED", "WAITING_CONFIRMATION"].includes(o.status)
      );
      if ((mode === "hide" || mode === "remove") && (listing.status === "RESERVED" || hasActiveOrders)) {
        return NextResponse.json(
          {
            error:
              "Tin đăng đang có cuộc hẹn xem hàng đã chốt. Vui lòng phân xử hoặc đóng đơn hẹn trước khi ẩn/gỡ tin.",
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        if (mode === "remove") {
          await tx.listing.update({
            where: { id: listing.id },
            data: { status: "REMOVED" },
          });

          // Tự động từ chối các yêu cầu hẹn PENDING còn lại
          const pendingOrders = listing.orders.filter((o) => o.status === "PENDING");
          if (pendingOrders.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: pendingOrders.map((o) => o.id) } },
              data: { status: "REJECTED" },
            });
          }

          await tx.notification.create({
            data: {
              userId: listing.sellerId,
              type: "LISTING_REMOVED",
              title: "Tin đăng đã bị gỡ bỏ",
              message: `Tin đăng "${listing.title}" đã bị Quản trị viên gỡ bỏ do: ${reason}`,
              payload: JSON.stringify({ listingId: listing.id, reason }),
            },
          });
        } else if (mode === "hide") {
          await tx.listing.update({
            where: { id: listing.id },
            data: { status: "HIDDEN" },
          });

          await tx.notification.create({
            data: {
              userId: listing.sellerId,
              type: "LISTING_HIDDEN",
              title: "Tin đăng đã tạm ẩn",
              message: `Tin đăng "${listing.title}" đã được tạm ẩn bởi Quản trị viên: ${reason}`,
              payload: JSON.stringify({ listingId: listing.id, reason }),
            },
          });
        } else if (mode === "restore") {
          // Gia hạn 30 ngày nếu tin đã quá hạn
          const newExpiresAt =
            listing.expiresAt < now ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : listing.expiresAt;

          await tx.listing.update({
            where: { id: listing.id },
            data: { status: "AVAILABLE", expiresAt: newExpiresAt },
          });

          await tx.notification.create({
            data: {
              userId: listing.sellerId,
              type: "LISTING_RESTORED",
              title: "Tin đăng đã được mở lại",
              message: `Tin đăng "${listing.title}" đã được Quản trị viên duyệt và hiển thị lại trên sàn.`,
              payload: JSON.stringify({ listingId: listing.id }),
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message:
          mode === "remove"
            ? "Đã gỡ bỏ tin đăng và gửi thông báo đến người bán."
            : mode === "hide"
            ? "Đã tạm ẩn tin đăng."
            : "Đã mở lại tin đăng thành công.",
      });
    }

    // ------------------------------------------------------------------
    // 2. KHÓA / KÍCH HOẠT TÀI KHOẢN NGƯỜI DÙNG
    // ------------------------------------------------------------------
    if (action === "toggle_user_status") {
      const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
      const nextStatus = typeof body.nextStatus === "string" ? body.nextStatus.trim() : "";
      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "Vi phạm quy định sử dụng hoặc gian lận giao dịch.";

      if (!targetUserId || !["ACTIVE", "SUSPENDED"].includes(nextStatus)) {
        return NextResponse.json(
          { error: "Thiếu mã tài khoản hoặc trạng thái cập nhật không hợp lệ." },
          { status: 400 }
        );
      }

      if (targetUserId === actorAdminId) {
        return NextResponse.json(
          { error: "Bạn không thể tự khóa tài khoản Quản trị viên của chính mình." },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, displayName: true, email: true, role: true, status: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
      }

      if (targetUser.role === "ADMIN") {
        return NextResponse.json(
          { error: "Không thể thay đổi trạng thái của tài khoản Quản trị viên khác." },
          { status: 403 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: targetUser.id },
          data: { status: nextStatus as "ACTIVE" | "SUSPENDED" },
        });

        if (nextStatus === "SUSPENDED") {
          // Tự động tạm ẩn tất cả tin đang mở bán của người dùng bị khóa
          await tx.listing.updateMany({
            where: { sellerId: targetUser.id, status: "AVAILABLE" },
            data: { status: "HIDDEN" },
          });

          await tx.notification.create({
            data: {
              userId: targetUser.id,
              type: "ACCOUNT_SUSPENDED",
              title: "Tài khoản của bạn đã bị tạm khóa",
              message: `Tài khoản đã bị tạm dừng hoạt động do: ${reason}. Các tin đăng đang mở bán đã được tạm ẩn.`,
              payload: JSON.stringify({ reason }),
            },
          });
        } else {
          await tx.notification.create({
            data: {
              userId: targetUser.id,
              type: "ACCOUNT_ACTIVATED",
              title: "Tài khoản đã được kích hoạt lại",
              message: "Tài khoản của bạn đã được Quản trị viên kích hoạt lại và có thể tiếp tục giao dịch.",
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message:
          nextStatus === "SUSPENDED"
            ? `Đã tạm khóa tài khoản ${targetUser.displayName} và tự động ẩn các tin đang đăng.`
            : `Đã kích hoạt lại tài khoản ${targetUser.displayName}.`,
      });
    }

    // ------------------------------------------------------------------
    // 3. DUYỆT / HỦY DUYỆT THẺ SINH VIÊN THỦ CÔNG
    // ------------------------------------------------------------------
    if (action === "toggle_student_verified") {
      const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
      const verified = body.verified === true;

      if (!targetUserId) {
        return NextResponse.json({ error: "Thiếu mã tài khoản sinh viên." }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, displayName: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
      }

      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          isStudentVerified: verified,
          studentVerifiedAt: verified ? now : null,
        },
      });

      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: verified ? "STUDENT_VERIFIED" : "STUDENT_VERIFICATION_REVOKED",
          title: verified ? "Xác minh sinh viên thành công" : "Hủy huy hiệu sinh viên xác minh",
          message: verified
            ? "Tài khoản của bạn đã được gắn huy hiệu Sinh viên đã xác minh."
            : "Huy hiệu Sinh viên đã xác minh của bạn đã bị thu hồi bởi Quản trị viên.",
        },
      });

      return NextResponse.json({
        success: true,
        message: verified
          ? `Đã xác nhận huy hiệu sinh viên cho ${targetUser.displayName}.`
          : `Đã thu hồi huy hiệu sinh viên của ${targetUser.displayName}.`,
      });
    }

    // ------------------------------------------------------------------
    // 4. PHÂN XỬ ĐƠN TRANH CHẤP (SLA 72H)
    // ------------------------------------------------------------------
    if (action === "resolve_dispute") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const conclusion = typeof body.conclusion === "string" ? body.conclusion : "";
      const resolutionNote =
        typeof body.resolutionNote === "string" ? body.resolutionNote.trim() : "";

      if (
        !orderId ||
        !["BUYER_RECEIVED", "NOT_DELIVERED", "INSUFFICIENT_EVIDENCE"].includes(conclusion)
      ) {
        return NextResponse.json(
          { error: "Thiếu mã đơn hàng hoặc kết luận phân xử không hợp lệ." },
          { status: 400 }
        );
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          listing: {
            include: { item: true },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
      }

      if (order.status !== "DISPUTED") {
        return NextResponse.json(
          { error: `Đơn hàng không ở trạng thái tranh chấp (Hiện tại: ${order.status}).` },
          { status: 400 }
        );
      }

      if (conclusion === "BUYER_RECEIVED") {
        const finalNote =
          resolutionNote ||
          "Quản trị viên kết luận: Người mua đã nhận hàng (hoàn tất đơn và chuyển giao Hộ chiếu món đồ).";

        const result = await prisma.$transaction(async (tx) => {
          return executeOrderCompletionAndPassportTransfer(tx, order.id, "COMPLETED", {
            resolvedBy: actorAdminId,
            resolvedAt: now,
            resolutionNote: finalNote,
            buyerConfirmedAt: order.buyerConfirmedAt || now,
            sellerConfirmedAt: order.sellerConfirmedAt || now,
          });
        });

        // Bổ sung thông báo kết luận phân xử
        await prisma.notification.createMany({
          data: [
            {
              userId: order.buyerId,
              type: "DISPUTE_RESOLVED",
              title: "Quản trị viên đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
            {
              userId: order.sellerId,
              type: "DISPUTE_RESOLVED",
              title: "Quản trị viên đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
          ],
        });

        // Đồng bộ Relayer lên blockchain nếu có Passport
        if (order.listing.itemId && result.passportId) {
          await processItemChainQueue(order.listing.itemId).catch((err) =>
            console.warn("⚠️ Relayer gặp sự cố sau khi phân xử:", err)
          );
        }

        return NextResponse.json({
          success: true,
          message:
            "Đã phân xử thành công: Đơn hàng hoàn tất và Hộ chiếu đã được chuyển giao cho người mua.",
        });
      }

      // Kết luận NOT_DELIVERED hoặc INSUFFICIENT_EVIDENCE -> CANCELLED & nhả Listing về AVAILABLE
      const defaultNote =
        conclusion === "NOT_DELIVERED"
          ? "Quản trị viên kết luận: Chưa giao nhận hàng hoặc đồ vật không đúng mô tả."
          : "Quản trị viên kết luận: Không đủ căn cứ xác minh bàn giao, hủy đơn và mở lại tin đăng.";
      const finalNote = resolutionNote || defaultNote;

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            resolvedBy: actorAdminId,
            resolvedAt: now,
            resolutionNote: finalNote,
          },
        });

        if (
          order.listing.status === "RESERVED" &&
          order.listing.item?.passportStatus !== "FLAGGED"
        ) {
          await tx.listing.update({
            where: { id: order.listingId },
            data: { status: "AVAILABLE" },
          });
        }

        await tx.notification.createMany({
          data: [
            {
              userId: order.buyerId,
              type: "DISPUTE_RESOLVED",
              title: "Quản trị viên đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
            {
              userId: order.sellerId,
              type: "DISPUTE_RESOLVED",
              title: "Quản trị viên đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
          ],
        });
      });

      return NextResponse.json({
        success: true,
        message: "Đã đóng tranh chấp: Đơn đã hủy và tin đăng được mở lại trên sàn.",
      });
    }

    // ------------------------------------------------------------------
    // 5. GẮN CỜ HỘ CHIẾU MÓN ĐỒ (FLAG)
    // ------------------------------------------------------------------
    if (action === "flag_passport") {
      const itemId = typeof body.itemId === "string" ? body.itemId : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      if (!itemId || reason.length < 5) {
        return NextResponse.json(
          { error: "Vui lòng chọn Hộ chiếu món đồ và nhập lý do gắn cờ (ít nhất 5 ký tự)." },
          { status: 400 }
        );
      }

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          owners: { orderBy: { seq: "desc" }, take: 1 },
          events: { orderBy: { seq: "desc" }, take: 1 },
          listings: { select: { id: true, title: true, status: true } },
        },
      });

      if (!item) {
        return NextResponse.json({ error: "Không tìm thấy Hộ chiếu món đồ." }, { status: 404 });
      }

      if (item.passportStatus === "FLAGGED") {
        return NextResponse.json(
          { error: "Hộ chiếu này hiện đang bị gắn cờ cảnh báo rồi." },
          { status: 400 }
        );
      }

      const listingIds = item.listings.map((l) => l.id);

      await prisma.$transaction(async (tx) => {
        // (a) Gắn cờ Item
        await tx.item.update({
          where: { id: item.id },
          data: {
            passportStatus: "FLAGGED",
            flagReason: reason,
            flaggedAt: now,
          },
        });

        // (b) Tin đăng liên quan chuyển HIDDEN
        if (listingIds.length > 0) {
          await tx.listing.updateMany({
            where: {
              id: { in: listingIds },
              status: { in: ["AVAILABLE", "RESERVED"] },
            },
            data: { status: "HIDDEN" },
          });

          // (c1) Đơn PENDING tự động REJECTED
          const pendingOrders = await tx.order.findMany({
            where: { listingId: { in: listingIds }, status: "PENDING" },
            select: { id: true, buyerId: true },
          });

          if (pendingOrders.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: pendingOrders.map((o) => o.id) } },
              data: { status: "REJECTED" },
            });

            await tx.notification.createMany({
              data: pendingOrders.map((o) => ({
                userId: o.buyerId,
                type: "PASSPORT_FLAGGED",
                title: "Yêu cầu hẹn đã bị hủy tự động",
                message: `Món đồ bạn đặt hẹn tạm dừng do Hộ chiếu đang được kiểm tra nghi vấn vi phạm (${reason}).`,
                payload: JSON.stringify({ itemId: item.id, orderId: o.id }),
              })),
            });
          }

          // (c2) Đơn ACCEPTED / WAITING_CONFIRMATION chuyển DISPUTED
          const activeOrders = await tx.order.findMany({
            where: {
              listingId: { in: listingIds },
              status: { in: ["ACCEPTED", "WAITING_CONFIRMATION"] },
            },
            select: { id: true, buyerId: true, sellerId: true },
          });

          if (activeOrders.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: activeOrders.map((o) => o.id) } },
              data: {
                status: "DISPUTED",
                disputeReason: `Tạm dừng do Hộ chiếu món đồ bị gắn cờ cảnh báo: ${reason}`,
                disputedAt: now,
              },
            });

            for (const o of activeOrders) {
              await tx.notification.createMany({
                data: [
                  {
                    userId: o.buyerId,
                    type: "PASSPORT_FLAGGED",
                    title: "Cuộc hẹn tạm dừng để kiểm tra",
                    message: `Cuộc hẹn của bạn đã chuyển sang trạng thái chờ xem xét do Hộ chiếu món đồ bị gắn cờ (${reason}).`,
                    payload: JSON.stringify({ itemId: item.id, orderId: o.id }),
                  },
                  {
                    userId: o.sellerId,
                    type: "PASSPORT_FLAGGED",
                    title: "Cuộc hẹn tạm dừng để kiểm tra",
                    message: `Cuộc hẹn đã chuyển sang trạng thái chờ xem xét do Hộ chiếu món đồ bị gắn cờ (${reason}).`,
                    payload: JSON.stringify({ itemId: item.id, orderId: o.id }),
                  },
                ],
              });
            }
          }
        }

        // (d) Thông báo chủ sở hữu hiện tại
        if (item.currentOwnerId) {
          await tx.notification.create({
            data: {
              userId: item.currentOwnerId,
              type: "PASSPORT_FLAGGED",
              title: "Cảnh báo: Hộ chiếu món đồ bị gắn cờ",
              message: `Hộ chiếu món đồ của bạn tạm thời bị khóa do: ${reason}. Các tin đăng liên quan đã được tạm ẩn để xác minh.`,
              payload: JSON.stringify({ itemId: item.id, passportId: item.passportId }),
            },
          });
        }

        // (e) Ghi PassportEvent & xếp hàng ChainTx
        const nextSeq = (item.events[0]?.seq || 0) + 1;
        await tx.passportEvent.create({
          data: {
            itemId: item.id,
            seq: nextSeq,
            eventType: "FLAGGED",
            fromOwnerHash: item.owners[0]?.ownerHash || null,
            actorAdminId,
            reason,
            occurredAt: now,
          },
        });

        const payloadHash =
          "0x" +
          crypto
            .createHash("sha256")
            .update(`FLAG:${item.id}:${nextSeq}:${now.getTime()}`)
            .digest("hex");

        await tx.chainTx.create({
          data: {
            itemId: item.id,
            kind: "FLAG",
            payloadHash,
            status: "QUEUED",
          },
        });
      });

      // Kích hoạt Relayer ghi nhận lên sổ cái blockchain
      await processItemChainQueue(item.id).catch((err) =>
        console.warn("⚠️ Relayer gặp lỗi khi ghi sự kiện FLAG:", err)
      );

      return NextResponse.json({
        success: true,
        message: "Đã gắn cờ cảnh báo Hộ chiếu, tạm ẩn tin liên quan và ghi nhận nhật ký.",
      });
    }

    // ------------------------------------------------------------------
    // 6. GỠ CỜ HỘ CHIẾU MÓN ĐỒ (UNFLAG)
    // ------------------------------------------------------------------
    if (action === "unflag_passport") {
      const itemId = typeof body.itemId === "string" ? body.itemId : "";
      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "Đã hoàn tất xác minh hợp lệ, gỡ cờ cảnh báo.";

      if (!itemId) {
        return NextResponse.json({ error: "Thiếu mã Hộ chiếu món đồ." }, { status: 400 });
      }

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          owners: { orderBy: { seq: "desc" }, take: 1 },
          events: { orderBy: { seq: "desc" }, take: 1 },
        },
      });

      if (!item) {
        return NextResponse.json({ error: "Không tìm thấy Hộ chiếu món đồ." }, { status: 404 });
      }

      if (item.passportStatus !== "FLAGGED") {
        return NextResponse.json(
          { error: "Hộ chiếu này hiện không ở trạng thái bị gắn cờ." },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.item.update({
          where: { id: item.id },
          data: {
            passportStatus: "ACTIVE",
            flagReason: null,
            flaggedAt: null,
          },
        });

        // Khôi phục các tin đăng HIDDEN nếu còn hạn
        await tx.listing.updateMany({
          where: {
            itemId: item.id,
            status: "HIDDEN",
            expiresAt: { gt: now },
          },
          data: { status: "AVAILABLE" },
        });

        const nextSeq = (item.events[0]?.seq || 0) + 1;
        await tx.passportEvent.create({
          data: {
            itemId: item.id,
            seq: nextSeq,
            eventType: "UNFLAGGED",
            toOwnerHash: item.owners[0]?.ownerHash || null,
            actorAdminId,
            reason,
            occurredAt: now,
          },
        });

        const payloadHash =
          "0x" +
          crypto
            .createHash("sha256")
            .update(`UNFLAG:${item.id}:${nextSeq}:${now.getTime()}`)
            .digest("hex");

        await tx.chainTx.create({
          data: {
            itemId: item.id,
            kind: "UNFLAG",
            payloadHash,
            status: "QUEUED",
          },
        });

        if (item.currentOwnerId) {
          await tx.notification.create({
            data: {
              userId: item.currentOwnerId,
              type: "PASSPORT_UNFLAGGED",
              title: "Hộ chiếu món đồ đã được gỡ cờ",
              message: `Hộ chiếu món đồ của bạn đã được gỡ cờ cảnh báo và kích hoạt lại bình thường (${reason}).`,
              payload: JSON.stringify({ itemId: item.id, passportId: item.passportId }),
            },
          });
        }
      });

      await processItemChainQueue(item.id).catch((err) =>
        console.warn("⚠️ Relayer gặp lỗi khi ghi sự kiện UNFLAG:", err)
      );

      return NextResponse.json({
        success: true,
        message: "Đã gỡ cờ Hộ chiếu, khôi phục tin đăng hợp lệ thành công.",
      });
    }

    // ------------------------------------------------------------------
    // 7. DUYỆT BÁO CÁO VI PHẠM
    // ------------------------------------------------------------------
    if (action === "handle_report") {
      const reportId = typeof body.reportId === "string" ? body.reportId : "";
      const decision = body.decision === "DISMISSED" ? "DISMISSED" : "RESOLVED";
      const removeListing = body.removeListing === true;

      if (!reportId) {
        return NextResponse.json({ error: "Thiếu mã báo cáo." }, { status: 400 });
      }

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        return NextResponse.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.report.update({
          where: { id: report.id },
          data: {
            status: decision,
            handledBy: actorAdminId,
          },
        });

        if (decision === "RESOLVED" && removeListing && report.targetType === "LISTING") {
          const updatedListing = await tx.listing.update({
            where: { id: report.targetId },
            data: { status: "REMOVED" },
            select: { sellerId: true, title: true },
          });

          await tx.notification.create({
            data: {
              userId: updatedListing.sellerId,
              type: "LISTING_REMOVED",
              title: "Tin đăng bị gỡ do vi phạm",
              message: `Tin đăng "${updatedListing.title}" đã bị Ban Quản Trị gỡ bỏ sau khi xem xét báo cáo vi phạm tiêu chuẩn cộng đồng.`,
              payload: JSON.stringify({ listingId: report.targetId }),
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message:
          decision === "RESOLVED"
            ? removeListing
              ? "Đã gỡ bỏ tin đăng vi phạm và đóng báo cáo."
              : "Đã đánh dấu báo cáo đã xử lý."
            : "Đã bác bỏ báo cáo vi phạm.",
      });
    }

    // ------------------------------------------------------------------
    // 8. DUYỆT THẺ SINH VIÊN (BẢO VỆ DỮ LIỆU CÁ NHÂN: TỰ ĐỘNG XÓA ẢNH THẺ)
    // ------------------------------------------------------------------
    if (action === "verify_student_card") {
      const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
      const approve = body.approve === true;

      if (!targetUserId) {
        return NextResponse.json({ error: "Thiếu mã tài khoản cần xét duyệt." }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, displayName: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Không tìm thấy tài khoản sinh viên." }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: targetUser.id },
          data: {
            isStudentVerified: approve,
            studentVerifiedAt: approve ? now : null,
            // Bảo vệ quyền riêng tư cá nhân: Tự động xóa ảnh thẻ ngay sau khi duyệt/từ chối
            studentCardUrl: null,
          },
        });

        await tx.notification.create({
          data: {
            userId: targetUser.id,
            type: approve ? "STUDENT_VERIFIED" : "STUDENT_CARD_REJECTED",
            title: approve
              ? "Thẻ sinh viên đã được phê duyệt"
              : "Hồ sơ xác minh thẻ sinh viên chưa được duyệt",
            message: approve
              ? "Ban Quản Trị đã phê duyệt thẻ sinh viên và cấp huy hiệu 'Sinh viên đã xác minh'. Ảnh thẻ của bạn đã được xóa tự động để bảo mật thông tin."
              : "Ảnh thẻ sinh viên gửi lên chưa rõ nét hoặc thông tin chưa trùng khớp. Ảnh cũ đã được xóa vì lý do bảo mật, bạn có thể chụp lại ảnh mới tại trang Cá nhân.",
            payload: JSON.stringify({ approve }),
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: approve
          ? `Đã phê duyệt sinh viên ${targetUser.displayName} và tự động xóa ảnh thẻ an toàn.`
          : `Đã từ chối hồ sơ thẻ của ${targetUser.displayName} và xóa ảnh thẻ an toàn.`,
      });
    }

    // ------------------------------------------------------------------
    // 9. THỬ LẠI ĐỒNG BỘ RELAYER
    // ------------------------------------------------------------------
    if (action === "retry_chain_tx") {
      const itemId = typeof body.itemId === "string" ? body.itemId : "";
      if (!itemId) {
        return NextResponse.json({ error: "Thiếu mã món đồ cần đồng bộ." }, { status: 400 });
      }

      await prisma.chainTx.updateMany({
        where: {
          itemId,
          status: { in: ["QUEUED", "FAILED", "NEEDS_ATTENTION"] },
        },
        data: {
          status: "QUEUED",
          attempts: 0,
          lastError: null,
        },
      });

      const syncResult = await processItemChainQueue(itemId);
      return NextResponse.json({
        success: true,
        syncResult,
        message: `Đã xử lý hàng đợi đồng bộ (${syncResult.confirmedCount} giao dịch đã xác nhận).`,
      });
    }

    return NextResponse.json({ error: "Hành động quản trị không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("Lỗi POST /api/admin:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi thực thi thao tác quản trị." },
      { status: 500 }
    );
  }
}
