"use client";

import type { CSSProperties } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { FEATURED_SITES, type FeaturedSite } from "@/lib/featured-sites";

const RISK_COLORS: Record<FeaturedSite["riskLabel"], string> = {
  위험: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-900/50",
  주의: "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-900/50",
  보통: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/50",
};

interface FloatingSitesSectionProps {
  onSelectSite: (site: FeaturedSite) => void;
}

export function FloatingSitesSection({ onSelectSite }: FloatingSitesSectionProps) {
  return (
    <section className="relative flex min-h-screen snap-start flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-violet-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900" />
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-72 w-72 animate-pulse rounded-full bg-violet-200/30 blur-3xl [animation-delay:1.5s] dark:bg-violet-500/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)]" />

      <div className="relative z-10 mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 backdrop-blur-sm dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400">
          <Sparkles className="h-3 w-3" />
          Upstage Solar 기반 AI 약관 분석
        </div>
        <h2 className="text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl dark:text-white">
          약관, 읽지 않고도
          <br className="hidden sm:block" /> 위험한 조항만 골라보세요
        </h2>
        <p className="mt-4 text-neutral-500 dark:text-neutral-400">
          이미 분석된 주요 서비스 · 카드를 선택하면 상세 결과를 확인할 수 있어요
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

      <div className="relative z-10 mt-10 flex flex-col items-center gap-1 text-neutral-400">
        <span className="text-[11px] font-medium tracking-wide uppercase">스크롤해서 더보기</span>
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
      className={`group cursor-pointer rounded-2xl border border-white/80 bg-white/90 p-4 text-left shadow-lg shadow-neutral-900/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl hover:shadow-neutral-900/10 dark:border-white/10 dark:bg-neutral-900/90 dark:shadow-black/30 ${className}`}
      style={{
        ...style,
        borderTopColor: site.color,
        borderTopWidth: "3px",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${site.color}1a` }}
        >
          {site.emoji}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${RISK_COLORS[site.riskLabel]}`}
        >
          {site.riskLabel}
        </span>
      </div>
      <p className="font-bold text-neutral-900 dark:text-white">{site.name}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{site.summary}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${site.riskScore}%`,
              backgroundColor: site.color,
            }}
          />
        </div>
        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{site.riskScore}</span>
      </div>
      <p className="mt-2 text-[10px] font-medium text-blue-600 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 dark:text-blue-400">
        탭하여 상세보기 →
      </p>
    </button>
  );
}
