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
          ← ホームへ
        </Link>

        <div className="mt-6">
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
            <Globe2 className="h-3.5 w-3.5" /> Localization Proof of Concept — 日本
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            同じエンジン、日本版
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            148の韓国サービスに使っているものと同じ判読エンジン（Solar Pro 2 + ToS;DR 79種基準 + 原文span
            アンカリング + マッチング検証）で、日本のローカルサービス4社の実際のプライバシーポリシーを分析しました。
            結果の要約は<strong className="text-foreground">日本語で直接生成</strong>されます — 翻訳ではなく、
            パイプライン自体が多言語に対応できることの証拠です。
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
          * 実際にクロールした日本国内向け正式なプライバシーポリシー原文に基づく分析です。デモ用の小規模な
          証拠であり、148のプリセットのような全面的なローカライゼーションが完了した状態ではありません。
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
          locale="ja"
        />
      )}
    </>
  );
}
