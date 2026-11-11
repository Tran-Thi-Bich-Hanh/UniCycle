import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import db, { getUserWalletSummary } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const walletSummary = getUserWalletSummary(user.id);
  return NextResponse.json({
    user: {
      ...user,
      point_balance: walletSummary?.availableBalance ?? user.point_balance ?? 0,
      locked_balance: walletSummary?.lockedBalance ?? 0,
      total_balance: walletSummary?.totalBalance ?? user.point_balance ?? 0,
      active_escrow_count: walletSummary?.activeEscrowCount ?? 0,
      incoming_escrow_count: walletSummary?.incomingEscrowCount ?? 0,
    },
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fullName, phone, university, campusLocation, bio, avatarUrl } = body;

    const now = new Date().toISOString();
    const update = db.prepare(`
      UPDATE users
      SET full_name = ?, phone = ?, university = ?, campus_location = ?, bio = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?
    `);

    update.run(
      fullName || user.full_name,
      phone !== undefined ? phone : user.phone,
      university !== undefined ? university : user.university,
      campusLocation !== undefined ? campusLocation : user.campus_location,
      bio !== undefined ? bio : user.bio,
      avatarUrl || user.avatar_url,
      now,
      user.id
    );

    const updatedUser = db.prepare(`
      SELECT id, email, full_name, phone, university, campus_location, avatar_url, bio, wallet_address, point_balance, role, created_at, updated_at
      FROM users WHERE id = ?
    `).get(user.id);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi cập nhật thông tin cá nhân" }, { status: 500 });
  }
}

