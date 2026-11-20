import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  calculateAndSyncReputationScore,
  reconcileBlindReviews48h,
} from "@/lib/utils/reputation";

/**
 * GET /api/reviews
 * Lấy danh sách đánh giá theo orderId hoặc userId
 * Tuân thủ quy tắc BR14: Ẩn nội dung nhận xét của đối tác nếu đang trong cửa sổ Blind Review (chưa nộp hoặc chưa quá 48h)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const userId = searchParams.get("userId");

    const currentUser = await getSessionUser();

    // 1. Nếu lấy theo orderId
    if (orderId) {
      // Dọn dẹp các review đã quá 48h chưa mở khóa (BR14)
      await reconcileBlindReviews48h(orderId);

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          reviews: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                  reputationScore: true,
                  isStudentVerified: true,
                },
              },
              reviewee: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                  reputationScore: true,
                  isStudentVerified: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Không tìm thấy đơn hàng." },
          { status: 404 }
        );
      }

      // Xử lý bảo mật Blind Review BR14
      const sanitizedReviews = order.reviews.map((rev) => {
        const isPublic = Boolean(rev.visibleAt);
        const isAuthor = currentUser ? rev.reviewerId === currentUser.id : false;

        // Nếu review đã công khai hoặc người xem chính là tác giả đã viết
        if (isPublic || isAuthor) {
          return {
            id: rev.id,
            orderId: rev.orderId,
            reviewerId: rev.reviewerId,
            revieweeId: rev.revieweeId,
            rating: rev.rating,
            comment: rev.comment,
            tags: rev.tags ? JSON.parse(rev.tags) : [],
            submittedAt: rev.submittedAt,
            visibleAt: rev.visibleAt,
            isBlindHidden: false,
            isPendingPartner: !isPublic,
            reviewer: rev.reviewer,
            reviewee: rev.reviewee,
          };
        }

        // Trường hợp đối tác xem mà chưa đủ điều kiện mở khóa (Blind Review BR14)
        return {
          id: rev.id,
          orderId: rev.orderId,
          reviewerId: rev.reviewerId,
          revieweeId: rev.revieweeId,
          rating: 0,
          comment: "",
          tags: [],
          submittedAt: rev.submittedAt,
          visibleAt: null,
          isBlindHidden: true,
          isPendingPartner: true,
          reviewer: {
            id: rev.reviewer.id,
            displayName: "Đối tác giao dịch",
            avatarUrl: rev.reviewer.avatarUrl,
            reputationScore: rev.reviewer.reputationScore,
            isStudentVerified: rev.reviewer.isStudentVerified,
          },
          reviewee: rev.reviewee,
        };
      });

      return NextResponse.json({
        orderId,
        reviews: sanitizedReviews,
        hasReviewedSelf: currentUser
          ? order.reviews.some((r) => r.reviewerId === currentUser.id)
          : false,
      });
    }

    // 2. Nếu lấy danh sách đánh giá công khai của một userId (cho trang profile / sản phẩm)
    if (userId) {
      await reconcileBlindReviews48h();

      const reviews = await prisma.review.findMany({
        where: {
          revieweeId: userId,
          visibleAt: {
            not: null,
          },
        },
        include: {
          reviewer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              reputationScore: true,
              isStudentVerified: true,
            },
          },
          order: {
            select: {
              id: true,
              listing: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
        take: 20,
      });

      return NextResponse.json({
        userId,
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          tags: r.tags ? JSON.parse(r.tags) : [],
          submittedAt: r.submittedAt,
          reviewer: r.reviewer,
          listingTitle: r.order.listing.title,
        })),
      });
    }

    return NextResponse.json(
      { error: "Vui lòng cung cấp orderId hoặc userId." },
      { status: 400 }
    );
  } catch (error) {
    console.error("⚠️ Lỗi GET /api/reviews:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách đánh giá." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Gửi đánh giá bí mật 1 lần/đơn hàng cho đơn đã COMPLETED hoặc AUTO_COMPLETED
 * Tuân thủ quy tắc BR08, BR09, BR14, BR23, BR35
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để gửi đánh giá." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, rating, comment, tags } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Mã đơn hàng không hợp lệ." },
        { status: 400 }
      );
    }

    // Validate rating 1 - 5 sao
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Số sao đánh giá phải từ 1 đến 5 sao." },
        { status: 400 }
      );
    }

    // Validate comment
    if (!comment || typeof comment !== "string" || comment.trim().length < 3) {
      return NextResponse.json(
        { error: "Vui lòng nhập nhận xét ít nhất 3 ký tự." },
        { status: 400 }
      );
    }

    if (comment.trim().length > 500) {
      return NextResponse.json(
        { error: "Nhận xét tối đa 500 ký tự." },
        { status: 400 }
      );
    }

    // Validate tags
    let validTags: string[] = [];
    if (Array.isArray(tags)) {
      validTags = tags.filter((t) => typeof t === "string" && t.trim().length > 0).slice(0, 5);
    }

    // Tìm đơn hàng và kiểm tra trạng thái
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 }
      );
    }

    // Quy tắc BR08: Chỉ đánh giá khi đơn đã hoàn tất
    if (!["COMPLETED", "AUTO_COMPLETED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Chỉ có thể đánh giá khi đơn hàng đã hoàn tất trao tay." },
        { status: 400 }
      );
    }

    // Kiểm tra quyền hạn của người gửi
    const isBuyer = order.buyerId === currentUser.id;
    const isSeller = order.sellerId === currentUser.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: "Bạn không có quyền đánh giá đơn hàng này." },
        { status: 403 }
      );
    }

    const reviewerId = currentUser.id;
    const revieweeId = isBuyer ? order.sellerId : order.buyerId;

    // Quy tắc BR08 & BR09: Mỗi bên chỉ được đánh giá 1 lần duy nhất
    const existingReview = await prisma.review.findUnique({
      where: {
        orderId_reviewerId: {
          orderId,
          reviewerId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "Bạn đã gửi đánh giá cho đơn hàng này rồi (mỗi bên chỉ đánh giá 1 lần)." },
        { status: 400 }
      );
    }

    // Kiểm tra xem đối tác đã nộp review chưa (Cơ chế Blind Review BR14)
    const partnerReview = await prisma.review.findUnique({
      where: {
        orderId_reviewerId: {
          orderId,
          reviewerId: revieweeId,
        },
      },
    });

    const tagsJson = JSON.stringify(validTags);

    // TRƯỜNG HỢP 1: Cả hai bên cùng nộp -> Mở khóa ngay lập tức (BR14)
    if (partnerReview) {
      const now = new Date();

      const [newReview] = await prisma.$transaction([
        prisma.review.create({
          data: {
            orderId,
            reviewerId,
            revieweeId,
            rating: numRating,
            comment: comment.trim(),
            tags: tagsJson,
            visibleAt: now,
          },
        }),
        prisma.review.update({
          where: { id: partnerReview.id },
          data: { visibleAt: now },
        }),
        prisma.notification.create({
          data: {
            userId: revieweeId,
            type: "REVIEW_MUTUAL_UNLOCKED",
            title: "Đánh giá hai chiều đã mở khóa",
            message: `Đối tác đã hoàn tất đánh giá cho đơn "${order.listing.title}". Cả hai nhận xét hiện đã được mở khóa công khai!`,
            payload: JSON.stringify({ orderId, listingId: order.listing.id }),
          },
        }),
      ]);

      // Tính lại điểm uy tín sinh viên cho cả hai bên (BR23, BR35)
      await calculateAndSyncReputationScore(revieweeId);
      await calculateAndSyncReputationScore(reviewerId);

      return NextResponse.json(
        {
          success: true,
          isUnlocked: true,
          message: "Đánh giá thành công! Cả hai bên đã gửi đánh giá nên nhận xét đã được mở khóa công khai.",
          review: newReview,
        },
        { status: 201 }
      );
    }

    // TRƯỜNG HỢP 2: Người đầu tiên nộp -> Lưu bí mật visibleAt = null (BR14)
    const [newReview] = await prisma.$transaction([
      prisma.review.create({
        data: {
          orderId,
          reviewerId,
          revieweeId,
          rating: numRating,
          comment: comment.trim(),
          tags: tagsJson,
          visibleAt: null,
        },
      }),
      prisma.notification.create({
        data: {
          userId: revieweeId,
          type: "REVIEW_PENDING_PARTNER",
          title: "Bạn có đánh giá mới đang chờ mở khóa",
          message: `Đối tác đã gửi đánh giá bí mật cho đơn "${order.listing.title}". Hãy gửi đánh giá của bạn để cùng mở khóa xem nhận xét nhé!`,
          payload: JSON.stringify({ orderId, listingId: order.listing.id }),
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        isUnlocked: false,
        message: "Đã ghi nhận đánh giá bí mật của bạn. Đánh giá sẽ được mở khóa khi đối tác nộp đánh giá đối ứng hoặc tự động sau 48h.",
        review: newReview,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("⚠️ Lỗi POST /api/reviews:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi gửi đánh giá." },
      { status: 500 }
    );
  }
}

