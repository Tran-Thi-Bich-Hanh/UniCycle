import React, { Suspense } from "react";
import { Metadata } from "next";
import { InviteAcceptClient } from "@/components/invites/InviteAcceptClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = {
  title: "Lời Mời Chốt Bán Zalo | UniCycle Sinh Viên",
  description:
    "Xác nhận chốt mua món đồ từ lời mời Zalo, giữ chỗ độc quyền và nhận Hộ Chiếu Đồ Vật Digital Product Passport.",
};

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải lời mời chốt bán...
            </span>
          </div>
        }
      >
        <InviteAcceptClient code={code} />
      </Suspense>
    </main>
  );
}

