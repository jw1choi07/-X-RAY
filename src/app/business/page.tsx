"use client";

import { useState } from "react";
import Link from "next/link";
import { sendGAEvent } from "@next/third-parties/google";
import { FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { AnalysisResultsPanel, type Finding } from "@/components/analysis-results";
import type { DocumentMetadata } from "@/lib/info-extract";

const MIN_CHARS = 200;

const SELLING_POINTS = [
  {
    icon: FileSearch,
    title: "출시 전 셀프 점검",
    body: "법무 검토에 들어가기 전, ToS;DR 국제 기준 79종에 비춰 이용자에게 불리하게 읽힐 수 있는 조항을 AI가 먼저 짚어드립니다.",
  },
  {
    icon: ShieldCheck,
    title: "원문 근거 그대로",
    body: "모든 지적 사항은 초안 원문에서 그대로 인용됩니다. 짐작이 아니라 실제로 어느 문장이 문제인지 바로 확인할 수 있어요.",
  },
  {
    icon: Sparkles,
    title: "동일한 판독 엔진",
    body: "148개 주요 서비스를 분석하는 것과 같은 Upstage Solar 파이프라인을 그대로 사용합니다.",
  },
];

export default function BusinessPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [meta, setMeta] = useState<{ char_count: number; method: string; metadata?: DocumentMetadata | null } | null>(null);
  const [showResults, setShowResults] = useState(false);

  async function handleAnalyze() {
    if (text.trim().length < MIN_CHARS) return;
    setLoading(true);
    setError(null);
    setFindings(null);
    setMeta(null);
    setShowResults(true);
    sendGAEvent("event", "business_analyze_start", { char_count: text.length });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 중 오류가 발생했습니다.");
      setFindings(data.findings);
      setMeta(data.meta);
      sendGAEvent("event", "business_analyze_success", { finding_count: data.findings?.length ?? 0 });
    } catch (e) {
      setError((e as Error).message);
      sendGAEvent("event", "business_analyze_error", { message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-24 pb-20 md:px-10">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          ← 홈으로
        </Link>

        <div className="mt-6">
          <p className="font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
            For Business
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            우리 서비스 약관, 공개 전에 점검하세요
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            작성 중인 이용약관·개인정보처리방침 초안을 붙여넣으면, 법무 검토에 들어가기 전
            AI가 이용자에게 불리하게 읽힐 수 있는 조항을 원문 근거와 함께 1차로 짚어드립니다.
          </p>
        </div>

        <section className="mt-8 rounded-md border border-border bg-muted/60 p-6 md:p-8">
          <label htmlFor="draft" className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            약관 초안 붙여넣기
          </label>
          <textarea
            id="draft"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="이용약관 또는 개인정보처리방침 초안 전문을 붙여넣어주세요"
            className="mt-2 w-full resize-y rounded-md border border-border bg-card p-4 text-sm leading-relaxed text-foreground shadow-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-scan/40"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              {text.length.toLocaleString()}자
              {text.trim().length > 0 && text.trim().length < MIN_CHARS && ` · 최소 ${MIN_CHARS}자 필요`}
            </p>
            <Button
              type="button"
              className="rounded-md"
              disabled={loading || text.trim().length < MIN_CHARS}
              onClick={handleAnalyze}
            >
              {loading ? "분석 중…" : "점검하기"}
            </Button>
          </div>
        </section>

        <section className="mt-12 grid gap-5 sm:grid-cols-3">
          {SELLING_POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-md border border-border p-5">
              <Icon className="h-5 w-5 text-scan" />
              <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 font-mono text-[10px] tracking-wide text-muted-foreground/70">
          * 본 점검은 법률 자문을 대체하지 않습니다. 최종 공개 전에는 반드시 법무 검토를 거치세요.
        </p>
      </main>

      {showResults && (
        <AnalysisResultsPanel
          siteName="우리 서비스 약관 (초안)"
          findings={findings}
          meta={meta}
          loading={loading}
          error={error}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  );
}
