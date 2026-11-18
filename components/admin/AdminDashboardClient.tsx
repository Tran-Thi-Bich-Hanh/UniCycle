"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  activeListings: number;
  disputedOrdersCount: number;
  pendingReportsCount: number;
  pendingStudentCardsCount: number;
  flaggedPassportsCount: number;
  pendingChainTxsCount: number;
}

interface DisputedOrderItem {
  id: string;
  proposedPrice: number;
  meetPlace: string;
  disputeReason: string | null;
  disputedAt: string | null;
  listing: {
    id: string;
    title: string;
    price: number;
    status: string;
    item?: { id: string; passportId: string | null; passportStatus: string } | null;
  };
  buyer: { id: string; displayName: string; email: string; reputationScore: number };
  seller: { id: string; displayName: string; email: string; reputationScore: number };
}

interface AdminPassportItem {
  id: string;
  passportId: string | null;
  passportStatus: string;
  flagReason: string | null;
  flaggedAt: string | null;
  category: { name: string } | null;
  currentOwner: { id: string; displayName: string; email: string } | null;
  listings: Array<{ id: string; title: string; status: string }>;
  _count: { owners: number };
  chainTxs: Array<{ id: string; status: string; kind: string; txHash: string | null }>;
}

interface AdminReportItem {
  id: string;
  targetType: "LISTING" | "USER" | "PASSPORT";
  targetId: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter: { id: string; displayName: string; email: string };
}

interface PendingStudentItem {
  id: string;
  displayName: string;
  email: string;
  studentCardUrl: string | null;
  dorm: string | null;
  createdAt: string;
  school: { id: string; name: string; shortName: string } | null;
}

interface AdminChainTxItem {
  id: string;
  itemId: string;
  kind: string;
  status: string;
  txHash: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  item: { id: string; passportId: string | null; passportStatus: string };
}

export function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "disputes" | "passports" | "reports" | "students" | "chain"
  >("disputes");

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeListings: 0,
    disputedOrdersCount: 0,
    pendingReportsCount: 0,
    pendingStudentCardsCount: 0,
    flaggedPassportsCount: 0,
    pendingChainTxsCount: 0,
  });
  const [disputedOrders, setDisputedOrders] = useState<DisputedOrderItem[]>([]);
  const [passports, setPassports] = useState<AdminPassportItem[]>([]);
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudentItem[]>([]);
  const [chainTxs, setChainTxs] = useState<AdminChainTxItem[]>([]);

  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [flagReasons, setFlagReasons] = useState<Record<string, string>>({});
  const [snapshotTime, setSnapshotTime] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const applyAdminPayload = (data: Record<string, unknown>) => {
    if (data.stats) setStats(data.stats as AdminStats);
    setDisputedOrders(Array.isArray(data.disputedOrders) ? data.disputedOrders : []);
    setPassports(Array.isArray(data.passports) ? data.passports : []);
    setReports(Array.isArray(data.reports) ? data.reports : []);
    setPendingStudents(Array.isArray(data.pendingStudents) ? data.pendingStudents : []);
    setChainTxs(Array.isArray(data.chainTxs) ? data.chainTxs : []);
    if (typeof data.serverNow === "string") {
      setSnapshotTime(new Date(data.serverNow).getTime());
    }
  };

  const refreshData = async () => {
    const res = await fetch("/api/admin", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể tải dữ liệu Admin.");
    }
    applyAdminPayload(data);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Không thể tải dữ liệu Admin.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        applyAdminPayload(data);
      })
      .catch((err) => {
        if (active) {
          setFeedback({
            type: "error",
            message: err instanceof Error ? err.message : "Lỗi tải dữ liệu quản trị.",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const runAdminAction = async (key: string, payload: Record<string, unknown>) => {
    setBusyKey(key);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Thao tác quản trị thất bại.");
      }
      setFeedback({
        type: "success",
        message: data.message || "Thực thi thành công!",
      });
      await refreshData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Lỗi kết nối máy chủ.",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRunCronNow = async () => {
    setBusyKey("cron-run");
    setFeedback(null);
    try {
      const res = await fetch("/api/cron/reconcile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể chạy đối soát Cron.");
      }
      setFeedback({
        type: "success",
        message: data.message || "Đã chạy đối soát timeout & đồng bộ Fuji thành công!",
      });
      await refreshData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Lỗi chạy Cron Job.",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const getSlaRemainingLabel = (disputedAt: string | null) => {
    if (!disputedAt || !snapshotTime) return "SLA 72h";
    const deadlineMs = new Date(disputedAt).getTime() + 72 * 60 * 60 * 1000;
    const hoursLeft = Math.max(0, Math.round((deadlineMs - snapshotTime) / (60 * 60 * 1000)));
    return `Còn ${hoursLeft}h / 72h SLA`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#02457A]">
          Đang tải Bảng Điều Khiển Quản Trị UniCycle...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#001B48] text-white text-[11px] font-bold mb-1.5">
            <span>🛡️</span>
            <span>ADMIN CONTROL CENTER</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#001B48] tracking-tight">
            Quản Trị Kiểm Duyệt &amp; Phân Xử Tranh Chấp
          </h1>
          <p className="text-xs sm:text-sm text-[#02457A] mt-1">
            Phân xử đơn DISPUTED (SLA 72h), gắn/gỡ cờ Passport (BR39), duyệt thẻ SV (NĐ 13/2023) &amp; giám sát Avalanche Fuji.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunCronNow}
          disabled={busyKey === "cron-run"}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <span>⚡</span>
          <span>
            {busyKey === "cron-run"
              ? "Đang chạy đối soát..."
              : "Chạy đối soát Timeout & Cron ngay"}
          </span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-[#D6E8EE] shadow-2xs">
          <div className="text-xl font-black text-rose-600">{stats.disputedOrdersCount}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Đơn DISPUTED (72h)
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#D6E8EE] shadow-2xs">
          <div className="text-xl font-black text-amber-600">{stats.pendingReportsCount}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Báo cáo chờ duyệt
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#D6E8EE] shadow-2xs">
          <div className="text-xl font-black text-[#018ABE]">{stats.pendingStudentCardsCount}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Thẻ SV chờ duyệt
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#D6E8EE] shadow-2xs">
          <div className="text-xl font-black text-rose-700">{stats.flaggedPassportsCount}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Passport đang Flag
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#D6E8EE] shadow-2xs">
          <div className="text-xl font-black text-[#02457A]">{stats.pendingChainTxsCount}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
            ChainTx chờ / lỗi
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#D6E8EE] shadow-2xs">
          <div className="text-xl font-black text-[#001B48]">{stats.activeListings}</div>
          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Tin mở bán · {stats.totalUsers} SV
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Tabs Card */}
      <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
        <div className="flex overflow-x-auto border-b border-[#D6E8EE] bg-[#F4F9FB]">
          <button
            type="button"
            onClick={() => setActiveTab("disputes")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === "disputes"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            ⚖️ Khiếu nại DISPUTED ({disputedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("passports")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === "passports"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            📜 Flag / Unflag Passport ({passports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === "reports"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            🚩 Báo cáo vi phạm ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === "students"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            🪪 Duyệt thẻ SV ({pendingStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chain")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === "chain"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            ⛓️ Hàng đợi Fuji ({chainTxs.length})
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* TAB 1: PHÂN XỬ ĐƠN DISPUTED (SLA 72H) */}
          {activeTab === "disputes" && (
            <div className="space-y-4">
              {disputedOrders.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <div className="text-3xl">⚖️</div>
                  <p className="text-sm font-bold text-[#001B48]">
                    Không có đơn hàng nào đang tranh chấp (DISPUTED)
                  </p>
                  <p className="text-xs text-slate-500">
                    Khi người mua bấm &ldquo;Tôi chưa nhận hàng&rdquo; trong cửa sổ 48h hoặc Passport bị gắn cờ khi đang giữ chỗ, đơn sẽ xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                disputedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                            DISPUTED
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                            {getSlaRemainingLabel(order.disputedAt)}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-[#001B48]">
                          {order.listing.title}
                        </h3>
                        <p className="text-xs text-slate-600">
                          Giá thỏa thuận: <strong>{order.proposedPrice.toLocaleString("vi-VN")} ₫</strong> · Địa điểm: {order.meetPlace}
                        </p>
                      </div>

                      <Link
                        href={`/orders/${order.id}`}
                        className="text-xs font-bold text-[#018ABE] hover:underline"
                      >
                        Xem chi tiết đơn &rarr;
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500">Người mua khiếu nại:</span>{" "}
                        <strong className="text-[#001B48]">{order.buyer.displayName}</strong> ({order.buyer.email})
                      </div>
                      <div>
                        <span className="text-slate-500">Người bán:</span>{" "}
                        <strong className="text-[#001B48]">{order.seller.displayName}</strong> ({order.seller.email})
                      </div>
                      <div className="sm:col-span-2 pt-1 border-t border-slate-100">
                        <span className="font-bold text-rose-700">Lý do khiếu nại:</span>{" "}
                        <span className="text-slate-800">{order.disputeReason || "Không ghi chú"}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label
                        htmlFor={`dispute-note-${order.id}`}
                        className="block text-xs font-bold text-[#001B48]"
                      >
                        Ghi chú kết luận phân xử của Admin:
                      </label>
                      <input
                        id={`dispute-note-${order.id}`}
                        type="text"
                        value={disputeNotes[order.id] || ""}
                        onChange={(e) =>
                          setDisputeNotes((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        placeholder="Nhập lý do/bằng chứng đối soát giữa 2 bên..."
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs text-[#001B48] focus:border-[#018ABE] focus:outline-none"
                      />

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={busyKey === `dispute-${order.id}`}
                          onClick={() =>
                            runAdminAction(`dispute-${order.id}`, {
                              action: "resolve_dispute",
                              orderId: order.id,
                              conclusion: "BUYER_RECEIVED",
                              resolutionNote: disputeNotes[order.id] || "",
                            })
                          }
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          ✓ Người mua đã nhận hàng (COMPLETED + Chuyển Passport)
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === `dispute-${order.id}`}
                          onClick={() =>
                            runAdminAction(`dispute-${order.id}`, {
                              action: "resolve_dispute",
                              orderId: order.id,
                              conclusion: "NOT_DELIVERED",
                              resolutionNote: disputeNotes[order.id] || "",
                            })
                          }
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          ✕ Chưa giao hàng (CANCELLED + Nhả AVAILABLE)
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === `dispute-${order.id}`}
                          onClick={() =>
                            runAdminAction(`dispute-${order.id}`, {
                              action: "resolve_dispute",
                              orderId: order.id,
                              conclusion: "INSUFFICIENT_EVIDENCE",
                              resolutionNote: disputeNotes[order.id] || "",
                            })
                          }
                          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          ⚖️ Không đủ căn cứ (CANCELLED + Nhả AVAILABLE)
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: QUẢN LÝ & FLAG / UNFLAG PASSPORT (BR32, BR39) */}
          {activeTab === "passports" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-[#001B48]">
                <strong>Hiệu lực gắn cờ Passport (BR39):</strong> Khi gắn cờ <code className="font-mono font-bold">FLAGGED</code>, hệ thống tự động ẩn tin đăng liên quan sang <code className="font-mono">HIDDEN</code>, từ chối đơn <code className="font-mono">PENDING</code>, chuyển đơn đang giữ chỗ sang <code className="font-mono">DISPUTED</code>, ghi nhận <code className="font-mono">PassportEvent</code> và xếp hàng phát sóng <code className="font-mono">flag()</code> lên Avalanche Fuji.
              </div>

              {passports.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Chưa có Passport nào trong hệ thống.</p>
              ) : (
                <div className="space-y-3">
                  {passports.map((item) => {
                    const isFlagged = item.passportStatus === "FLAGGED";
                    const latestListing = item.listings[0];
                    return (
                      <div
                        key={item.id}
                        className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                          isFlagged
                            ? "border-rose-300 bg-rose-50/40"
                            : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  isFlagged
                                    ? "bg-rose-600 text-white"
                                    : item.passportStatus === "ARCHIVED_OWNER_DELETED"
                                    ? "bg-slate-600 text-white"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {item.passportStatus}
                              </span>
                              <span className="text-[11px] font-semibold text-[#02457A]">
                                {item.category?.name || "Đồ sinh viên"} · {item._count.owners} đời chủ
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold text-[#001B48]">
                              {latestListing?.title || "Món đồ có Digital Product Passport"}
                            </h3>
                            <p className="text-[11px] font-mono text-slate-500 break-all">
                              Passport ID: {item.passportId}
                            </p>
                            {item.currentOwner && (
                              <p className="text-xs text-slate-600">
                                Chủ hiện tại: <strong>{item.currentOwner.displayName}</strong> ({item.currentOwner.email})
                              </p>
                            )}
                            {isFlagged && item.flagReason && (
                              <p className="text-xs font-bold text-rose-700">
                                Lý do đang Flag: {item.flagReason}
                              </p>
                            )}
                          </div>

                          {item.passportId && (
                            <Link
                              href={`/passport/${item.passportId}`}
                              className="text-xs font-bold text-[#018ABE] hover:underline shrink-0"
                            >
                              Mở trang Passport ↗
                            </Link>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            aria-label={`Lý do gắn hoặc gỡ cờ cho ${item.passportId}`}
                            value={flagReasons[item.id] || ""}
                            onChange={(e) =>
                              setFlagReasons((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder={
                              isFlagged
                                ? "Nhập ghi chú xác minh hợp lệ để gỡ cờ (Unflag)..."
                                : "Nhập lý do gắn cờ vi phạm / đồ báo mất (tối thiểu 5 ký tự)..."
                            }
                            className="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs text-[#001B48] focus:border-[#018ABE] focus:outline-none"
                          />
                          {isFlagged ? (
                            <button
                              type="button"
                              disabled={busyKey === `flag-${item.id}`}
                              onClick={() =>
                                runAdminAction(`flag-${item.id}`, {
                                  action: "unflag_passport",
                                  itemId: item.id,
                                  reason: flagReasons[item.id] || "",
                                })
                              }
                              className="px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              ✓ Gỡ cờ &amp; Khôi phục (Unflag BR39)
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyKey === `flag-${item.id}`}
                              onClick={() =>
                                runAdminAction(`flag-${item.id}`, {
                                  action: "flag_passport",
                                  itemId: item.id,
                                  reason: flagReasons[item.id] || "",
                                })
                              }
                              className="px-4 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              🚩 Gắn cờ vi phạm (Flag BR39)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DUYỆT BÁO CÁO VI PHẠM (BR17) */}
          {activeTab === "reports" && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <div className="text-3xl">🚩</div>
                  <p className="text-sm font-bold text-[#001B48]">Chưa có báo cáo vi phạm nào</p>
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className={`p-4 rounded-2xl border space-y-2.5 ${
                      rep.status === "PENDING"
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            rep.status === "PENDING"
                              ? "bg-amber-500 text-white"
                              : rep.status === "RESOLVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {rep.status}
                        </span>
                        <span className="text-xs font-extrabold text-[#001B48]">
                          Đối tượng: {rep.targetType} ({rep.targetId.slice(0, 12)}...)
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        {rep.targetType === "LISTING" && (
                          <Link
                            href={`/products/${rep.targetId}`}
                            className="font-bold text-[#018ABE] hover:underline"
                          >
                            Xem tin đăng ↗
                          </Link>
                        )}
                        {rep.targetType === "PASSPORT" && (
                          <Link
                            href={`/passport/${rep.targetId}`}
                            className="font-bold text-[#018ABE] hover:underline"
                          >
                            Xem Passport ↗
                          </Link>
                        )}
                        {rep.targetType === "USER" && (
                          <Link
                            href={`/users/${rep.targetId}`}
                            className="font-bold text-[#018ABE] hover:underline"
                          >
                            Xem hồ sơ ↗
                          </Link>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200">
                      <strong>Nội dung báo cáo:</strong> {rep.reason}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        Người gửi: {rep.reporter.displayName} ({rep.reporter.email}) ·{" "}
                        {new Date(rep.createdAt).toLocaleString("vi-VN")}
                      </span>

                      {rep.status === "PENDING" && (
                        <div className="flex flex-wrap gap-2">
                          {rep.targetType === "LISTING" && (
                            <button
                              type="button"
                              disabled={busyKey === `rep-${rep.id}`}
                              onClick={() =>
                                runAdminAction(`rep-${rep.id}`, {
                                  action: "handle_report",
                                  reportId: rep.id,
                                  decision: "RESOLVED",
                                  removeListing: true,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              🗑️ Gỡ tin vi phạm (BR17) &amp; Đóng
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyKey === `rep-${rep.id}`}
                            onClick={() =>
                              runAdminAction(`rep-${rep.id}`, {
                                action: "handle_report",
                                reportId: rep.id,
                                decision: "RESOLVED",
                                removeListing: false,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            ✓ Đã xử lý
                          </button>
                          <button
                            type="button"
                            disabled={busyKey === `rep-${rep.id}`}
                            onClick={() =>
                              runAdminAction(`rep-${rep.id}`, {
                                action: "handle_report",
                                reportId: rep.id,
                                decision: "DISMISSED",
                                removeListing: false,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            Bác bỏ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: DUYỆT THẺ SINH VIÊN (NĐ 13/2023/NĐ-CP) */}
          {activeTab === "students" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-[#001B48]">
                <strong>Tuân thủ Nghị định 13/2023/NĐ-CP:</strong> Ngay khi bạn bấm <em>Phê duyệt</em> hoặc <em>Từ chối</em>, hệ thống tự động đặt <code className="font-mono font-bold">studentCardUrl = NULL</code> để xóa vĩnh viễn ảnh chụp thẻ sinh viên khỏi cơ sở dữ liệu.
              </div>

              {pendingStudents.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <div className="text-3xl">🪪</div>
                  <p className="text-sm font-bold text-[#001B48]">
                    Không có ảnh thẻ sinh viên nào đang chờ xét duyệt
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingStudents.map((st) => (
                    <div
                      key={st.id}
                      className="p-5 rounded-2xl border border-[#D6E8EE] bg-[#F8FAFC] space-y-3"
                    >
                      <div>
                        <h3 className="text-sm font-extrabold text-[#001B48]">{st.displayName}</h3>
                        <p className="text-xs text-slate-600">{st.email}</p>
                        <p className="text-xs text-[#02457A] mt-0.5">
                          {st.school?.name || "Chưa chọn trường"} {st.dorm ? `· ${st.dorm}` : ""}
                        </p>
                      </div>

                      {st.studentCardUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={st.studentCardUrl}
                            alt={`Thẻ sinh viên ${st.displayName}`}
                            className="w-full max-h-52 object-contain"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={busyKey === `st-${st.id}`}
                          onClick={() =>
                            runAdminAction(`st-${st.id}`, {
                              action: "verify_student_card",
                              targetUserId: st.id,
                              approve: true,
                            })
                          }
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          ✓ Phê duyệt &amp; Xóa ảnh thẻ
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === `st-${st.id}`}
                          onClick={() =>
                            runAdminAction(`st-${st.id}`, {
                              action: "verify_student_card",
                              targetUserId: st.id,
                              approve: false,
                            })
                          }
                          className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          ✕ Từ chối &amp; Xóa ảnh thẻ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GIÁM SÁT HÀNG ĐỢI CHAIN_TX & CRON */}
          {activeTab === "chain" && (
            <div className="space-y-4">
              {chainTxs.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <div className="text-3xl">⛓️</div>
                  <p className="text-sm font-bold text-[#001B48]">Chưa có giao dịch ChainTx nào</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {chainTxs.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-[#001B48]">{tx.kind}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              tx.status === "CONFIRMED"
                                ? "bg-emerald-100 text-emerald-800"
                                : tx.status === "QUEUED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {tx.status}
                          </span>
                          <span className="text-slate-500">Thử lại: {tx.attempts}/3</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 truncate">
                          Passport: {tx.item.passportId || tx.itemId}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate">
                          TxHash: {tx.txHash || "Chưa phát sóng"}
                        </div>
                        {tx.lastError && (
                          <div className="text-[11px] text-rose-600 truncate">
                            Lỗi: {tx.lastError}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {tx.txHash && (
                          <a
                            href={`https://testnet.snowtrace.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#018ABE] font-bold hover:bg-sky-50"
                          >
                            Snowtrace ↗
                          </a>
                        )}
                        {tx.status !== "CONFIRMED" && (
                          <button
                            type="button"
                            disabled={busyKey === `chain-${tx.itemId}`}
                            onClick={() =>
                              runAdminAction(`chain-${tx.itemId}`, {
                                action: "retry_chain_tx",
                                itemId: tx.itemId,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#018ABE] hover:bg-[#02457A] text-white font-bold cursor-pointer disabled:opacity-50"
                          >
                            ⚡ Đồng bộ lại
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
