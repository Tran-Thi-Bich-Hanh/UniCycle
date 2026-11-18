import React, { Suspense } from "react";
import { Metadata } from "next";
import { PublicUserProfileClient } from "@/components/profile/PublicUserProfileClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export const metadata: Metadata = {
  title: "Hồ Sơ Sinh Viên | UniCycle",
  description:
    "Xem hồ sơ công khai, huy hiệu xác minh sinh viên, điểm uy tín và tin đăng đang bán trên UniCycle.",
};

async function PublicUserProfileContent({ params }: PageProps) {
  const { id } = await params;
  return <PublicUserProfileClient userId={id} />;
}

export default function PublicUserProfilePage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải hồ sơ sinh viên...
            </span>
          </div>
        }
      >
        <PublicUserProfileContent params={params} />
      </Suspense>
    </main>
  );
}
