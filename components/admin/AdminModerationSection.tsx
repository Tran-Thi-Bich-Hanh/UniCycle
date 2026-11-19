"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type {
  AdminChainTxItem,
  AdminReportItem,
  DisputedOrderItem,
} from "@/lib/admin/types";
import { AdminActionModal, AdminActionReasonConfig } from "./AdminActionModal";

export interface AdminModerationSectionProps {
  disputedOrders: DisputedOrderItem[];
  reports: AdminReportItem[];
  chainTxs: AdminChainTxItem[];
  serverNow: string;
  onRunAction: (
    payload: Record<string, unknown>
  ) => Promise<{ ok: boolean; error?: string }>;
}

type ModerationTab = "reports" | "disputes";
type ReportFilter = "PENDING" | "ALL";

type PendingModerationAction =
  | {
      kind: "handle_report";
      report: AdminReportItem;
      decision: "RESOLVED" | "DISMISSED";
      removeListing: boolean;
    }
  | {
      kind: "resolve_dispute";
      order: DisputedOrderItem;
      conclusion: "BUYER_RECEIVED" | "NOT_DELIVERED" | "INSUFFICIENT_EVIDENCE";
    };

const REPORT_STATUS_MAP: Record<
  AdminReportItem["status"],
  { label: string; className: string }
> = {
  PENDING: {
    label: "Chờ xử lý",
    className: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  RESOLVED: {
    label: "Đã xử lý",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  DISMISSED: {
    label: "Đã bác bỏ",
    className: "bg-slate-100 text-slate-600 border-slate-200/80",
  },
};

const REPORT_TARGET_MAP: Record<
  AdminReportItem["targetType"],
  { label: string; linkLabel: string; getHref: (id: string) => string }
> = {
  LISTING: {
    label: "Tin đăng",
    linkLabel: "Xem tin đăng",
    getHref: (id) => `/products/${id}`,
  },
  USER: {
    label: "Tài khoản",
    linkLabel: "Xem hồ sơ",
    getHref: (id) => `/users/${id}`,
  },
  PASSPORT: {
    label: "Hành trình món đồ",
    linkLabel: "Xem hành trình",
    getHref: (id) => `/passport/${id}`,
  },
};

const CHAIN_KIND_MAP: Record<string, string> = {
  REGISTER: "Khởi tạo hành trình",
  TRANSFER: "Chuyển giao chủ sở hữu",
  FLAG: "Gắn cảnh báo",
  UNFLAG: "Gỡ cảnh báo",
};

const CHAIN_STATUS_MAP: Record<string, { label: string; className: string }> = {
  CONFIRMED: {
    label: "Đã xác nhận",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  SENT: {
    label: "Đang gửi",
    className: "bg-sky-50 text-sky-800 border-sky-200/80",
  },
  QUEUED: {
    label: "Đang chờ",
    className: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  FAILED: {
    label: "Thất bại",
    className: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
  NEEDS_ATTENTION: {
    label: "Cần kiểm tra",
    className: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
};

function formatDateTimeLabel(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getDisputeDeadlineInfo(
  disputedAt: string | null,
  serverNowIso: string
): { label: string; urgent: boolean } {
  if (!disputedAt) {
    return { label: "Mốc xử lý 72 giờ", urgent: false };
  }

  const disputedMs = new Date(disputedAt).getTime();
  const baseNowMs = new Date(serverNowIso).getTime();
  if (Number.isNaN(disputedMs) || Number.isNaN(baseNowMs)) {
    return { label: "Mốc xử lý 72 giờ", urgent: false };
  }

  const deadlineMs = disputedMs + 72 * 60 * 60 * 1000;
  const hoursLeft = Math.max(0, Math.round((deadlineMs - baseNowMs) / (60 * 60 * 1000)));

  if (hoursLeft === 0) {
    return { label: "Đã quá mốc 72 giờ", urgent: true };
  }

  return {
    label: `Còn ${hoursLeft} giờ / 72 giờ`,
    urgent: hoursLeft <= 12,
  };
}

function getModalConfig(action: PendingModerationAction): {
  title: string;
  description: string;
  warningText?: string;
  confirmLabel: string;
  variant: "primary" | "danger";
  reasonConfig?: AdminActionReasonConfig;
} {
  if (action.kind === "handle_report") {
    if (action.decision === "RESOLVED" && action.removeListing) {
      return {
        title: "Gỡ tin đăng & đóng báo cáo",
        description: `Xác nhận xử lý báo cáo từ ${action.report.reporter.displayName} và gỡ bỏ tin đăng bị phản ánh khỏi sàn.`,
        warningText:
          "Tin đăng sẽ chuyển sang trạng thái đã gỡ và người đăng tin sẽ nhận được thông báo vi phạm tiêu chuẩn cộng đồng.",
        confirmLabel: "Gỡ tin & đóng báo cáo",
        variant: "danger",
      };
    }

    if (action.decision === "RESOLVED") {
      return {
        title: "Đánh dấu báo cáo đã xử lý",
        description: `Đóng báo cáo của ${action.report.reporter.displayName} với trạng thái đã kiểm tra và xử lý xong.`,
        confirmLabel: "Đánh dấu đã xử lý",
        variant: "primary",
      };
    }

    return {
      title: "Bác bỏ báo cáo vi phạm",
      description: `Xác nhận nội dung bị phản ánh không vi phạm quy định cộng đồng và đóng báo cáo của ${action.report.reporter.displayName}.`,
      confirmLabel: "Bác bỏ báo cáo",
      variant: "primary",
    };
  }

  const { order, conclusion } = action;
  if (conclusion === "BUYER_RECEIVED") {
    return {
      title: "Kết luận: Người mua đã nhận hàng",
      description: `Hoàn tất đơn "${order.listing.title}" giữa ${order.buyer.displayName} và ${order.seller.displayName}.`,
      warningText:
        "Đơn hàng sẽ chuyển sang hoàn tất, tin đăng đánh dấu đã bán và quyền sở hữu hành trình món đồ (nếu có) sẽ chuyển cho người mua.",
      confirmLabel: "Xác nhận hoàn tất đơn",
      variant: "primary",
      reasonConfig: {
        label: "Ghi chú kết luận phân xử (không bắt buộc)",
        placeholder: "Nhập căn cứ đối soát gửi tới người mua và người bán...",
        required: false,
      },
    };
  }

  if (conclusion === "NOT_DELIVERED") {
    return {
      title: "Kết luận: Chưa giao hàng — Hủy đơn",
      description: `Hủy đơn tranh chấp "${order.listing.title}" do chưa bàn giao hoặc đồ không đúng mô tả.`,
      warningText:
        "Đơn hàng sẽ bị hủy và trạng thái tin đăng sẽ được mở lại để người bán cập nhật hoặc đăng bán lại.",
      confirmLabel: "Hủy đơn & mở lại tin",
      variant: "danger",
      reasonConfig: {
        label: "Ghi chú kết luận phân xử (không bắt buộc)",
        placeholder: "Ghi rõ lý do hủy đơn gửi tới hai bên...",
        required: false,
      },
    };
  }

  return {
    title: "Kết luận: Không đủ căn cứ — Hủy đơn",
    description: `Đóng tranh chấp cho đơn "${order.listing.title}" do chưa đủ bằng chứng xác minh từ hai phía.`,
    warningText:
      "Đơn hàng sẽ bị hủy an toàn và tin đăng (nếu không bị cảnh báo hành trình) sẽ tự động mở lại.",
    confirmLabel: "Xác nhận hủy đơn",
    variant: "danger",
    reasonConfig: {
      label: "Ghi chú kết luận phân xử (không bắt buộc)",
      placeholder: "Nhập ghi chú gửi đến người mua và người bán...",
      required: false,
    },
  };
}

export function AdminModerationSection({
  disputedOrders,
  reports,
  chainTxs,
  serverNow,
  onRunAction,
}: AdminModerationSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<ModerationTab>(() =>
    disputedOrders.length > 0 ? "disputes" : "reports"
  );
  const [reportFilter, setReportFilter] = useState<ReportFilter>(() =>
    reports.some((r) => r.status === "PENDING") ? "PENDING" : "ALL"
  );
  const [syncExpanded, setSyncExpanded] = useState(false);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingModerationAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const pendingReportsCount = useMemo(
    () => reports.filter((r) => r.status === "PENDING").length,
    [reports]
  );

  const filteredReports = useMemo(() => {
    if (reportFilter === "PENDING") {
      return reports.filter((r) => r.status === "PENDING");
    }
    return reports;
  }, [reports, reportFilter]);

  const attentionChainCount = useMemo(
    () =>
      chainTxs.filter((tx) => ["QUEUED", "FAILED", "NEEDS_ATTENTION"].includes(tx.status)).length,
    [chainTxs]
  );

  const handleConfirmAction = async (reason: string) => {
    if (!pendingAction) return;
    setSubmitting(true);
    setModalError(null);

    let requestPayload: Record<string, unknown>;
    if (pendingAction.kind === "handle_report") {
      requestPayload = {
        action: "handle_report",
        reportId: pendingAction.report.id,
        decision: pendingAction.decision,
        removeListing: pendingAction.removeListing,
      };
    } else {
      requestPayload = {
        action: "resolve_dispute",
        orderId: pendingAction.order.id,
        conclusion: pendingAction.conclusion,
        resolutionNote: reason,
      };
    }

    const result = await onRunAction(requestPayload);
    setSubmitting(false);

    if (result.ok) {
      setPendingAction(null);
      setModalError(null);
    } else {
      setModalError(result.error || "Không thể thực thi thao tác.");
    }
  };

  const handleRetrySync = async (itemId: string) => {
    setRetryingItemId(itemId);
    await onRunAction({
      action: "retry_chain_tx",
      itemId,
    });
    setRetryingItemId(null);
  };

  const modalConfig = pendingAction ? getModalConfig(pendingAction) : null;

  return (
    <div className="space-y-5">
      {/* Sub-Tabs Navigation */}
      <div
        role="group"
        aria-label="Phân mục kiểm duyệt"
        className="bg-white rounded-2xl border border-slate-200/80 p-2 flex flex-wrap items-center gap-2 shadow-[0_1px_2px_rgba(0,27,72,0.04)]"
      >
        <button
          type="button"
          aria-pressed={activeSubTab === "reports"}
          onClick={() => setActiveSubTab("reports")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
            activeSubTab === "reports"
              ? "bg-[#EEF7FB] text-[#001B48] font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-[#001B48]"
          }`}
        >
          <span>Báo cáo vi phạm</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none tabular-nums ${
              pendingReportsCount > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {pendingReportsCount}
          </span>
        </button>

        <button
          type="button"
          aria-pressed={activeSubTab === "disputes"}
          onClick={() => setActiveSubTab("disputes")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
            activeSubTab === "disputes"
              ? "bg-[#EEF7FB] text-[#001B48] font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-[#001B48]"
          }`}
        >
          <span>Tranh chấp đơn hàng</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none tabular-nums ${
              disputedOrders.length > 0
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {disputedOrders.length}
          </span>
        </button>
      </div>

      {/* Sub-Tab A: Báo cáo vi phạm */}
      {activeSubTab === "reports" && (
        <section
          aria-label="Danh sách báo cáo vi phạm"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,27,72,0.04)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#001B48]">Danh sách báo cáo vi phạm</h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {pendingReportsCount > 0
                  ? `${pendingReportsCount} báo cáo đang chờ xem xét`
                  : "Không có báo cáo tồn đọng"}
              </p>
            </div>

            <div
              role="group"
              aria-label="Lọc trạng thái báo cáo"
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/80"
            >
              <button
                type="button"
                aria-pressed={reportFilter === "PENDING"}
                onClick={() => setReportFilter("PENDING")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  reportFilter === "PENDING"
                    ? "bg-white text-[#001B48] font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-[#001B48]"
                }`}
              >
                Chờ xử lý ({pendingReportsCount})
              </button>
              <button
                type="button"
                aria-pressed={reportFilter === "ALL"}
                onClick={() => setReportFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  reportFilter === "ALL"
                    ? "bg-white text-[#001B48] font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-[#001B48]"
                }`}
              >
                Tất cả ({reports.length})
              </button>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">
                {reportFilter === "PENDING" && reports.length > 0
                  ? "Tất cả báo cáo vi phạm đều đã được xử lý."
                  : "Chưa có báo cáo vi phạm nào từ cộng đồng."}
              </p>
              {reportFilter === "PENDING" && reports.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReportFilter("ALL")}
                  className="inline-flex items-center px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#001B48] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Xem tất cả báo cáo ({reports.length})
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => {
                const statusInfo = REPORT_STATUS_MAP[report.status] ?? {
                  label: "Đang cập nhật",
                  className: "bg-slate-100 text-slate-600 border-slate-200/80",
                };
                const targetInfo = REPORT_TARGET_MAP[report.targetType];
                const createdLabel = formatDateTimeLabel(report.createdAt);

                return (
                  <div
                    key={report.id}
                    className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-slate-200/80 bg-slate-50 text-slate-700 text-[11px] font-medium">
                          Đối tượng: {targetInfo.label}
                        </span>
                        <Link
                          href={targetInfo.getHref(report.targetId)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#018ABE] hover:text-[#02457A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] rounded"
                        >
                          <span>{targetInfo.linkLabel}</span>
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                            />
                          </svg>
                        </Link>
                      </div>

                      {createdLabel && (
                        <span className="text-xs text-slate-400 tabular-nums">{createdLabel}</span>
                      )}
                    </div>

                    <div className="rounded-xl bg-slate-50/80 border border-slate-200/70 px-3.5 py-2.5">
                      <p className="text-sm text-[#001B48] leading-relaxed">{report.reason}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        Người gửi:{" "}
                        <strong className="font-semibold text-slate-700">
                          {report.reporter.displayName}
                        </strong>{" "}
                        ({report.reporter.email})
                      </p>

                      {report.status === "PENDING" && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {report.targetType === "LISTING" && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  kind: "handle_report",
                                  report,
                                  decision: "RESOLVED",
                                  removeListing: true,
                                })
                              }
                              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            >
                              Gỡ tin &amp; Đóng báo cáo
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "handle_report",
                                report,
                                decision: "RESOLVED",
                                removeListing: false,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-xs font-semibold text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            Đánh dấu đã xử lý
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "handle_report",
                                report,
                                decision: "DISMISSED",
                                removeListing: false,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                          >
                            Bác bỏ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Sub-Tab B: Tranh chấp đơn hàng */}
      {activeSubTab === "disputes" && (
        <section
          aria-label="Đơn hàng đang tranh chấp"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,27,72,0.04)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-[#001B48]">Đơn hàng đang tranh chấp</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mốc thời gian giải quyết tối đa 72 giờ kể từ lúc phát sinh khiếu nại
            </p>
          </div>

          {disputedOrders.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">
                Không có đơn hàng nào đang tranh chấp.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Khi người mua báo chưa nhận được hàng hoặc phát sinh khiếu nại trong quá trình bàn giao, đơn hàng sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {disputedOrders.map((order) => {
                const deadline = getDisputeDeadlineInfo(order.disputedAt, serverNow);

                return (
                  <div key={order.id} className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-medium">
                            Đang tranh chấp
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-medium tabular-nums ${
                              deadline.urgent
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                          >
                            {deadline.label}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-[#001B48]">
                          {order.listing.title}
                        </h3>
                        <p className="text-xs text-slate-500 tabular-nums">
                          Giá thỏa thuận:{" "}
                          <strong className="font-semibold text-[#001B48]">
                            {order.proposedPrice > 0
                              ? `${order.proposedPrice.toLocaleString("vi-VN")} đ`
                              : "Miễn phí 0đ"}
                          </strong>{" "}
                          · Địa điểm hẹn: {order.meetPlace}
                        </p>
                      </div>

                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#018ABE] hover:text-[#02457A] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] rounded"
                      >
                        <span>Xem chi tiết đơn</span>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50/80 border border-slate-200/70 p-3.5 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-slate-500">Người mua khiếu nại</span>
                        <p className="font-semibold text-[#001B48]">
                          {order.buyer.displayName}{" "}
                          <span className="font-normal text-slate-500">({order.buyer.email})</span>
                        </p>
                        <p className="text-slate-500 tabular-nums">
                          Uy tín: {order.buyer.reputationScore.toFixed(1)}/5
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500">Người bán</span>
                        <p className="font-semibold text-[#001B48]">
                          {order.seller.displayName}{" "}
                          <span className="font-normal text-slate-500">
                            ({order.seller.email})
                          </span>
                        </p>
                        <p className="text-slate-500 tabular-nums">
                          Uy tín: {order.seller.reputationScore.toFixed(1)}/5
                        </p>
                      </div>
                      <div className="sm:col-span-2 pt-2.5 border-t border-slate-200/70">
                        <span className="font-semibold text-rose-700">Lý do khiếu nại: </span>
                        <span className="text-slate-700">
                          {order.disputeReason || "Không có ghi chú cụ thể"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            kind: "resolve_dispute",
                            order,
                            conclusion: "BUYER_RECEIVED",
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
                      >
                        Xác nhận đã nhận hàng
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            kind: "resolve_dispute",
                            order,
                            conclusion: "NOT_DELIVERED",
                          })
                        }
                        className="px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        Chưa giao hàng — Hủy đơn
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            kind: "resolve_dispute",
                            order,
                            conclusion: "INSUFFICIENT_EVIDENCE",
                          })
                        }
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                      >
                        Không đủ căn cứ — Hủy đơn
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Collapsible Technical Block: Trạng thái đồng bộ dữ liệu */}
      <section
        aria-label="Trạng thái đồng bộ dữ liệu"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,27,72,0.04)] overflow-hidden"
      >
        <button
          type="button"
          aria-expanded={syncExpanded}
          onClick={() => setSyncExpanded((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#001B48]">Trạng thái đồng bộ dữ liệu</h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Hàng đợi đồng bộ lịch sử hành trình món đồ ({chainTxs.length} bản ghi gần nhất)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium tabular-nums ${
                attentionChainCount === 0
                  ? "bg-emerald-50 border-emerald-200/80 text-emerald-700"
                  : "bg-amber-50 border-amber-200/80 text-amber-800"
              }`}
            >
              {attentionChainCount === 0 ? "Ổn định" : `${attentionChainCount} mục cần chú ý`}
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                syncExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>

        {syncExpanded && (
          <div className="border-t border-slate-100">
            {chainTxs.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500">
                Chưa có bản ghi đồng bộ nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {chainTxs.map((tx) => {
                  const statusInfo = CHAIN_STATUS_MAP[tx.status] ?? {
                    label: "Đang xử lý",
                    className: "bg-slate-100 text-slate-600 border-slate-200/80",
                  };
                  const kindLabel = CHAIN_KIND_MAP[tx.kind] ?? "Cập nhật hành trình";
                  const needsRetry = ["QUEUED", "FAILED", "NEEDS_ATTENTION"].includes(tx.status);
                  const isRetrying = retryingItemId === tx.itemId;
                  const createdLabel = formatDateTimeLabel(tx.createdAt);

                  return (
                    <div
                      key={tx.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[#001B48]">{kindLabel}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                          <Link
                            href={`/passport/${tx.itemId}`}
                            className="text-xs font-medium text-[#018ABE] hover:underline"
                          >
                            Xem hành trình
                          </Link>
                        </div>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {tx.txHash
                            ? `Mã tham chiếu: ${tx.txHash.slice(0, 12)}...`
                            : "Chưa phát sinh mã giao dịch"}{" "}
                          · Lần thử: {tx.attempts}
                          {createdLabel ? ` · ${createdLabel}` : ""}
                        </p>
                        {tx.lastError && (
                          <p className="text-xs text-rose-700 bg-rose-50/70 border border-rose-200/70 rounded-lg px-2.5 py-1 inline-block">
                            Chi tiết sự cố: {tx.lastError}
                          </p>
                        )}
                      </div>

                      {needsRetry && (
                        <button
                          type="button"
                          disabled={isRetrying}
                          onClick={() => handleRetrySync(tx.itemId)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#001B48] transition-colors cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                        >
                          {isRetrying ? "Đang đồng bộ..." : "Thử đồng bộ lại"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal xác nhận xử lý báo cáo / phân xử tranh chấp */}
      {modalConfig && (
        <AdminActionModal
          open={Boolean(pendingAction)}
          title={modalConfig.title}
          description={modalConfig.description}
          warningText={modalConfig.warningText}
          confirmLabel={modalConfig.confirmLabel}
          variant={modalConfig.variant}
          reasonConfig={modalConfig.reasonConfig}
          submitting={submitting}
          error={modalError}
          onClose={() => {
            if (!submitting) {
              setPendingAction(null);
              setModalError(null);
            }
          }}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
