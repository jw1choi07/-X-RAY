"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEATURED_SEARCH_ALIASES, FEATURED_SITES } from "@/lib/featured-sites";
import { CATEGORY_ORDER } from "@/lib/site-categories";
import type { Preset } from "@/lib/presets";

interface SearchSectionProps {
  presets: Preset[];
  onSearchResult: (preset: Preset, siteName: string) => void;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "");
}

function getSiteName(label: string): string {
  return label.split(" · ")[0] ?? label;
}

export function findPresetByQuery(query: string, presets: Preset[]): Preset | null {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  const aliasTarget = FEATURED_SEARCH_ALIASES[normalized];
  const searchTerms = aliasTarget ? [aliasTarget.toLowerCase(), normalized] : [normalized];

  const matches = presets.filter((p) => {
    const siteName = getSiteName(p.label).toLowerCase();
    const labelLower = p.label.toLowerCase();
    return searchTerms.some(
      (term) => siteName.includes(term) || labelLower.includes(term) || term.includes(siteName),
    );
  });

  if (matches.length === 0) return null;

  return matches.find((m) => m.label.includes("이용약관")) ?? matches[0];
}

export function SearchSection({ presets, onSearchResult }: SearchSectionProps) {
  const [query, setQuery] = useState("");
  const [noResult, setNoResult] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categorized = useMemo(() => {
    const groups = new Map<string, Preset[]>();
    for (const p of presets) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return groups;
  }, [presets]);

  const categoriesWithSites = CATEGORY_ORDER.filter((c) => (categorized.get(c)?.length ?? 0) > 0);

  useEffect(() => {
    if (!activeCategory && categoriesWithSites.length > 0) {
      setActiveCategory(categoriesWithSites[0]);
    }
  }, [activeCategory, categoriesWithSites]);

  function handleSearch() {
    const match = findPresetByQuery(query, presets);
    if (!match) {
      setNoResult(true);
      return;
    }
    setNoResult(false);
    onSearchResult(match, getSiteName(match.label));
  }

  function handlePresetClick(preset: Preset) {
    onSearchResult(preset, preset.siteName);
  }

  const quickPicks = FEATURED_SITES.slice(0, 5);

  return (
    <section className="section-search relative flex min-h-[100svh] snap-start flex-col items-center justify-center overflow-hidden px-5 py-12 md:px-8">
      <div className="atmosphere-panel relative z-10 w-full max-w-2xl rounded-2xl px-5 py-6 text-left md:px-7 md:py-7">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="mb-1 font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
              Case Lookup
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              검색하기
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              이미 판독이 끝난 사이트를 검색하거나 카테고리에서 고르세요
            </p>
          </div>
          <p className="rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
            {presets.length}건 문서
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-md border-border bg-background pl-11 text-base shadow-sm"
              placeholder="카카오T, 멜론, 토스, 넷플릭스..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setNoResult(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button
            className="h-11 rounded-md px-5"
            disabled={!query.trim()}
            onClick={handleSearch}
          >
            검색
          </Button>
        </div>

        {noResult && (
          <p className="mt-3 text-sm font-medium text-risk-blocker animate-in fade-in slide-in-from-top-1">
            검색결과가 없습니다. 아래에서 링크로 직접 분석해보세요.
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            자주 찾는 서비스
          </p>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => {
                  const preset = presets.find((p) => p.file === site.presetFile);
                  if (preset) handlePresetClick(preset);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted"
              >
                {site.name}
                <span
                  className={`font-mono text-[10px] ${
                    site.riskLabel === "높음"
                      ? "text-risk-blocker"
                      : site.riskLabel === "보통"
                        ? "text-risk-bad"
                        : "text-muted-foreground"
                  }`}
                >
                  {site.riskLabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBrowseOpen((v) => !v)}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          카테고리로 찾아보기
          <ChevronDown
            className={`h-4 w-4 transition-transform ${browseOpen ? "rotate-180" : ""}`}
          />
        </button>

        {browseOpen && (
          <div className="mt-3 max-h-[38vh] overflow-y-auto rounded-md border border-border bg-background p-3 shadow-sm md:max-h-[42vh]">
            <div className="flex flex-wrap gap-1.5">
              {categoriesWithSites.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-sm border px-2.5 py-1 font-mono text-[11px] tracking-wide transition-colors ${
                    activeCategory === category
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {category}
                  <span className="ml-1 opacity-60">{categorized.get(category)?.length}</span>
                </button>
              ))}
            </div>

            {activeCategory && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                {categorized.get(activeCategory)?.map((preset) => (
                  <button
                    key={preset.file}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-card hover:text-foreground"
                  >
                    <PresetIcon preset={preset} />
                    {preset.siteName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function PresetIcon({ preset }: { preset: Preset }) {
  const [failed, setFailed] = useState(!preset.logo);

  if (failed || !preset.logo) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-foreground/10 text-[9px] font-semibold text-muted-foreground">
        {preset.siteName.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static favicon, not worth next/image's overhead
    <img
      src={preset.logo}
      alt=""
      className="h-4 w-4 shrink-0 rounded-[3px] object-contain"
      onError={() => setFailed(true)}
    />
  );
}
