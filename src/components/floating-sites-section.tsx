"use client";

import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { FEATURED_SITES, type FeaturedSite } from "@/lib/featured-sites";

const RISK_TONE: Record<FeaturedSite["riskLabel"], string> = {
  위험: "text-risk-blocker",
  주의: "text-risk-bad",
  보통: "text-risk-ok",
};

interface FloatingSitesSectionProps {
  onSelectSite: (site: FeaturedSite) => void;
}

export function FloatingSitesSection({ onSelectSite }: FloatingSitesSectionProps) {
  return (
    <section className="relative flex min-h-screen snap-start flex-col items-center justify-center overflow-hidden px-6">
      {/* film-edge sprocket marks — a quiet nod to a strip of negatives, not a decorative border */}
      <div className="pointer-events-none absolute inset-y-0 left-3 hidden flex-col justify-evenly py-24 md:flex">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-2 w-2 rounded-[2px] border border-border" />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-3 hidden flex-col justify-evenly py-24 md:flex">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-2 w-2 rounded-[2px] border border-border" />
        ))}
      </div>

      <div className="relative z-10 mb-10 max-w-2xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-scan/30 bg-scan/5 px-3 py-1 font-mono text-[11px] tracking-[0.1em] text-scan uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-scan" />
          Upstage Solar 판독 시스템
        </div>
        <h2 className="text-4xl leading-[1.15] font-bold tracking-tight text-foreground md:text-5xl">
          <span className="scan-reveal">약관, 읽지 않고도</span>
          <br className="hidden sm:block" /> 위험한 조항만 골라보세요
        </h2>
        <p className="mt-4 text-muted-foreground">
          이미 분석된 주요 서비스 · 카드를 선택하면 판독 결과를 확인할 수 있어요
        </p>
      </div>

      <div className="relative z-10 grid w-full max-w-4xl grid-cols-2 gap-3 px-2 sm:gap-4 md:hidden">
        {FEATURED_SITES.map((site) => (
          <FloatingCard key={site.id} site={site} onSelect={onSelectSite} />
        ))}
      </div>

      <div className="relative z-10 hidden h-[420px] w-full max-w-4xl md:block md:h-[480px]">
        {FEATURED_SITES.map((site) => (
          <FloatingCard
            key={site.id}
            site={site}
            onSelect={onSelectSite}
            className="floating-card absolute w-52"
            style={{
              top: site.floatPosition.top,
              left: site.floatPosition.left,
              animationDelay: `${site.floatDelay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mt-10 flex flex-col items-center gap-1 text-muted-foreground/70">
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
}: {
  site: FeaturedSite;
  onSelect: (site: FeaturedSite) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(site)}
      className={`group cursor-pointer border border-white/10 bg-[#0d1319] p-4 text-left shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/30 ${className}`}
      style={style}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 bg-white/[0.04] text-lg">
          {site.emoji}
        </span>
        <span className={`font-mono text-[10px] font-semibold tracking-wide uppercase ${RISK_TONE[site.riskLabel]}`}>
          {site.riskLabel}
        </span>
      </div>
      <p className="font-semibold text-[#dfeaf0]">{site.name}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#82949f]">{site.summary}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              site.riskLabel === "위험" ? "bg-risk-blocker" : site.riskLabel === "주의" ? "bg-risk-bad" : "bg-risk-ok"
            }`}
            style={{ width: `${site.riskScore}%` }}
          />
        </div>
        <span className="font-mono text-xs font-semibold text-[#dfeaf0]">{site.riskScore}</span>
      </div>
      <p className="mt-2 font-mono text-[10px] tracking-wide text-[#57c2dd] uppercase md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
        판독지 보기 →
      </p>
    </button>
  );
}
