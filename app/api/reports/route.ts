import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const ALLOWED_TARGET_TYPES = ["LISTING", "USER", "PASSPORT"] as const;

/**
 * POST /api/reports
 * Gửi báo cáo vi phạm cho Tin đăng (BR17), Người dùng hoặc Passport nghi vấn (BR32)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để gửi báo cáo vi phạm." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const targetType = typeof body.targetType === "string" ? body.targetType.trim().toUpperCase() : "";
    const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!ALLOWED_TARGET_TYPES.includes(targetType as (typeof ALLOWED_TARGET_TYPES)[number])) {
      return NextResponse.json(
        { error: "Loại đối tượng báo cáo không hợp lệ (LISTING, USER, PASSPORT)." },
        { status: 400 }
      );
    }

    if (!targetId) {
      return NextResponse.json(
        { error: "Thiếu mã định danh đối tượng cần báo cáo." },
        { status: 400 }
      );
    }

    if (reason.length < 10 || reason.length > 1000) {
      return NextResponse.json(
        { error: "Vui lòng mô tả rõ lý do báo cáo (từ 10 đến 1000 ký tự)." },
        { status: 400 }
      );
    }

    try {
      // Kiểm tra reporter tồn tại trong DB
      const dbReporter = await prisma.user.findFirst({
        where: {
          OR: [{ id: user.id }, { email: user.email }],
        },
        select: { id: true },
      });

      if (!dbReporter) {
        return NextResponse.json(
          { error: "Không tìm thấy tài khoản người báo cáo trong hệ thống." },
          { status: 400 }
        );
      }

      // Kiểm tra báo cáo trùng lặp đang chờ xử lý
      const existingPending = await prisma.report.findFirst({
        where: {
          reporterId: dbReporter.id,
          targetType: targetType as "LISTING" | "USER" | "PASSPORT",
          targetId,
          status: "PENDING",
        },
      });

      if (existingPending) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          report: existingPending,
          message:
            "Bạn đã gửi báo cáo cho nội dung này trước đó. Ban Quản Trị đang xem xét xử lý.",
        });
      }

      const report = await prisma.report.create({
        data: {
          reporterId: dbReporter.id,
          targetType: targetType as "LISTING" | "USER" | "PASSPORT",
          targetId,
          reason,
          status: "PENDING",
        },
      });

      return NextResponse.json(
        {
          success: true,
          report,
          message:
            "Đã gửi báo cáo vi phạm thành công! Ban Quản Trị sẽ kiểm tra và xử lý trong thời gian sớm nhất.",
        },
        { status: 201 }
      );
    } catch (dbErr) {
      console.error("⚠️ Lỗi DB khi tạo báo cáo /api/reports:", dbErr);
      return NextResponse.json(
        { error: "Không thể lưu báo cáo vào hệ thống lúc này. Vui lòng thử lại." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Lỗi POST /api/reports:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi gửi báo cáo vi phạm." },
      { status: 500 }
    );
  }
}
