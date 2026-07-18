"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CLASSIFICATION_STYLE, VERDICT_LABEL, type Classification } from "@/lib/classification";
import { AlertTriangle, Check, CheckCircle2, Copy, ShieldCheck, X } from "lucide-react";

export interface Finding {
  matched_case: string;
  classification: Classification;
  risk_summary: string;
  quote: string;
  quote_grounded?: boolean;
  case_match_verdict?: string;
  groundedness_verdict?: "grounded" | "notGrounded" | "notSure";
}

interface AnalysisResultsProps {
  siteName: string;
  findings: Finding[] | null;
  meta: { char_count: number; method: string } | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const LOADING_STEPS = [
  "약관 원문을 확보하는 중",
  "위험 조항 79종 기준과 대조하는 중",
  "인용문을 원문과 대조 검증하는 중",
];

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
  const blockerCount = counts.blocker ?? 0;
  const badCount = counts.bad ?? 0;

  const overallRisk = findings
    ? blockerCount > 0
      ? { level: "높음", color: "text-red-600 dark:text-red-400", ring: "ring-red-500/20", bg: "bg-red-50 dark:bg-red-950/30" }
      : badCount > 0
        ? { level: "보통", color: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/20", bg: "bg-orange-50 dark:bg-orange-950/30" }
        : { level: "낮음", color: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20", bg: "bg-emerald-50 dark:bg-emerald-950/30" }
    : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-900/50 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300 sm:rounded-3xl dark:bg-neutral-900 dark:ring-white/10"
      >
        <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5 dark:border-neutral-800">
          <div>
            <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              이용약관 분석 결과
            </p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {siteName}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && <LoadingState />}

          {error && !loading && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {findings && !loading && (
            <div className="space-y-6">
              {overallRisk && (
                <div className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${overallRisk.bg} ${overallRisk.ring}`}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-neutral-900">
                    {overallRisk.level === "낮음" ? (
                      <ShieldCheck className={`h-5 w-5 ${overallRisk.color}`} />
                    ) : (
                      <AlertTriangle className={`h-5 w-5 ${overallRisk.color}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${overallRisk.color}`}>종합 위험도 · {overallRisk.level}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {meta && `원문 ${meta.char_count.toLocaleString()}자 분석 · `}
                      원문 근거 확인 {groundedCount}/{findings.length}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <StatTile label="치명적" value={blockerCount} accent="text-red-600 dark:text-red-400" />
                <StatTile label="위험" value={badCount} accent="text-orange-600 dark:text-orange-400" />
                <StatTile label="기타" value={counts["기타"] ?? 0} accent="text-neutral-500 dark:text-neutral-400" />
              </div>

              {findings.length === 0 && (
                <Alert>
                  <AlertDescription>탐지된 위험 조항이 없습니다.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {findings.map((f, i) => (
                  <FindingCard key={i} finding={f} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 px-6 py-3 dark:border-neutral-800">
          <p className="text-center text-[11px] text-neutral-400">
            판단 기준: ToS;DR(tosdr.org) bad/blocker 케이스 79종 기반 · 모든 인용문은 원문 대조 검증을 거칩니다
          </p>
        </div>
      </div>
    </div>
  );
}

function FindingCard({ finding: f, index }: { finding: Finding; index: number }) {
  const [copied, setCopied] = useState(false);
  const style = CLASSIFICATION_STYLE[f.classification] ?? CLASSIFICATION_STYLE["기타"];
  const Icon = style.icon;
  const verdictLabel = VERDICT_LABEL[f.case_match_verdict ?? ""] ?? f.case_match_verdict;

  async function copyQuote() {
    try {
      await navigator.clipboard.writeText(f.quote);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore silently
    }
  }

  return (
    <div
      className="group rounded-2xl border border-neutral-200 p-4 transition-colors hover:border-neutral-300 animate-in fade-in slide-in-from-bottom-2 dark:border-neutral-800 dark:hover:border-neutral-700"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: "backwards" }}
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <Badge className={`gap-1 ${style.badge}`}>
          <Icon className="h-3 w-3" />
          {style.label}
        </Badge>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.chip}`}>
          {f.matched_case || "기타"}
        </span>
      </div>

      <h3 className="mb-2 text-sm leading-snug font-semibold text-neutral-900 dark:text-neutral-100">
        {f.risk_summary}
      </h3>

      <div
        className={`relative rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
          f.quote_grounded
            ? "bg-neutral-50 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300"
            : "bg-neutral-50/50 text-neutral-400 line-through dark:bg-neutral-800/30"
        }`}
      >
        &ldquo;{f.quote}&rdquo;
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1">
            {f.quote_grounded ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-neutral-400" />
            )}
            {f.quote_grounded ? "원문 확인됨" : "원문 미확인"}
          </span>
          <span>{verdictLabel}</span>
        </div>
        <button
          onClick={copyQuote}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> 복사됨
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> 복사
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-center dark:border-neutral-800 dark:bg-neutral-800/30">
      <div className={`text-xl font-bold ${accent}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/30" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        </div>
        <ol className="space-y-1 text-xs text-neutral-400">
          {LOADING_STEPS.map((step, i) => (
            <li key={step} style={{ animationDelay: `${i * 1.2}s` }} className="animate-in fade-in">
              {step}...
            </li>
          ))}
        </ol>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2.5">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
