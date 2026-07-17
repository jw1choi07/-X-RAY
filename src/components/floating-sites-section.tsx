"use client";

import type { CSSProperties } from "react";
import { FEATURED_SITES, type FeaturedSite } from "@/lib/featured-sites";

const RISK_COLORS: Record<FeaturedSite["riskLabel"], string> = {
  위험: "text-red-600 bg-red-50 border-red-200",
  주의: "text-orange-600 bg-orange-50 border-orange-200",
  보통: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

interface FloatingSitesSectionProps {
  onSelectSite: (site: FeaturedSite) => void;
}

export function FloatingSitesSection({ onSelectSite }: FloatingSitesSectionProps) {
  return (
    <section className="relative flex min-h-screen snap-start flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-violet-50" />
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />

      <div className="relative z-10 mb-10 text-center">
        <p className="mb-2 text-sm font-medium tracking-wide text-neutral-500">
          이미 분석된 주요 서비스
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
          이용약관 위험도 한눈에
        </h2>
        <p className="mt-3 text-neutral-500">카드를 선택하면 상세 분석 결과를 확인할 수 있어요</p>
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

      <div className="relative z-10 mt-8 animate-bounce text-neutral-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
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
      className={`group cursor-pointer rounded-2xl border border-white/80 bg-white/90 p-4 text-left shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:shadow-xl ${className}`}
      style={{
        ...style,
        borderTopColor: site.color,
        borderTopWidth: "3px",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-2xl">{site.emoji}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${RISK_COLORS[site.riskLabel]}`}
        >
          {site.riskLabel}
        </span>
      </div>
      <p className="font-bold text-neutral-900">{site.name}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{site.summary}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${site.riskScore}%`,
              backgroundColor: site.color,
            }}
          />
        </div>
        <span className="text-xs font-semibold text-neutral-600">{site.riskScore}</span>
      </div>
      <p className="mt-2 text-[10px] font-medium text-blue-600 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
        탭하여 상세보기 →
      </p>
    </button>
  );
}
