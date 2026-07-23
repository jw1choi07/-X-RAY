"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CLASSIFICATION_STYLE, VERDICT_LABEL, type Classification } from "@/lib/classification";
import type { DocumentMetadata } from "@/lib/info-extract";
import { OVERALL_RISK_STYLE, overallRiskFromFindings } from "@/lib/user-prefs";
import { AlertTriangle, Check, CheckCircle2, Copy, ShieldCheck, X } from "lucide-react";
import { TermsUpdatedBadge } from "@/components/terms-updated-badge";
import { getTermsUpdateInfo } from "@/lib/terms-update";

export interface Finding {
  matched_case: string;
  classification: Classification;
  risk_summary: string;
  quote: string;
  quote_grounded?: boolean;
  case_match_verdict?: string;
  groundedness_verdict?: "grounded" | "notGrounded" | "notSure";
}

export type PanelLocale = "ko" | "ja";

interface AnalysisResultsProps {
  siteName: string;
  findings: Finding[] | null;
  meta: { char_count: number; method: string; metadata?: DocumentMetadata | null } | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  /** UI chrome language -- defaults to Korean so every existing call site is
      unaffected. "ja" is used by /jp (see src/app/jp/page.tsx), the Japan
      localization proof-of-concept: same component, same data shape, only
      the fixed UI strings below change. */
  locale?: PanelLocale;
}

// Everything the panel's own chrome says, independent of AI-generated
// content (risk_summary/quote come back pre-translated from the pipeline
// itself via the `locale` param in solar.ts -- this dict only covers the
// static labels around them).
const STRINGS: Record<PanelLocale, {
  reportLabel: string;
  close: string;
  overallResult: string;
  charAnalyzed: (n: string) => string;
  groundedConfirmed: (n: number, total: number) => string;
  riskLine: (label: string, score: number) => string;
  riskLevel: { high: string; mid: string; low: string };
  classLabel: { blocker: string; bad: string; other: string };
  metadataTitle: string;
  metadataLabels: Record<keyof DocumentMetadata, string>;
  recentUpdate: string;
  noFindings: string;
  grounded: string;
  notGrounded: string;
  verdict: Record<string, string>;
  copy: string;
  copied: string;
  footer: string;
  loadingSteps: string[];
}> = {
  ko: {
    reportLabel: "판독 보고서 · Reading Report",
    close: "닫기",
    overallResult: "종합 판독 결과",
    charAnalyzed: (n) => `원문 ${n}자 분석 · `,
    groundedConfirmed: (n, total) => `원문 근거 확인 ${n}/${total}`,
    riskLine: (label, score) => `위험도 ${label} · ${score}`,
    riskLevel: { high: "높음", mid: "보통", low: "낮음" },
    classLabel: { blocker: "치명적", bad: "위험", other: "기타" },
    metadataTitle: "한눈에 보기 · Extracted Metadata",
    metadataLabels: {
      effective_date: "시행일자",
      company_name: "사업자명",
      data_retention_period: "개인정보 보관기간",
      contact: "문의처",
      jurisdiction: "관할 법원",
    },
    recentUpdate: " · 최근 갱신",
    noFindings: "탐지된 위험 조항이 없습니다.",
    grounded: "원문 확인됨",
    notGrounded: "원문 미확인",
    verdict: { VALID: "매칭 타당", INVALID: "매칭 재검토 필요", SKIPPED_UNGROUNDED: "검증 스킵(원문 미확인)" },
    copy: "복사",
    copied: "복사됨",
    footer: "판단 기준: ToS;DR(tosdr.org) bad/blocker 케이스 79종 기반 · 모든 인용문은 원문 대조 검증을 거칩니다",
    loadingSteps: [
      "약관 원문을 확보하는 중",
      "위험 조항 79종 기준과 대조하는 중",
      "인용문을 원문과 대조 검증하는 중",
    ],
  },
  ja: {
    reportLabel: "判読レポート · Reading Report",
    close: "閉じる",
    overallResult: "総合判読結果",
    charAnalyzed: (n) => `原文 ${n}字分析 · `,
    groundedConfirmed: (n, total) => `原文根拠確認 ${n}/${total}`,
    riskLine: (label, score) => `リスク ${label} · ${score}`,
    riskLevel: { high: "高", mid: "中", low: "低" },
    classLabel: { blocker: "致命的", bad: "危険", other: "その他" },
    metadataTitle: "ひと目で見る · Extracted Metadata",
    metadataLabels: {
      effective_date: "施行日",
      company_name: "事業者名",
      data_retention_period: "個人情報保管期間",
      contact: "問い合わせ先",
      jurisdiction: "管轄裁判所",
    },
    recentUpdate: " · 最近更新",
    noFindings: "検出されたリスク条項はありません。",
    grounded: "原文確認済み",
    notGrounded: "原文未確認",
    verdict: { VALID: "マッチング妥当", INVALID: "マッチング要再検討", SKIPPED_UNGROUNDED: "検証スキップ(原文未確認)" },
    copy: "コピー",
    copied: "コピー済み",
    footer: "判定基準: ToS;DR(tosdr.org) bad/blockerケース79種に基づく · すべての引用文は原文照合検証を経ています",
    loadingSteps: [
      "利用規約原文を確保中",
      "リスク条項79種基準と照合中",
      "引用文を原文と照合検証中",
    ],
  },
};

export function AnalysisResultsPanel({
  siteName,
  findings,
  meta,
  loading,
  error,
  onClose,
  locale = "ko",
}: AnalysisResultsProps) {
  const t = STRINGS[locale];
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

  const RISK_LABEL_TEXT: Record<string, string> = {
    높음: t.riskLevel.high,
    보통: t.riskLevel.mid,
    낮음: t.riskLevel.low,
  };

  const overallRisk = findings
    ? (() => {
        const computed = overallRiskFromFindings(findings);
        return {
          ...computed,
          ...OVERALL_RISK_STYLE[computed.riskLabel],
          displayLabel: RISK_LABEL_TEXT[computed.riskLabel] ?? computed.riskLabel,
        };
      })()
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
              {t.reportLabel}
            </p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
              {siteName}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t.close}
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && <LoadingState steps={t.loadingSteps} />}

          {error && !loading && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {findings && !loading && (
            <div className="space-y-6">
              <TermsUpdatedBadge
                variant="banner"
                effectiveDate={meta?.metadata?.effective_date}
              />

              {overallRisk && (
                <div className={`flex items-center gap-4 rounded-md border p-4 ${overallRisk.bg}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                      {t.overallResult}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {meta && t.charAnalyzed(meta.char_count.toLocaleString())}
                      {t.groundedConfirmed(groundedCount, findings.length)}
                    </p>
                    <p className={`mt-2 font-mono text-sm font-semibold ${overallRisk.color}`}>
                      {t.riskLine(overallRisk.displayLabel, overallRisk.riskScore)}
                    </p>
                  </div>
                  {/* read stamp — the way a radiology report ends with a rubber-stamped
                      verdict, not a colored icon; the rotation reads as physically applied */}
                  <div
                    className={`relative flex h-16 w-16 shrink-0 -rotate-6 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-current ${overallRisk.color}`}
                  >
                    <div className="absolute inset-1 rounded-full border border-dashed border-current opacity-50" />
                    {overallRisk.riskLabel === "낮음" ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span className="font-mono text-[10px] font-black tracking-tight">{overallRisk.displayLabel}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <StatTile label={t.classLabel.blocker} value={blockerCount} accent="text-risk-blocker" />
                <StatTile label={t.classLabel.bad} value={badCount} accent="text-risk-bad" />
                <StatTile label={t.classLabel.other} value={counts["기타"] ?? 0} accent="text-muted-foreground" />
              </div>

              {meta?.metadata && <MetadataCard metadata={meta.metadata} t={t} />}

              {findings.length === 0 && (
                <Alert>
                  <AlertDescription>{t.noFindings}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {findings.map((f, i) => (
                  <FindingCard key={i} finding={f} index={i} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-3">
          <p className="text-center font-mono text-[10px] text-muted-foreground/70">
            {t.footer}
          </p>
        </div>
      </div>
    </div>
  );
}

type Strings = (typeof STRINGS)[PanelLocale];

function FindingCard({ finding: f, index, t }: { finding: Finding; index: number; t: Strings }) {
  const [copied, setCopied] = useState(false);
  const style = CLASSIFICATION_STYLE[f.classification] ?? CLASSIFICATION_STYLE["기타"];
  const Icon = style.icon;
  const classLabel =
    f.classification === "blocker" ? t.classLabel.blocker : f.classification === "bad" ? t.classLabel.bad : t.classLabel.other;
  const verdictLabel = t.verdict[f.case_match_verdict ?? ""] ?? VERDICT_LABEL[f.case_match_verdict ?? ""] ?? f.case_match_verdict;

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
            {classLabel}
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
              {f.quote_grounded ? t.grounded : t.notGrounded}
            </span>
            <span>{verdictLabel}</span>
          </div>
          <button
            onClick={copyQuote}
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> {t.copied}
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> {t.copy}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetadataCard({ metadata, t }: { metadata: DocumentMetadata; t: Strings }) {
  const entries = (Object.keys(t.metadataLabels) as (keyof DocumentMetadata)[])
    .map((key) => ({ key, label: t.metadataLabels[key], value: metadata[key]?.trim() }))
    .filter((entry) => entry.value);

  if (entries.length === 0) return null;

  const updateInfo = getTermsUpdateInfo(metadata.effective_date);

  return (
    <div className="rounded-md border border-border p-4">
      <p className="mb-2.5 font-mono text-[11px] tracking-[0.1em] text-scan uppercase">
        {t.metadataTitle}
      </p>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {entries.map(({ key, label, value }) => (
          <div key={key} className="min-w-0">
            <dt className="font-mono text-[10px] text-muted-foreground/80">
              {label}
              {key === "effective_date" && updateInfo?.isRecent ? t.recentUpdate : ""}
            </dt>
            <dd
              className={`truncate text-[13px] ${
                key === "effective_date" && updateInfo?.isRecent ? "font-semibold text-risk-bad" : "text-foreground"
              }`}
              title={value}
            >
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

function LoadingState({ steps }: { steps: string[] }) {
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
          {steps.map((step, i) => (
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
