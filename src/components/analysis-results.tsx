"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CLASSIFICATION_STYLE, VERDICT_LABEL, type Classification } from "@/lib/classification";
import type { DocumentMetadata } from "@/lib/info-extract";
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
  meta: { char_count: number; method: string; metadata?: DocumentMetadata | null } | null;
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-8 duration-300 sm:rounded-lg"
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="font-mono text-[11px] tracking-[0.12em] text-scan uppercase">
              판독 보고서 · Reading Report
            </p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
              {siteName}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
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
                <div className={`flex items-center gap-4 rounded-md border p-4 ${overallRisk.bg}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                      종합 판독 결과
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {meta && `원문 ${meta.char_count.toLocaleString()}자 분석 · `}
                      원문 근거 확인 {groundedCount}/{findings.length}
                    </p>
                  </div>
                  {/* read stamp — the way a radiology report ends with a rubber-stamped
                      verdict, not a colored icon; the rotation reads as physically applied */}
                  <div
                    className={`relative flex h-16 w-16 shrink-0 -rotate-6 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-current ${overallRisk.color}`}
                  >
                    <div className="absolute inset-1 rounded-full border border-dashed border-current opacity-50" />
                    {overallRisk.level === "낮음" ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span className="font-mono text-[10px] font-black tracking-tight">{overallRisk.level}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <StatTile label="치명적" value={blockerCount} accent="text-risk-blocker" />
                <StatTile label="위험" value={badCount} accent="text-risk-bad" />
                <StatTile label="기타" value={counts["기타"] ?? 0} accent="text-muted-foreground" />
              </div>

              {meta?.metadata && <MetadataCard metadata={meta.metadata} />}

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

        <div className="border-t border-border px-6 py-3">
          <p className="text-center font-mono text-[10px] text-muted-foreground/70">
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
      sendGAEvent("event", "finding_quote_copy", {
        matched_case: f.matched_case || "기타",
        classification: f.classification,
      });
    } catch {
      // clipboard unavailable — ignore silently
    }
  }

  return (
    <div
      className="group relative flex overflow-hidden rounded-md border border-border transition-colors hover:border-scan/40 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: "backwards" }}
    >
      {/* classification bar — the first thing your eye should register scanning down the report,
          before reading a word, same job as a colored tab on a physical case file */}
      <div className={`w-1 shrink-0 ${style.bar}`} aria-hidden />

      <div className="min-w-0 flex-1 p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <Badge className={`gap-1 ${style.badge}`}>
            <Icon className="h-3 w-3" />
            {style.label}
          </Badge>
          <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium ${style.chip}`}>
            {f.matched_case || "기타"}
          </span>
        </div>

        <h3 className="mb-2 text-sm leading-snug font-semibold text-foreground">
          {f.risk_summary}
        </h3>

        <div className="relative rounded-sm bg-muted px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
          &ldquo;
          {f.quote_grounded ? <mark className="confirmed">{f.quote}</mark> : <span className="redacted">{f.quote}</span>}
          &rdquo;
        </div>

        <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground/80">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              {f.quote_grounded ? (
                <CheckCircle2 className="h-3 w-3 text-risk-ok" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-muted-foreground" />
              )}
              {f.quote_grounded ? "원문 확인됨" : "원문 미확인"}
            </span>
            <span>{verdictLabel}</span>
          </div>
          <button
            onClick={copyQuote}
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
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
    </div>
  );
}

const METADATA_LABELS: Record<keyof DocumentMetadata, string> = {
  effective_date: "시행일자",
  company_name: "사업자명",
  data_retention_period: "개인정보 보관기간",
  contact: "문의처",
  jurisdiction: "관할 법원",
};

function MetadataCard({ metadata }: { metadata: DocumentMetadata }) {
  const entries = (Object.keys(METADATA_LABELS) as (keyof DocumentMetadata)[])
    .map((key) => ({ key, label: METADATA_LABELS[key], value: metadata[key]?.trim() }))
    .filter((entry) => entry.value);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-md border border-border p-4">
      <p className="mb-2.5 font-mono text-[11px] tracking-[0.1em] text-scan uppercase">
        한눈에 보기 · Extracted Metadata
      </p>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {entries.map(({ key, label, value }) => (
          <div key={key} className="min-w-0">
            <dt className="font-mono text-[10px] text-muted-foreground/80">{label}</dt>
            <dd className="truncate text-[13px] text-foreground" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-center">
      <div className={`font-mono text-xl font-bold ${accent}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-ping rounded-full bg-scan/30" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-scan/10">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-scan border-t-transparent" />
          </div>
        </div>
        <ol className="space-y-1 font-mono text-xs text-muted-foreground">
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
