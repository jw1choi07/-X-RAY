"use client";

import { RefreshCw } from "lucide-react";
import { getTermsUpdateInfo, TERMS_UPDATE_WINDOW_DAYS } from "@/lib/terms-update";
import { cn } from "@/lib/utils";

type TermsUpdatedBadgeProps = {
  effectiveDate?: string | null;
  className?: string;
  /** compact: 카드용 작은 칩 / banner: 상세 화면용 */
  variant?: "compact" | "banner";
};

export function TermsUpdatedBadge({
  effectiveDate,
  className,
  variant = "compact",
}: TermsUpdatedBadgeProps) {
  const info = getTermsUpdateInfo(effectiveDate);
  if (!info?.isRecent) return null;

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border border-scan/40 bg-scan/10 px-4 py-3 text-sm text-foreground",
          className,
        )}
        role="status"
      >
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-scan" />
        <div>
          <p className="font-semibold text-scan">약관이 최근 갱신되었습니다</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            시행·개정일 {info.effectiveDate} · {info.label} (최근 {TERMS_UPDATE_WINDOW_DAYS}일 이내)
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-scan/40 bg-scan/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-scan uppercase",
        className,
      )}
      title={`약관 시행·개정일 ${info.effectiveDate}`}
    >
      <RefreshCw className="h-3 w-3" />
      약관 갱신
    </span>
  );
}
