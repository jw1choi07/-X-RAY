"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEATURED_SEARCH_ALIASES } from "@/lib/featured-sites";
import { CATEGORY_ORDER, type SiteCategory } from "@/lib/site-categories";

interface Preset {
  file: string;
  label: string;
  siteName: string;
  category: SiteCategory;
}

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
  const [browseOpen, setBrowseOpen] = useState(false);
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

  return (
    <section className="relative flex min-h-screen snap-start flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-3 font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
          Case Lookup
        </div>
        <h2 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          검색하기
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          이미 판독이 끝난 사이트를 검색해보세요
        </p>

        <div className="mt-10 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-md border-border bg-card pl-11 text-base shadow-sm"
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
            className="h-12 rounded-md px-6"
            disabled={!query.trim()}
            onClick={handleSearch}
          >
            검색
          </Button>
        </div>

        {noResult && (
          <p className="mt-4 text-sm font-medium text-risk-blocker animate-in fade-in slide-in-from-top-1">
            검색결과가 없습니다. 아래에서 링크로 직접 분석해보세요.
          </p>
        )}

        <button
          type="button"
          onClick={() => setBrowseOpen((v) => !v)}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          카테고리로 찾아보기
          <ChevronDown
            className={`h-4 w-4 transition-transform ${browseOpen ? "rotate-180" : ""}`}
          />
        </button>

        {browseOpen && (
          <div className="mt-4 max-h-[45vh] overflow-y-auto rounded-md border border-border bg-card p-4 text-left shadow-sm">
            <div className="flex flex-wrap gap-2">
              {categoriesWithSites.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setActiveCategory((c) => (c === category ? null : category))
                  }
                  className={`rounded-sm border px-3 py-1 font-mono text-[11px] tracking-wide transition-colors ${
                    activeCategory === category
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-scan/50 hover:text-foreground"
                  }`}
                >
                  {category}
                  <span className="ml-1 opacity-60">{categorized.get(category)?.length}</span>
                </button>
              ))}
            </div>

            {activeCategory && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {categorized.get(activeCategory)?.map((preset) => (
                  <button
                    key={preset.file}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="rounded-sm bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-scan/10 hover:text-scan"
                  >
                    {preset.siteName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-4 font-mono text-[11px] text-muted-foreground/70">
          {presets.length}건의 사전 크롤링 문서에서 검색합니다
        </p>
      </div>
    </section>
  );
}
