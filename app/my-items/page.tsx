import React, { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { loadUnifiedMyItems } from "@/lib/my-items/loader";
import { MyItemsClient } from "@/components/my-items/MyItemsClient";

export const metadata: Metadata = {
  title: "Đồ của tôi | UniCycle",
  description:
    "Quản lý tất cả đồ dùng đang sở hữu, tin đăng bán và mã QR hành trình trên UniCycle.",
};

async function MyItemsContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/my-items");
  }

  let resolvedUserId = user.id;
  try {
    const dbUser = await prisma.user.findFirst({
      where: user.email
        ? { OR: [{ id: user.id }, { email: user.email }] }
        : { id: user.id },
      select: { id: true },
    });
    if (dbUser?.id) {
      resolvedUserId = dbUser.id;
    }
  } catch (err) {
    console.warn("⚠️ Không tra cứu được dbUser trong /my-items:", err);
  }

  const unifiedItems = await loadUnifiedMyItems(resolvedUserId);

  return <MyItemsClient initialItems={unifiedItems} />;
}

export default function MyItemsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-[#02457A]">
            Đang tải danh sách đồ của bạn...
          </p>
        </div>
      }
    >
      <MyItemsContent />
    </Suspense>
  );
}
