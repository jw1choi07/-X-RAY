"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEATURED_SEARCH_ALIASES } from "@/lib/featured-sites";

interface Preset {
  file: string;
  label: string;
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

  function handleSearch() {
    const match = findPresetByQuery(query, presets);
    if (!match) {
      setNoResult(true);
      return;
    }
    setNoResult(false);
    onSearchResult(match, getSiteName(match.label));
  }

  return (
    <section className="flex min-h-screen snap-start flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-lg text-center">
        <h2 className="text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl">검색하기</h2>
        <p className="mt-4 text-lg text-neutral-500">이미 분석이 끝난 사이트를 검색해보세요!</p>

        <div className="mt-10 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              className="h-12 rounded-2xl border-neutral-200 bg-white pl-11 text-base shadow-sm"
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
            className="h-12 rounded-2xl px-6"
            disabled={!query.trim()}
            onClick={handleSearch}
          >
            검색
          </Button>
        </div>

        {noResult && (
          <p className="mt-4 text-sm font-medium text-red-500">검색결과가 없습니다.</p>
        )}

        <p className="mt-8 text-xs text-neutral-400">
          {presets.length}개의 사전 크롤링 문서에서 검색합니다
        </p>
      </div>
    </section>
  );
}
