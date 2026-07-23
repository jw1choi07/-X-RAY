"use client";

import { useState } from "react";
import Link from "next/link";
import { sendGAEvent } from "@next/third-parties/google";
import { Globe2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AnalysisResultsPanel, type Finding } from "@/components/analysis-results";

// Japan-localization proof of concept: same engine (Solar Pro 2 + the 79
// ToS;DR cases + span-anchored citation + judge verification) as the 148
// Korean presets, just pointed at real Japanese services with risk_summary
// output in Japanese (see `locale` param in solar.ts/agent.ts/analyze.ts).
// Results are precomputed (scripts/precompute-jp-findings.ts) since this is
// a small fixed demo set, not a general intake form.
const SERVICES = [
  { slug: "line", name: "LINE", logo: "/logos-jp/line.png", note: "メッセージング・スーパーアプリ" },
  { slug: "paypay", name: "PayPay", logo: "/logos-jp/paypay.png", note: "QRコード決済" },
  { slug: "rakuten", name: "楽天 (Rakuten)", logo: "/logos-jp/rakuten.ico", note: "EC・共通ID基盤" },
  { slug: "mercari", name: "メルカリ (Mercari)", logo: "/logos-jp/mercari.ico", note: "フリマアプリ" },
] as const;

export default function JapanPage() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [meta, setMeta] = useState<{ char_count: number; method: string } | null>(null);
  const [showResults, setShowResults] = useState(false);

  async function handleSelect(slug: string, name: string) {
    setActiveSlug(name);
    setLoading(true);
    setError(null);
    setFindings(null);
    setMeta(null);
    setShowResults(true);
    sendGAEvent("event", "jp_demo_analyze", { service: slug });

    try {
      const res = await fetch(`/api/jp-analyze?slug=${slug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "分析中にエラーが発生しました。");
      setFindings(data.findings);
      setMeta(data.meta);
    } catch (e) {
      setError((e as Error).message);
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
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
            <Globe2 className="h-3.5 w-3.5" /> Localization Proof of Concept — 日本
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            같은 엔진, 일본 버전
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            153개 한국 서비스에 쓰는 것과 동일한 판독 엔진(Solar Pro 2 + ToS;DR 79종 기준 + 원문 span 앵커링
            + 매칭 검증)으로, 일본 로컬 서비스 4곳의 실제 개인정보처리방침을 분석했습니다. 결과 요약은
            <strong className="text-foreground"> 일본어로 직접 생성</strong>됩니다 — 번역이 아니라 파이프라인
            자체가 다국어를 다룰 수 있다는 증거입니다.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {SERVICES.map((svc) => (
            <button
              key={svc.slug}
              type="button"
              onClick={() => handleSelect(svc.slug, svc.name)}
              className="group flex items-center gap-3 rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-scan/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static favicon */}
              <img src={svc.logo} alt="" className="h-8 w-8 shrink-0 rounded-sm object-contain" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{svc.name}</p>
                <p className="text-xs text-muted-foreground">{svc.note}</p>
              </div>
              <span className="ml-auto font-mono text-[10px] tracking-wide text-scan uppercase opacity-0 transition-opacity group-hover:opacity-100">
                分析 →
              </span>
            </button>
          ))}
        </div>

        <p className="mt-8 font-mono text-[10px] tracking-wide text-muted-foreground/70">
          * 실제 크롤링된 일본 국내용 정식 개인정보처리방침 원문 기준 분석입니다. 데모용 소규모 증거이며,
          148개 프리셋처럼 전체 로컬라이제이션이 완료된 상태는 아닙니다.
        </p>
      </main>

      {showResults && activeSlug && (
        <AnalysisResultsPanel
          siteName={activeSlug}
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
