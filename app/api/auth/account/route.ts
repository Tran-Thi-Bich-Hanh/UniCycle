import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth";

/**
 * DELETE /api/auth/account
 * Xóa tài khoản theo cơ chế Crypto-shredding (BR34 & Nghị định 13/2023/NĐ-CP):
 * 1. Đặt PassportOwner.userId = NULL và showName = false (giữ nguyên ownerHash, seq, since để bảo toàn lịch sử DB & Fuji)
 * 2. Đóng băng các Item đang sở hữu (currentOwnerId = NULL, passportStatus = ARCHIVED_OWNER_DELETED)
 * 3. Đóng tin đăng & ẩn danh hóa toàn bộ PII trong bảng User
 */
export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện thao tác này." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const confirmText =
      typeof body?.confirmText === "string" ? body.confirmText.trim().toUpperCase() : "";

    if (confirmText !== "XOA TAI KHOAN") {
      return NextResponse.json(
        {
          error:
            'Vui lòng nhập chính xác cụm từ "XOA TAI KHOAN" để xác nhận xóa vĩnh viễn tài khoản.',
        },
        { status: 400 }
      );
    }

    let summary = {
      shreddedOwnerRecords: 0,
      archivedItemsCount: 0,
    };

    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: sessionUser.id }, { email: sessionUser.email }],
        },
      });

      if (dbUser) {
        if (dbUser.status === "DELETED") {
          const res = NextResponse.json({
            success: true,
            message: "Tài khoản này đã được xóa trước đó.",
          });
          res.cookies.set(SESSION_COOKIE_NAME, "", {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 0,
          });
          return res;
        }

        // Kiểm tra không cho xóa nếu đang có đơn hàng ở trạng thái ràng buộc giao dịch
        const blockingOrdersCount = await prisma.order.count({
          where: {
            OR: [{ buyerId: dbUser.id }, { sellerId: dbUser.id }],
            status: {
              in: ["ACCEPTED", "WAITING_CONFIRMATION", "DISPUTED"],
            },
          },
        });

        if (blockingOrdersCount > 0) {
          return NextResponse.json(
            {
              error: `Bạn hiện có ${blockingOrdersCount} giao dịch đang giữ chỗ, chờ xác nhận 48h hoặc đang khiếu nại. Vui lòng hoàn tất hoặc hủy lịch hẹn trước khi xóa tài khoản.`,
            },
            { status: 400 }
          );
        }

        const anonymizedEmail = `deleted_${crypto.randomBytes(12).toString("hex")}@deleted.unicycle.local`;
        const now = new Date();

        summary = await prisma.$transaction(async (tx) => {
          // 1. Crypto-shredding trên PassportOwner (BR34):
          // Xóa liên kết userId & ẩn tên, nhưng giữ nguyên ownerHash, seq, since
          const shredded = await tx.passportOwner.updateMany({
            where: { userId: dbUser.id },
            data: {
              userId: null,
              showName: false,
            },
          });

          // 2. Đóng băng các món đồ đang sở hữu sang ARCHIVED_OWNER_DELETED (BR34)
          const archived = await tx.item.updateMany({
            where: { currentOwnerId: dbUser.id },
            data: {
              currentOwnerId: null,
              passportStatus: "ARCHIVED_OWNER_DELETED",
            },
          });

          // 3. Gỡ các tin đăng chưa bán & xóa SĐT Zalo khỏi tất cả tin đăng của người dùng
          await tx.listing.updateMany({
            where: {
              sellerId: dbUser.id,
              status: {
                in: ["DRAFT", "AVAILABLE", "RESERVED", "HIDDEN", "EXPIRED"],
              },
            },
            data: {
              status: "REMOVED",
              zaloPhone: "0000000000",
              hidePhone: true,
            },
          });

          await tx.listing.updateMany({
            where: {
              sellerId: dbUser.id,
              status: "SOLD",
            },
            data: {
              zaloPhone: "0000000000",
              hidePhone: true,
            },
          });

          // 4. Hủy các đơn PENDING liên quan
          await tx.order.updateMany({
            where: {
              OR: [{ buyerId: dbUser.id }, { sellerId: dbUser.id }],
              status: "PENDING",
            },
            data: {
              status: "CANCELLED",
            },
          });

          // 5. Dọn thông báo cá nhân
          await tx.notification.deleteMany({
            where: { userId: dbUser.id },
          });

          // 6. Ẩn danh hóa toàn bộ PII trong bảng User
          await tx.user.update({
            where: { id: dbUser.id },
            data: {
              status: "DELETED",
              deletedAt: now,
              displayName: "Cựu sinh viên (Đã xóa tài khoản)",
              email: anonymizedEmail,
              passwordHash: null,
              avatarUrl: null,
              studentCardUrl: null,
              dorm: null,
              schoolId: null,
              isStudentVerified: false,
              studentVerifiedAt: null,
            },
          });

          return {
            shreddedOwnerRecords: shredded.count,
            archivedItemsCount: archived.count,
          };
        });
      }
    } catch (dbErr) {
      console.error("⚠️ Lỗi DB khi xóa tài khoản Crypto-shredding:", dbErr);
      return NextResponse.json(
        { error: "Không thể thực hiện xóa tài khoản do lỗi hệ thống. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      summary,
      message:
        "Tài khoản và thông tin định danh cá nhân đã được xóa an toàn theo cơ chế Crypto-shredding (BR34). Lịch sử giao dịch ẩn danh trên Passport vẫn được bảo toàn.",
    });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Lỗi DELETE /api/auth/account:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa tài khoản." },
      { status: 500 }
    );
  }
}
