"use client";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface Finding {
  matched_case: string;
  classification: "blocker" | "bad" | "기타";
  risk_summary: string;
  quote: string;
  quote_grounded?: boolean;
  case_match_verdict?: string;
}

const CLASSIFICATION_STYLE: Record<string, { emoji: string; badge: string }> = {
  blocker: { emoji: "🔴", badge: "bg-red-600 text-white" },
  bad: { emoji: "🟠", badge: "bg-orange-500 text-white" },
  기타: { emoji: "⚪", badge: "bg-neutral-400 text-white" },
};

const VERDICT_LABEL: Record<string, string> = {
  VALID: "✅ 매칭 타당",
  INVALID: "❓ 매칭 재검토 필요",
  SKIPPED_UNGROUNDED: "⏭️ 검증 스킵(원문 미확인)",
};

interface AnalysisResultsProps {
  siteName: string;
  findings: Finding[] | null;
  meta: { char_count: number; method: string } | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function AnalysisResultsPanel({
  siteName,
  findings,
  meta,
  loading,
  error,
  onClose,
}: AnalysisResultsProps) {
  const counts = findings
    ? findings.reduce(
        (acc, f) => {
          acc[f.classification] = (acc[f.classification] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      )
    : {};
  const groundedCount = findings ? findings.filter((f) => f.quote_grounded).length : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-neutral-400">이용약관 분석 결과</p>
            <h2 className="text-xl font-bold text-neutral-900">{siteName}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {findings && !loading && (
            <div className="space-y-5">
              {meta && (
                <p className="text-sm text-neutral-500">
                  원문 {meta.char_count.toLocaleString()}자 확보 ({meta.method} 방식)
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="치명적(blocker)" value={counts.blocker ?? 0} />
                <StatTile label="위험(bad)" value={counts.bad ?? 0} />
                <StatTile label="기타" value={counts["기타"] ?? 0} />
                <StatTile label="원문 근거 확인" value={`${groundedCount}/${findings.length}`} />
              </div>

              {findings.length === 0 && (
                <Alert>
                  <AlertDescription>탐지된 위험 조항이 없습니다.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {findings.map((f, i) => {
                  const style = CLASSIFICATION_STYLE[f.classification] ?? CLASSIFICATION_STYLE["기타"];
                  const verdictLabel = VERDICT_LABEL[f.case_match_verdict ?? ""] ?? f.case_match_verdict;
                  return (
                    <div key={i} className="rounded-xl border border-neutral-200 p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge className={style.badge}>
                          {style.emoji} {f.classification}
                        </Badge>
                        <span className="text-xs text-neutral-500">
                          매칭 기준: {f.matched_case || "기타"} ·{" "}
                          {f.quote_grounded ? "✅ 원문 확인됨" : "⚠️ 원문 미확인"} · {verdictLabel}
                        </span>
                      </div>
                      <h3 className="mb-2 font-semibold">{f.risk_summary}</h3>
                      <blockquote
                        className={`border-l-2 pl-3 text-sm ${
                          f.quote_grounded
                            ? "border-neutral-300 text-neutral-700"
                            : "border-neutral-200 text-neutral-400 line-through"
                        }`}
                      >
                        {f.quote}
                      </blockquote>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
