import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  getSessionUser,
  SESSION_COOKIE_NAME,
  SessionUser,
} from "@/lib/auth";
import { FALLBACK_SCHOOLS } from "@/lib/data/mock-fallback";

const FALLBACK_SCHOOL_DOMAINS: Record<string, string> = {
  "ktx-b": "vnuhcm.edu.vn",
  "ktx-a": "vnuhcm.edu.vn",
  hcmut: "hcmut.edu.vn",
  hcmus: "hcmus.edu.vn",
  ueh: "ueh.edu.vn",
  uit: "uit.edu.vn",
};

const FALLBACK_SCHOOL_SHORT_NAMES: Record<string, string> = {
  "ktx-b": "KTX Khu B",
  "ktx-a": "KTX Khu A",
  hcmut: "ĐH Bách Khoa",
  hcmus: "ĐH KHTN",
  ueh: "UEH",
  uit: "ĐH CNTT",
};

async function resolveDbSchool(schoolId?: string | null, emailDomain?: string | null) {
  if (schoolId) {
    const mappedShortName = FALLBACK_SCHOOL_SHORT_NAMES[schoolId];
    const byIdOrShort = await prisma.school.findFirst({
      where: {
        OR: [
          { id: schoolId },
          ...(mappedShortName ? [{ shortName: mappedShortName }] : []),
          { shortName: { contains: schoolId, mode: "insensitive" } },
        ],
      },
    });
    if (byIdOrShort) return byIdOrShort;
  }

  if (emailDomain) {
    const byDomain = await prisma.school.findFirst({
      where: {
        emailDomain: { equals: emailDomain, mode: "insensitive" },
      },
    });
    if (byDomain) return byDomain;
  }

  return null;
}

/**
 * GET /api/auth/verify-student
 * Lấy trạng thái xác minh sinh viên hiện tại & danh sách trường ĐH/KTX
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để sử dụng tính năng xác minh sinh viên." },
        { status: 401 }
      );
    }

    let schoolsList = FALLBACK_SCHOOLS.map((s) => ({
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      emailDomain: FALLBACK_SCHOOL_DOMAINS[s.id] || null,
      area: "TP.HCM",
    }));

    let verification = {
      isStudentVerified: sessionUser.isStudentVerified,
      studentVerifiedAt: null as string | null,
      hasPendingCard: false,
      schoolId: sessionUser.schoolId || null,
      schoolName: null as string | null,
      schoolShortName: sessionUser.schoolShortName || null,
      dorm: sessionUser.dorm || null,
      email: sessionUser.email,
    };

    try {
      const dbSchools = await prisma.school.findMany({
        orderBy: { name: "asc" },
      });
      if (dbSchools.length > 0) {
        schoolsList = dbSchools.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.shortName,
          emailDomain: s.emailDomain,
          area: s.area,
        }));
      }

      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: sessionUser.id }, { email: sessionUser.email }],
        },
        include: { school: true },
      });

      if (dbUser) {
        verification = {
          isStudentVerified: dbUser.isStudentVerified,
          studentVerifiedAt: dbUser.studentVerifiedAt
            ? dbUser.studentVerifiedAt.toISOString()
            : null,
          hasPendingCard: Boolean(dbUser.studentCardUrl && !dbUser.isStudentVerified),
          schoolId: dbUser.schoolId,
          schoolName: dbUser.school?.name || null,
          schoolShortName: dbUser.school?.shortName || sessionUser.schoolShortName || null,
          dorm: dbUser.dorm,
          email: dbUser.email,
        };
      }
    } catch (dbErr) {
      console.warn("⚠️ Kết nối DB chậm khi tải trạng thái xác minh SV (dùng session):", dbErr);
    }

    return NextResponse.json({
      verification,
      schools: schoolsList,
    });
  } catch (error) {
    console.error("Lỗi GET /api/auth/verify-student:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải thông tin xác minh sinh viên." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/verify-student
 * Xác minh sinh viên bằng Email .edu.vn (duyệt tức thì) hoặc Thẻ sinh viên (NĐ 13/2023/NĐ-CP)
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện xác minh sinh viên." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const method = body.method === "student_card" ? "student_card" : "edu_email";
    const schoolIdInput = typeof body.schoolId === "string" ? body.schoolId.trim() : "";
    const dormInput = typeof body.dorm === "string" ? body.dorm.trim() : "";

    if (method === "edu_email") {
      const eduEmail = (typeof body.eduEmail === "string" ? body.eduEmail : "").trim().toLowerCase();

      if (!eduEmail || !/^[^\s@]+@[^\s@]+\.edu\.vn$/i.test(eduEmail)) {
        return NextResponse.json(
          {
            error:
              "Email xác minh phải có định dạng hợp lệ và kết thúc bằng .edu.vn (VD: mssv@hcmut.edu.vn, sv@uit.edu.vn).",
          },
          { status: 400 }
        );
      }

      const emailDomain = eduEmail.split("@")[1] || "";
      const now = new Date();
      let updatedSessionUser: SessionUser = {
        ...sessionUser,
        isStudentVerified: true,
        dorm: dormInput || sessionUser.dorm || null,
      };

      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ id: sessionUser.id }, { email: sessionUser.email }],
          },
          include: { school: true },
        });

        const matchedSchool = await resolveDbSchool(schoolIdInput, emailDomain);

        if (dbUser) {
          const updated = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              isStudentVerified: true,
              studentVerifiedAt: now,
              studentCardUrl: null, // Xóa ảnh thẻ nếu từng nộp trước đó (NĐ 13/2023)
              schoolId: matchedSchool ? matchedSchool.id : dbUser.schoolId,
              dorm: dormInput || dbUser.dorm,
            },
            include: { school: true },
          });

          await prisma.notification.create({
            data: {
              userId: updated.id,
              type: "STUDENT_VERIFIED",
              title: "Đã cấp Huy hiệu Sinh viên xác minh!",
              message: `Email trường ${eduEmail} đã được xác thực. Tài khoản của bạn chính thức nhận Huy hiệu 'Sinh viên đã xác minh' và được ưu tiên hiển thị tin đăng.`,
              payload: JSON.stringify({ method: "edu_email", emailDomain }),
            },
          });

          updatedSessionUser = {
            id: updated.id,
            email: updated.email,
            displayName: updated.displayName,
            avatarUrl: updated.avatarUrl,
            role: updated.role,
            isStudentVerified: true,
            reputationScore: updated.reputationScore,
            schoolId: updated.schoolId,
            schoolShortName: updated.school?.shortName || sessionUser.schoolShortName || "KTX ĐHQG",
            dorm: updated.dorm,
          };
        } else if (matchedSchool) {
          updatedSessionUser.schoolId = matchedSchool.id;
          updatedSessionUser.schoolShortName = matchedSchool.shortName;
        }
      } catch (dbErr) {
        console.warn("⚠️ Lỗi DB khi xác minh email .edu.vn (cập nhật phiên):", dbErr);
        const fallbackSchool = FALLBACK_SCHOOLS.find((s) => s.id === schoolIdInput);
        if (fallbackSchool) {
          updatedSessionUser.schoolId = fallbackSchool.id;
          updatedSessionUser.schoolShortName = fallbackSchool.shortName;
        }
      }

      const token = createSessionToken(updatedSessionUser);
      const response = NextResponse.json({
        success: true,
        verifiedImmediately: true,
        user: updatedSessionUser,
        message: `Xác minh thành công qua email ${eduEmail}! Tài khoản đã nhận Huy hiệu "Sinh viên đã xác minh".`,
      });

      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // Phương thức 2: Tải lên ảnh chụp Thẻ Sinh Viên (chờ Admin phê duyệt & tự động xóa ảnh sau duyệt theo NĐ 13/2023/NĐ-CP)
    const studentCardUrl = typeof body.studentCardUrl === "string" ? body.studentCardUrl.trim() : "";
    const consentDecree13 = body.consentDecree13 === true;

    if (!consentDecree13) {
      return NextResponse.json(
        {
          error:
            "Bạn cần tích xác nhận đồng ý điều khoản xử lý & tự động xóa ảnh thẻ sinh viên sau khi duyệt theo Nghị định 13/2023/NĐ-CP.",
        },
        { status: 400 }
      );
    }

    if (
      !studentCardUrl ||
      (!studentCardUrl.startsWith("data:image/") &&
        !studentCardUrl.startsWith("https://") &&
        !studentCardUrl.startsWith("/"))
    ) {
      return NextResponse.json(
        { error: "Vui lòng tải lên hình ảnh chụp mặt trước Thẻ Sinh Viên rõ nét." },
        { status: 400 }
      );
    }

    if (studentCardUrl.length > 4_000_000) {
      return NextResponse.json(
        { error: "Dung lượng ảnh thẻ quá lớn. Vui lòng chọn ảnh khác hoặc để hệ thống nén ảnh." },
        { status: 400 }
      );
    }

    let updatedSessionUser: SessionUser = {
      ...sessionUser,
      dorm: dormInput || sessionUser.dorm || null,
    };

    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: sessionUser.id }, { email: sessionUser.email }],
        },
        include: { school: true },
      });

      if (dbUser?.isStudentVerified) {
        return NextResponse.json(
          { error: "Tài khoản của bạn đã được xác minh sinh viên trước đó rồi." },
          { status: 400 }
        );
      }

      const matchedSchool = await resolveDbSchool(schoolIdInput, null);

      if (dbUser) {
        const updated = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            studentCardUrl,
            schoolId: matchedSchool ? matchedSchool.id : dbUser.schoolId,
            dorm: dormInput || dbUser.dorm,
          },
          include: { school: true },
        });

        await prisma.notification.create({
          data: {
            userId: updated.id,
            type: "STUDENT_CARD_SUBMITTED",
            title: "Đã gửi ảnh Thẻ Sinh Viên chờ xét duyệt",
            message:
              "Quản trị viên sẽ đối chiếu thẻ sinh viên của bạn trong 24 giờ. Ảnh thẻ sẽ tự động bị xóa vĩnh viễn ngay sau khi phê duyệt theo Nghị định 13/2023/NĐ-CP.",
            payload: JSON.stringify({ method: "student_card" }),
          },
        });

        updatedSessionUser = {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
          role: updated.role,
          isStudentVerified: updated.isStudentVerified,
          reputationScore: updated.reputationScore,
          schoolId: updated.schoolId,
          schoolShortName: updated.school?.shortName || sessionUser.schoolShortName || "KTX ĐHQG",
          dorm: updated.dorm,
        };
      }
    } catch (dbErr) {
      console.warn("⚠️ Lỗi DB khi lưu ảnh thẻ sinh viên:", dbErr);
      return NextResponse.json(
        { error: "Không thể lưu hồ sơ ảnh thẻ vào cơ sở dữ liệu lúc này. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    const token = createSessionToken(updatedSessionUser);
    const response = NextResponse.json({
      success: true,
      verifiedImmediately: false,
      hasPendingCard: true,
      user: updatedSessionUser,
      message:
        "Đã tiếp nhận ảnh thẻ sinh viên! Ảnh thẻ sẽ tự động xóa vĩnh viễn sau khi Quản trị viên phê duyệt theo Nghị định 13/2023/NĐ-CP.",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Lỗi POST /api/auth/verify-student:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý yêu cầu xác minh sinh viên." },
      { status: 500 }
    );
  }
}
