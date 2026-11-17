import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/my-items/[id]
 * Cập nhật tùy chọn hiển thị tên trên lịch sử Passport của món đồ (BR29)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập." },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const itemId = resolvedParams.id;

    const body = await request.json();
    const { showName } = body;

    if (typeof showName !== "boolean") {
      return NextResponse.json(
        { error: "Trường showName phải có giá trị boolean (true/false)." },
        { status: 400 }
      );
    }

    // Kiểm tra quyền sở hữu món đồ
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        owners: {
          where: { userId: user.id },
          orderBy: { seq: "desc" },
          take: 1,
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Không tìm thấy món đồ." },
        { status: 404 }
      );
    }

    const myOwnerRecord = item.owners[0];
    if (!myOwnerRecord || item.currentOwnerId !== user.id) {
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa tùy chọn món đồ này (BR25)." },
        { status: 403 }
      );
    }

    // Cập nhật showName cho bản ghi PassportOwner của người dùng (BR29)
    await prisma.passportOwner.update({
      where: { id: myOwnerRecord.id },
      data: {
        showName: Boolean(showName),
      },
    });

    return NextResponse.json({
      success: true,
      message: showName
        ? "Đã bật hiển thị tên của bạn trên lịch sử Digital Product Passport (BR29)."
        : "Đã chuyển sang chế độ ẩn danh trên Digital Product Passport (BR29).",
      showName: Boolean(showName),
    });
  } catch (error) {
    console.error("⚠️ Lỗi PATCH /api/my-items/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật tùy chọn hiển thị." },
      { status: 500 }
    );
  }
}

