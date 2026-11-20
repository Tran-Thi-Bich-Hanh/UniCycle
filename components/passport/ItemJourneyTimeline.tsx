"use client";

import React from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";

export type JourneyBadgeTone = "origin" | "current" | "transferred" | "upcoming";

export interface JourneyOwnerStep {
  key: string | number;
  seq: number;
  title: string;
  badgeLabel: string;
  badgeTone: JourneyBadgeTone;
  isCurrent?: boolean;
  metaText: string;
  txHash?: string | null;
  extraContent?: React.ReactNode;
}

export interface JourneyNextStep {
  title: string;
  badgeLabel: string;
  description: string;
}

export interface ItemJourneyTimelineProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  steps: JourneyOwnerStep[];
  nextStep?: JourneyNextStep | null;
  emptyContent?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  animate?: boolean;
  className?: string;
}

const BADGE_TONE_CLASSES: Record<JourneyBadgeTone, string> = {
  origin: "bg-[#E6F6EE] text-[#0B6B3A] border-[#B7E4CB]",
  upcoming: "bg-[#E6F6EE] text-[#0B6B3A] border-[#B7E4CB]",
  current: "bg-gradient-to-r from-[#E3F1F9] to-[#BAE6FD]/70 text-[#0088C2] border-[#7DD3FC]",
  transferred: "bg-[#EEF2F6] text-[#475569] border-[#DCE6EE]",
};

function RevealBlock({
  animate,
  delayMs,
  children,
}: {
  animate: boolean;
  delayMs: number;
  children: React.ReactNode;
}) {
  if (!animate) {
    return <>{children}</>;
  }
  return (
    <ScrollReveal variant="fade-up" delayMs={delayMs} once={false}>
      {children}
    </ScrollReveal>
  );
}

/**
 * Shared timeline block displaying an item's ownership journey across student owners.
 */
export function ItemJourneyTimeline({
  title = "Hành trình đồ vật",
  subtitle,
  headerRight,
  steps,
  nextStep,
  emptyContent,
  actions,
  footer,
  animate = true,
  className = "",
}: ItemJourneyTimelineProps) {
  const hasTimelineItems = steps.length > 0 || Boolean(nextStep);
  const actionsDelayMs = (steps.length + (nextStep ? 1 : 0)) * 90;

  return (
    <div
      className={`bg-gradient-to-br from-[#EEF7FC] via-white to-[#E1F3FD] rounded-3xl p-6 sm:p-8 border border-[#7DD3FC]/70 shadow-[0_12px_45px_rgba(0,136,194,0.14)] relative overflow-hidden space-y-6 ${className}`.trim()}
    >
      {/* Lớp ánh sáng nền xanh dịu cố định */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,136,194,0.22),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(2,132,199,0.18),transparent_60%)] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-[#0088C2]/30 via-[#38BDF8]/25 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 -left-28 w-80 h-80 rounded-full bg-gradient-to-tr from-[#0284C7]/25 via-[#0088C2]/20 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 right-4 w-96 h-96 rounded-full bg-gradient-to-tl from-[#38BDF8]/30 via-[#0284C7]/20 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#BAE6FD]">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E3F1F9] to-[#BAE6FD]/70 border border-[#7DD3FC] text-[#0088C2] flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(0,136,194,0.22)]"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#0B1F4B]">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#475569] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>

      {/* Body */}
      {!hasTimelineItems ? (
        emptyContent ? <div className="relative">{emptyContent}</div> : null
      ) : (
        <div className="relative space-y-4 py-1">
          <div className="relative pl-7 sm:pl-8 space-y-5 before:content-[''] before:absolute before:left-3 before:top-2.5 before:bottom-3 before:w-1 before:rounded-full before:bg-gradient-to-b before:from-[#0088C2] before:via-[#38BDF8] before:to-[#10B981] before:shadow-[0_0_14px_rgba(0,136,194,0.5)]">
            {steps.map((step, idx) => (
              <RevealBlock key={step.key} animate={animate} delayMs={idx * 90}>
                <div className="relative">
                  {/* Node marker trên timeline */}
                  <div
                    className={`absolute -left-7 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ring-4 ${
                      step.isCurrent
                        ? "bg-[#0088C2] text-white ring-[#BAE6FD] shadow-[0_0_14px_rgba(0,136,194,0.45)]"
                        : "bg-white border-2 border-[#0088C2] text-[#0088C2] ring-white"
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        step.isCurrent ? "bg-white" : "bg-[#0088C2]"
                      }`}
                    />
                  </div>

                  {/* Thẻ nội dung đời chủ */}
                  <div className="rounded-2xl p-4 sm:p-5 border border-[#BAE6FD] bg-white/90 backdrop-blur-md hover:bg-white hover:border-[#0088C2] hover:shadow-[0_6px_24px_rgba(0,136,194,0.14)] transition-all flex flex-col gap-1.5 group">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#0B1F4B] group-hover:text-[#0088C2] transition-colors min-w-0">
                        {step.title}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs shrink-0 whitespace-nowrap ${
                          BADGE_TONE_CLASSES[step.badgeTone]
                        }`}
                      >
                        {step.badgeLabel}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">
                      {step.metaText}
                    </p>

                    {step.txHash && (
                      <div className="pt-0.5">
                        <a
                          href={`https://testnet.snowtrace.io/tx/${step.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] text-xs font-semibold text-[#0088C2] hover:bg-[#0088C2] hover:text-white transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                        >
                          <span>Tra cứu nhanh</span>
                          <svg
                            className="w-3.5 h-3.5 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </a>
                      </div>
                    )}

                    {step.extraContent}
                  </div>
                </div>
              </RevealBlock>
            ))}

            {nextStep && (
              <RevealBlock animate={animate} delayMs={steps.length * 90}>
                <div className="relative">
                  <div
                    className="absolute -left-7 sm:-left-8 top-1 w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-xs ring-4 ring-[#E6F6EE]"
                    aria-hidden="true"
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>

                  <div className="rounded-2xl p-4 sm:p-5 border border-[#A7F3D0] bg-white/95 backdrop-blur-md shadow-xs hover:border-[#34D399] transition-colors flex flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#0B6B3A]">
                        {nextStep.title}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E6F6EE] text-[#0B6B3A] border border-[#B7E4CB] shadow-2xs shrink-0 whitespace-nowrap">
                        {nextStep.badgeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[#334155] leading-relaxed">
                      {nextStep.description}
                    </p>
                  </div>
                </div>
              </RevealBlock>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions && (
        <RevealBlock animate={animate} delayMs={actionsDelayMs}>
          <div className="relative flex flex-wrap items-center gap-3 pt-1">
            {actions}
          </div>
        </RevealBlock>
      )}

      {/* Footer */}
      {footer && (
        <div className="relative pt-3.5 border-t border-[#BAE6FD]/80">
          {footer}
        </div>
      )}
    </div>
  );
}
