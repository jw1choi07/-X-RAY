"use client";

import { useEffect, useRef, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { SiteHeader } from "@/components/site-header";
import { FloatingSitesSection } from "@/components/floating-sites-section";
import { SearchSection } from "@/components/search-section";
import { LinkSection } from "@/components/link-section";
import { AnalysisResultsPanel, type Finding } from "@/components/analysis-results";
import type { FeaturedSite } from "@/lib/featured-sites";
import type { Preset } from "@/lib/presets";
import type { DocumentMetadata } from "@/lib/info-extract";

const SECTION_COUNT = 3;

export default function Home() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [meta, setMeta] = useState<{ char_count: number; method: string; metadata?: DocumentMetadata | null } | null>(null);
  const [activeSiteName, setActiveSiteName] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const analyzeSeqRef = useRef(0);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => setPresets(d.presets ?? []))
      .catch(() => setPresets([]));
  }, []);

  async function runAnalyze(body: Record<string, string>, siteName: string) {
    const seq = ++analyzeSeqRef.current;
    setLoading(true);
    setError(null);
    setFindings(null);
    setMeta(null);
    setActiveSiteName(siteName);
    setShowResults(true);
    sendGAEvent("event", "analyze_start", { site_name: siteName, source: body.presetFile ? "preset" : "url" });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (seq !== analyzeSeqRef.current) return;
      if (!res.ok) throw new Error(data.error ?? "분석 중 오류가 발생했습니다.");
      setFindings(data.findings);
      setMeta(data.meta);
      sendGAEvent("event", "analyze_success", {
        site_name: siteName,
        doc_type: data.meta?.method ?? "unknown",
        finding_count: data.findings?.length ?? 0,
      });
    } catch (e) {
      if (seq !== analyzeSeqRef.current) return;
      setError((e as Error).message);
      sendGAEvent("event", "analyze_error", { site_name: siteName, message: (e as Error).message });
    } finally {
      if (seq === analyzeSeqRef.current) setLoading(false);
    }
  }

  function handleFeaturedSelect(site: FeaturedSite) {
    runAnalyze({ presetFile: site.presetFile }, site.name);
  }

  function handleSearchResult(preset: Preset, siteName: string) {
    runAnalyze({ presetFile: preset.file }, siteName);
  }

  function handleUrlAnalyze(url: string) {
    try {
      const hostname = new URL(url).hostname.replace("www.", "");
      runAnalyze({ url }, hostname);
    } catch {
      runAnalyze({ url }, "직접 입력");
    }
  }

  function closeResults() {
    setShowResults(false);
    setActiveSiteName(null);
    setFindings(null);
    setMeta(null);
    setError(null);
  }

  function scrollToSection(index: number) {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTo({ top: index * el.clientHeight, behavior: "smooth" });
  }

  return (
    <>
      <SiteHeader />

      <nav className="fixed top-1/2 right-5 z-50 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        {Array.from({ length: SECTION_COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`섹션 ${i + 1}로 이동`}
            onClick={() => scrollToSection(i)}
            className={`h-2 w-2 rounded-full transition-all ${
              activeSection === i
                ? "h-6 bg-foreground"
                : "bg-border hover:bg-muted-foreground/40"
            }`}
          />
        ))}
      </nav>

      <main
        ref={mainRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActiveSection(Math.round(el.scrollTop / el.clientHeight));
        }}
        className="h-screen snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      >
        <FloatingSitesSection onSelectSite={handleFeaturedSelect} />
        <SearchSection presets={presets} onSearchResult={handleSearchResult} />
        <LinkSection loading={loading} onAnalyze={handleUrlAnalyze} />
      </main>

      {showResults && activeSiteName && (
        <AnalysisResultsPanel
          siteName={activeSiteName}
          findings={findings}
          meta={meta}
          loading={loading}
          error={error}
          onClose={closeResults}
        />
      )}
    </>
  );
}
