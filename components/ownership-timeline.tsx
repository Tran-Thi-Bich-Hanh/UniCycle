"use client";

import React from "react";
import { OwnershipRecord } from "@/lib/db";
import { IconSchool, IconSparkles, IconUser } from "./icons";

interface OwnershipTimelineProps {
  history?: OwnershipRecord[];
  currentSellerName?: string;
  currentSellerUniversity?: string;
  className?: string;
}

export function OwnershipTimeline({
  history = [],
  currentSellerName,
  currentSellerUniversity,
  className = "",
}: OwnershipTimelineProps) {
  // Nếu chưa có dữ liệu lịch sử riêng trong DB, hiển thị hành trình mặc định từ người bán hiện tại
  const records = history && history.length > 0 ? history : [];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#018ABE]/15 text-[#018ABE]">
              <IconSchool className="w-4 h-4" />
            </span>
            <span>Cây Lịch sử Tuần hoàn Sở hữu (Chain of Ownership)</span>
          </h3>
          <p className="text-xs text-[#02457A] mt-1">
            Ghi nhận hành trình món đồ được chuyền tay qua các thế hệ sinh viên trong làng đại học.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D6E8EE] text-[#001B48] text-[11px] font-extrabold border border-[#97CADB] self-start sm:self-auto">
          <IconSparkles className="w-3.5 h-3.5 text-[#018ABE]" />
          <span>Tuần hoàn sinh viên</span>
        </span>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l-2 border-[#97CADB]/70 space-y-6 ml-3 sm:ml-4 pt-1 pb-1">
        {records.length > 0 ? (
          records.map((item, index) => {
            const isFirst = index === 0;
            const isCurrent = index === records.length - 1;

            return (
              <div key={item.id || index} className="relative group">
                {/* Milestone Node */}
                <div
                  className={`absolute -left-[35px] sm:-left-[43px] top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110 ${
                    isCurrent
                      ? "bg-[#018ABE] text-white border-[#97CADB]"
                      : isFirst
                      ? "bg-[#001B48] text-[#97CADB] border-[#018ABE]"
                      : "bg-white text-[#001B48] border-[#97CADB]"
                  }`}
                >
                  {isFirst ? "1" : index + 1}
                </div>

                {/* Card Content */}
                <div className="p-4 rounded-2xl bg-white border border-[#D6E8EE] shadow-2xs hover:border-[#018ABE]/50 transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-[#001B48]">{item.owner_name}</span>
                      {item.cohort && (
                        <span className="px-2 py-0.5 rounded-md bg-[#D6E8EE] text-[#001B48] text-[10px] font-bold">
                          {item.cohort}
                        </span>
                      )}
                    </div>
                    {item.period && (
                      <span className="text-[11px] font-semibold text-[#02457A] bg-[#D6E8EE]/40 px-2 py-0.5 rounded-full">
                        {item.period}
                      </span>
                    )}
                  </div>

                  {item.university && (
                    <div className="text-xs text-[#02457A] font-medium flex items-center gap-1.5">
                      <IconSchool className="w-3.5 h-3.5 text-[#018ABE] shrink-0" />
                      <span>{item.university}</span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-[#001B48] bg-[#D6E8EE]/20 p-2.5 rounded-xl border border-[#D6E8EE]/50 italic">
                      "{item.notes}"
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* Trường hợp sản phẩm đăng mới: hiển thị chủ sở hữu hiện tại */
          <div className="relative group">
            <div className="absolute -left-[35px] sm:-left-[43px] top-0.5 w-8 h-8 rounded-full bg-[#001B48] text-[#97CADB] border-2 border-[#018ABE] flex items-center justify-center text-xs font-bold shadow-xs">
              1
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#D6E8EE] shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#001B48]">
                  {currentSellerName || "Sinh viên sở hữu ban đầu"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D6E8EE] text-[#001B48]">
                  Thế hệ 1
                </span>
              </div>
              <p className="text-xs text-[#02457A]">
                {currentSellerUniversity || "Đại học Quốc gia TP.HCM"} • Niêm phong & Đăng bán trên UniCycle
              </p>
            </div>
          </div>
        )}

        {/* Milestone: Thế hệ tiếp theo dành cho Bạn! */}
        <div className="relative group">
          <div className="absolute -left-[35px] sm:-left-[43px] top-0.5 w-8 h-8 rounded-full bg-emerald-500 text-white border-2 border-emerald-200 flex items-center justify-center text-xs font-bold shadow-xs animate-pulse">
            ★
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 border-2 border-dashed border-emerald-300 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-emerald-950">Thế hệ tiếp theo: Dành cho Bạn!</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                Chuyền tay tiếp
              </span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              Bạn sẽ là người tiếp theo kế thừa món đồ này. Tiết kiệm chi phí sinh hoạt và đồng hành cùng lối sống tuần hoàn xanh!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

