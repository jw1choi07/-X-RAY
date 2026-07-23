"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { ChevronDown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { FEATURED_SITES, type FeaturedSite } from "@/lib/featured-sites";
import { TermsUpdatedBadge } from "@/components/terms-updated-badge";
import type { TermsUpdateEntry } from "@/lib/terms-update";

const RISK_TONE: Record<FeaturedSite["riskLabel"], string> = {
  위험: "text-risk-blocker",
  주의: "text-risk-bad",
  보통: "text-risk-ok",
};

interface FloatingSitesSectionProps {
  onSelectSite: (site: FeaturedSite) => void;
}

export function FloatingSitesSection({ onSelectSite }: FloatingSitesSectionProps) {
  const [updates, setUpdates] = useState<Record<string, TermsUpdateEntry>>({});

  useEffect(() => {
    fetch("/api/terms-updates")
      .then((r) => r.json())
      .then((d) => setUpdates(d.updates ?? {}))
      .catch(() => setUpdates({}));
  }, []);

  return (
    <section className="section-hero relative flex min-h-[100svh] snap-start flex-col items-center justify-center overflow-hidden px-5 pt-16 pb-6 md:px-8">
      <div className="scan-rail hidden md:block" aria-hidden />

      <div className="pointer-events-none absolute inset-y-0 left-2 hidden flex-col justify-evenly py-16 md:flex">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-[1px] border border-border/80 bg-muted" />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2 hidden flex-col justify-evenly py-16 md:flex">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-[1px] border border-border/80 bg-muted" />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="max-w-xl text-left">
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
              Upstage Solar 판독 시스템
            </div>
            <h2 className="text-3xl leading-[1.12] font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem]">
              <span className="scan-reveal">약관, 읽지 않고도</span>
              <br />
              위험한 조항만 골라보세요
            </h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-[15px]">
              이미 분석된 주요 서비스 · 카드를 선택하면 판독 결과를 확인할 수 있어요
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:max-w-xs md:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3 w-3 text-foreground" />
              원문 근거 검증
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground shadow-sm">
              <Zap className="h-3 w-3 text-foreground" />
              위험 조항 우선
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground shadow-sm">
              <Sparkles className="h-3 w-3 text-foreground" />
              ToS;DR 79종
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="hero-glow" aria-hidden />

          <div className="relative grid grid-cols-2 gap-2.5 sm:gap-3 md:hidden">
            {FEATURED_SITES.map((site) => (
              <FloatingCard
                key={site.id}
                site={site}
                onSelect={onSelectSite}
                className="floating-card"
                style={{ animationDelay: `${site.floatDelay}s` }}
                effectiveDate={updates[site.presetFile]?.effectiveDate}
              />
            ))}
          </div>

          <div className="relative hidden h-[340px] rounded-2xl border border-border/70 bg-card/40 p-3 shadow-sm backdrop-blur-[2px] md:block lg:h-[380px]">
            {FEATURED_SITES.map((site) => (
              <FloatingCard
                key={site.id}
                site={site}
                onSelect={onSelectSite}
                className="floating-card absolute w-48 lg:w-52"
                style={{
                  top: site.floatPosition.top,
                  left: site.floatPosition.left,
                  animationDelay: `${site.floatDelay}s`,
                }}
                effectiveDate={updates[site.presetFile]?.effectiveDate}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-col items-center gap-0.5 text-muted-foreground/80">
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase">스크롤해서 더보기</span>
        <ChevronDown className="h-4 w-4 animate-bounce" />
      </div>
    </section>
  );
}

function FloatingCard({
  site,
  onSelect,
  className = "",
  style,
  effectiveDate,
}: {
  site: FeaturedSite;
  onSelect: (site: FeaturedSite) => void;
  className?: string;
  style?: CSSProperties;
  effectiveDate?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(site)}
      className={`group cursor-pointer rounded-2xl border border-white/10 bg-[#18181b] p-3.5 text-left transition-[transform,filter] duration-300 hover:scale-[1.03] hover:brightness-110 ${className}`}
      style={style}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <BrandMark site={site} />
        <div className="flex flex-col items-end gap-1">
          <span className={`font-mono text-[10px] font-semibold tracking-wide uppercase ${RISK_TONE[site.riskLabel]}`}>
            {site.riskLabel}
          </span>
          <TermsUpdatedBadge effectiveDate={effectiveDate} />
        </div>
      </div>
      <p className="font-semibold text-[#fafafa]">{site.name}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#a1a1aa]">{site.summary}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              site.riskLabel === "위험" ? "bg-risk-blocker" : site.riskLabel === "주의" ? "bg-risk-bad" : "bg-risk-ok"
            }`}
            style={{ width: `${site.riskScore}%` }}
          />
        </div>
        <span className="font-mono text-xs font-semibold text-[#fafafa]">{site.riskScore}</span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] tracking-wide text-[#d4d4d8] uppercase md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
        판독지 보기 →
      </p>
    </button>
  );
}

function BrandMark({ site }: { site: FeaturedSite }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-base">
      {failed ? (
        site.emoji
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- tiny static favicon, not worth next/image's overhead
        <img
          src={`/logos/${site.id}.ico`}
          alt={`${site.name} 로고`}
          className="h-4 w-4 object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
