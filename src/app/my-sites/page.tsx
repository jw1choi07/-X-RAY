"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AnalysisResultsPanel, type Finding } from "@/components/analysis-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findPresetByQuery } from "@/components/search-section";
import { FEATURED_SITES } from "@/lib/featured-sites";
import {
  overallRiskFromFindings,
  type MySite,
  type SiteRiskLabel,
  type UserPrefs,
} from "@/lib/user-prefs";
import { fetchUserPrefs, updateSites } from "@/lib/user-prefs-client";
import type { Preset } from "@/lib/presets";
import type { DocumentMetadata } from "@/lib/info-extract";
import { TermsUpdatedBadge } from "@/components/terms-updated-badge";
import type { TermsUpdateEntry } from "@/lib/terms-update";
import { getTermsUpdateInfo } from "@/lib/terms-update";

function riskTone(label: SiteRiskLabel) {
  switch (label) {
    case "높음":
      return "border-risk-blocker/30 bg-risk-blocker/10 text-risk-blocker";
    case "보통":
      return "border-risk-bad/30 bg-risk-bad/10 text-risk-bad";
    case "낮음":
      return "border-risk-ok/30 bg-risk-ok/10 text-risk-ok";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function MySitesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"search" | "url">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [activeSite, setActiveSite] = useState<MySite | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [meta, setMeta] = useState<{ char_count: number; method: string; metadata?: DocumentMetadata | null } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [presetUpdates, setPresetUpdates] = useState<Record<string, TermsUpdateEntry>>({});

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => setPresets(d.presets ?? []));
  }, []);

  useEffect(() => {
    const files = (prefs?.sites ?? [])
      .map((site) => site.presetFile)
      .filter((file): file is string => Boolean(file));
    if (files.length === 0) {
      setPresetUpdates({});
      return;
    }
    let cancelled = false;
    fetch(`/api/terms-updates?files=${encodeURIComponent(files.join(","))}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPresetUpdates(d.updates ?? {});
      })
      .catch(() => {
        if (!cancelled) setPresetUpdates({});
      });
    return () => {
      cancelled = true;
    };
  }, [prefs?.sites]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoadingPrefs(false);
      return;
    }
    let cancelled = false;
    setLoadingPrefs(true);
    fetchUserPrefs()
      .then((next) => {
        if (!cancelled) setPrefs(next);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrefs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const sites = prefs?.sites ?? [];

  const searchHint = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return findPresetByQuery(searchQuery, presets);
  }, [searchQuery, presets]);

  async function persistSites(nextSites: MySite[]) {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateSites(nextSites);
      setPrefs(saved);
      return saved;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSearch(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    const preset = findPresetByQuery(searchQuery, presets);
    if (!preset) {
      setAddError("이미 분석된 사이트에서 결과를 찾지 못했습니다.");
      return;
    }
    const siteName = preset.label.split(" · ")[0] ?? preset.label;
    if (sites.some((s) => s.presetFile === preset.file || s.name === siteName)) {
      setAddError("이미 추가된 사이트입니다.");
      return;
    }
    const featured = FEATURED_SITES.find((s) => s.presetFile === preset.file);
    let effectiveDate: string | undefined;
    try {
      const res = await fetch(`/api/terms-updates?files=${encodeURIComponent(preset.file)}`);
      const data = await res.json();
      effectiveDate = data.updates?.[preset.file]?.effectiveDate;
    } catch {
      // ignore — 배지는 나중에 갱신
    }
    const nextSite: MySite = {
      id: crypto.randomUUID(),
      name: siteName,
      presetFile: preset.file,
      riskLabel: featured?.riskLabel ?? "미분석",
      riskScore: featured?.riskScore,
      summary: featured?.summary,
      effectiveDate,
      createdAt: new Date().toISOString(),
    };
    await persistSites([...sites, nextSite]);
    setSearchQuery("");
    setShowAdd(false);
  }

  async function handleAddUrl(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    const name = manualName.trim();
    const url = manualUrl.trim();
    if (!name) {
      setAddError("사이트 이름을 입력해 주세요.");
      return;
    }
    try {
      void new URL(url);
    } catch {
      setAddError("올바른 사이트 주소를 입력해 주세요. (예: https://example.com/terms)");
      return;
    }
    if (sites.some((s) => s.url === url || s.name === name)) {
      setAddError("이미 추가된 사이트입니다.");
      return;
    }
    const nextSite: MySite = {
      id: crypto.randomUUID(),
      name,
      url,
      riskLabel: "미분석",
      createdAt: new Date().toISOString(),
    };
    await persistSites([...sites, nextSite]);
    setManualName("");
    setManualUrl("");
    setShowAdd(false);
  }

  async function handleRemove(id: string) {
    await persistSites(sites.filter((site) => site.id !== id));
  }

  async function openDetail(site: MySite) {
    setActiveSite(site);
    setFindings(null);
    setMeta(null);
    setAnalyzeError(null);
    setAnalyzing(true);

    const body = site.presetFile
      ? { presetFile: site.presetFile }
      : site.url
        ? { url: site.url }
        : null;

    if (!body) {
      setAnalyzeError("분석할 주소 또는 프리셋 정보가 없습니다.");
      setAnalyzing(false);
      return;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석에 실패했습니다.");

      const nextFindings = data.findings as Finding[];
      setFindings(nextFindings);
      setMeta(data.meta);
      const risk = overallRiskFromFindings(nextFindings);
      const effectiveDate =
        (data.meta?.metadata?.effective_date as string | undefined)?.trim() ||
        site.effectiveDate;
      const updated: MySite = {
        ...site,
        riskLabel: risk.riskLabel,
        riskScore: risk.riskScore,
        summary: nextFindings[0]?.risk_summary ?? site.summary,
        effectiveDate: getTermsUpdateInfo(effectiveDate)?.effectiveDate ?? effectiveDate,
        lastAnalyzedAt: new Date().toISOString(),
      };
      const nextSites = sites.map((item) => (item.id === site.id ? updated : item));
      setActiveSite(updated);
      await persistSites(nextSites);
    } catch (e) {
      setAnalyzeError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-24 pb-16 md:px-10">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          ← 홈으로
        </Link>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
              My Records
            </p>
            <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground">
              나의 이용현황
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              자주 쓰는 사이트를 모아두고 위험도를 한눈에 확인하세요.
            </p>
          </div>
          {isSignedIn && (
            <Button type="button" className="rounded-md" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="h-4 w-4" />
              항목 추가
            </Button>
          )}
        </div>

        {!isLoaded || loadingPrefs ? (
          <p className="mt-10 text-sm text-muted-foreground">불러오는 중…</p>
        ) : !isSignedIn ? (
          <div className="mt-10 rounded-md border border-border bg-muted/40 px-5 py-8 text-sm text-muted-foreground">
            이용현황은 로그인 후 이용할 수 있습니다.{" "}
            <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-2">
              로그인하기
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p className="mt-4 text-sm text-risk-blocker" role="alert">
                {error}
              </p>
            )}

            {showAdd && (
              <section className="mt-8 rounded-md border border-border bg-card p-5">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={addMode === "search" ? "default" : "outline"}
                    onClick={() => {
                      setAddMode("search");
                      setAddError(null);
                    }}
                  >
                    분석된 사이트 검색
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={addMode === "url" ? "default" : "outline"}
                    onClick={() => {
                      setAddMode("url");
                      setAddError(null);
                    }}
                  >
                    주소 직접 입력
                  </Button>
                </div>

                {addMode === "search" ? (
                  <form onSubmit={handleAddSearch} className="mt-4 space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="카카오T, 멜론, 토스…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {searchHint && (
                      <p className="text-xs text-muted-foreground">
                        검색 결과 후보: {searchHint.label}
                      </p>
                    )}
                    {addError && <p className="text-sm text-risk-blocker">{addError}</p>}
                    <Button type="submit" className="rounded-md" disabled={saving || !searchQuery.trim()}>
                      검색해서 추가
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleAddUrl} className="mt-4 space-y-3">
                    <Input
                      placeholder="사이트 이름"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      required
                    />
                    <Input
                      placeholder="https://example.com/terms"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      required
                    />
                    {addError && <p className="text-sm text-risk-blocker">{addError}</p>}
                    <Button type="submit" className="rounded-md" disabled={saving}>
                      직접 추가
                    </Button>
                  </form>
                )}
              </section>
            )}

            <ul className="mt-8 divide-y divide-border">
              {sites.length === 0 && (
                <li className="py-10 text-sm text-muted-foreground">
                  아직 추가된 사이트가 없습니다. 항목 추가 버튼으로 시작해 보세요.
                </li>
              )}
              {sites.map((site) => {
                const effectiveDate =
                  site.effectiveDate ??
                  (site.presetFile ? presetUpdates[site.presetFile]?.effectiveDate : undefined);
                return (
                <li key={site.id} className="flex items-center gap-3 py-4">
                  <button
                    type="button"
                    onClick={() => openDetail(site)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold text-foreground">
                        {site.name}
                      </span>
                      <span
                        className={`rounded-sm border px-2.5 py-0.5 font-mono text-[11px] font-medium ${riskTone(site.riskLabel)}`}
                      >
                        위험도 {site.riskLabel}
                        {typeof site.riskScore === "number" ? ` · ${site.riskScore}` : ""}
                      </span>
                      <TermsUpdatedBadge effectiveDate={effectiveDate} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {site.summary ?? site.url ?? site.presetFile ?? "상세 분석을 보려면 클릭하세요"}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${site.name} 삭제`}
                    onClick={() => handleRemove(site.id)}
                    className="shrink-0 text-muted-foreground hover:text-risk-blocker"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
                );
              })}
            </ul>
          </>
        )}
      </main>

      {activeSite && (
        <AnalysisResultsPanel
          siteName={activeSite.name}
          findings={findings}
          meta={meta}
          loading={analyzing}
          error={analyzeError}
          onClose={() => {
            setActiveSite(null);
            setFindings(null);
            setMeta(null);
            setAnalyzeError(null);
          }}
        />
      )}
    </>
  );
}
