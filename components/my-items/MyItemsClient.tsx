"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface MyItemData {
  id: string;
  passportId: string | null;
  passportStatus: string;
  identityLevel: string;
  category: { id: string; name: string; slug: string };
  title: string;
  thumbnail: string;
  totalOwners: number;
  myOwnerSeq: number;
  showNameOnPassport: boolean;
  ownedSince: string;
  isCurrentlyListed: boolean;
  latestListingId?: string | null;
  latestListingStatus?: string | null;
  passportUrl?: string | null;
  qrUrl?: string | null;
  chainTx?: {
    id: string;
    status: string;
    txHash?: string | null;
  } | null;
}

interface MyItemsClientProps {
  initialItems: MyItemData[];
}

export function MyItemsClient({ initialItems }: MyItemsClientProps) {
  const [items, setItems] = useState<MyItemData[]>(initialItems);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeQrItem, setActiveQrItem] = useState<MyItemData | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Xử lý bật/tắt hiển thị tên trên Passport (BR29)
  const handleToggleShowName = async (itemId: string, currentShowName: boolean) => {
    setUpdatingId(itemId);
    setMessage(null);
    const newShowName = !currentShowName;

    try {
      const res = await fetch(`/api/my-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showName: newShowName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Không thể cập nhật tùy chọn hiển thị." });
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, showNameOnPassport: newShowName } : item
        )
      );

      setMessage({ type: "success", text: data.message });
      setTimeout(() => setMessage(null), 3500);
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối khi cập nhật tùy chọn hiển thị." });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#018ABE] block mb-1">
              Hồ Sơ Tài Sản Sinh Viên
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#001B48] tracking-tight">
              Đồ Của Tôi & Digital Passport
            </h1>
            <p className="text-xs sm:text-sm text-[#02457A] mt-1">
              Quản lý các món đồ đang sở hữu, hiển thị mã QR số khi gặp mặt và đăng bán lại 1-chạm kế thừa lịch sử (BR24, BR25, BR29)
            </p>
          </div>

          <Link
            href="/sell"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>+ Đăng món đồ mới</span>
          </Link>
        </div>

        {/* Thông báo thao tác */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            <span>{message.type === "success" ? "✓" : "⚠️"}</span>
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        {/* Banner Tuyên bố giới hạn & Hướng dẫn (BR30) */}
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-[#001B48] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="text-xl shrink-0">💡</span>
            <p className="leading-relaxed">
              Khi gặp mặt trao đổi tại KTX/Căng tin, bấm <strong>&ldquo;📱 Mã QR số&rdquo;</strong> đưa cho người mua quét đối chiếu. Sau khi ra trường, bấm <strong>&ldquo;🔄 Bán lại&rdquo;</strong> để kế thừa nguyên vẹn Digital Passport sang đời chủ kế tiếp!
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#018ABE] shrink-0 bg-white px-2.5 py-1 rounded-lg border border-sky-200">
            Tuân thủ BR24 & BR25
          </span>
        </div>

        {/* 2. Danh sách đồ của tôi */}
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#D6E8EE] space-y-4">
            <div className="text-5xl">📦</div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#001B48]">
              Bạn chưa có món đồ nào trong tủ đồ cá nhân
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Khi bạn mua đồ thành công từ bạn học hoặc đăng tin mới có bật Digital Product Passport, món đồ sẽ tự động xuất hiện tại đây.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/products"
                className="px-5 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-colors"
              >
                Khám phá đồ dùng sinh viên
              </Link>
              <Link
                href="/sell"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Đăng đồ đầu tiên của bạn
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {items.map((item) => {
              const isUpdating = updatingId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D6E8EE] hover:border-[#018ABE]/60 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between gap-5 relative group"
                >
                  {/* Khối trên: Ảnh đại diện + Thông tin chính */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail ảnh */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          fill
                          sizes="96px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Tiêu đề & Danh mục */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#018ABE] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                            {item.category.name}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                            Đời chủ #{item.myOwnerSeq}
                          </span>
                          {item.isCurrentlyListed && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-md">
                              Đang mở bán
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-[#001B48] line-clamp-2 leading-snug">
                          {item.title}
                        </h3>

                        <p className="text-[11px] text-slate-500">
                          Sở hữu từ: {formatDate(item.ownedSince)} • Tổng cộng {item.totalOwners} đời chủ
                        </p>
                      </div>
                    </div>

                    {/* Khung Passport ID */}
                    {item.passportId && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#001B48] flex items-center gap-1">
                            <span>📜</span>
                            <span>Passport ID:</span>
                          </span>
                          <Link
                            href={`/passport/${item.passportId}`}
                            className="font-bold text-[#018ABE] hover:underline"
                          >
                            Xem lịch sử ↗
                          </Link>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 truncate bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {item.passportId}
                        </div>
                        {item.chainTx?.txHash && (
                          <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                            <span className="text-emerald-700 font-semibold">
                              ✓ On-chain ({item.chainTx.status})
                            </span>
                            <a
                              href={`https://testnet.snowtrace.io/tx/${item.chainTx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#018ABE] hover:underline font-mono"
                            >
                              ⛓️ Snowtrace ({item.chainTx.txHash.slice(0, 8)}...) ↗
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Toggle hiển thị tên trên Passport (BR29) */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#D6E8EE]/20 border border-[#D6E8EE]/60 text-xs">
                      <div className="space-y-0.5 pr-2">
                        <span className="font-bold text-[#001B48] block">
                          Hiển thị tên của bạn trên Passport (BR29)
                        </span>
                        <span className="text-[11px] text-[#02457A]">
                          {item.showNameOnPassport
                            ? "Đang hiển thị tên thật của bạn cho người mua sau"
                            : "Đang ở chế độ ẩn danh (Chủ #n · Trường · Tháng/Năm)"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleShowName(item.id, item.showNameOnPassport)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          item.showNameOnPassport ? "bg-emerald-600" : "bg-slate-300"
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            item.showNameOnPassport ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Khối dưới: Nút hành động */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Nút hiển thị QR */}
                    {item.qrUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveQrItem(item)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📱 Mã QR số</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Nút Bán lại (Kế thừa Passport BR24, BR25, BR33) */}
                      {!item.isCurrentlyListed ? (
                        <Link
                          href={`/sell?resellItemId=${item.id}`}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <span>🔄 Bán lại 1-chạm</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/products/${item.latestListingId}`}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
                        >
                          Xem tin đang bán ↗
                        </Link>
                      )}

                      {/* Xem chi tiết Passport */}
                      {item.passportId && (
                        <Link
                          href={`/passport/${item.passportId}`}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#02457A] border border-[#D6E8EE] text-xs font-bold transition-colors"
                        >
                          Lịch sử ↗
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal QR Code Toàn Màn Hình Khi Gặp Mặt */}
      {activeQrItem && activeQrItem.qrUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveQrItem(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-[#001B48] text-base">
                Mã Định Danh Số Khi Gặp Mặt
              </h3>
              <button
                type="button"
                onClick={() => setActiveQrItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-bold text-[#001B48] line-clamp-1">
              {activeQrItem.title}
            </p>

            <div className="relative w-64 h-64 mx-auto border-2 border-dashed border-[#018ABE]/30 p-2 rounded-2xl bg-slate-50">
              <Image
                src={activeQrItem.qrUrl}
                alt="Passport QR Fullscreen"
                fill
                sizes="256px"
                className="object-contain p-2"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Đưa màn hình này cho bạn mua quét đối chiếu chuỗi đời chủ và ảnh qua các thế hệ trực tiếp tại KTX/Căng tin (BR24, BR30).
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/passport/${activeQrItem.passportId}`}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs font-bold transition-colors"
              >
                Xem trang Passport
              </Link>
              <button
                type="button"
                onClick={() => setActiveQrItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
