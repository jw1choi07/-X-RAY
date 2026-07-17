"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Finding {
  matched_case: string;
  classification: "blocker" | "bad" | "기타";
  risk_summary: string;
  quote: string;
  quote_grounded?: boolean;
  case_match_verdict?: string;
}

interface Preset {
  file: string;
  label: string;
}

const CLASSIFICATION_STYLE: Record<string, { emoji: string; badge: string }> = {
  blocker: { emoji: "🔴", badge: "bg-red-600 text-white" },
  bad: { emoji: "🟠", badge: "bg-orange-500 text-white" },
  기타: { emoji: "⚪", badge: "bg-neutral-400 text-white" },
};

const VERDICT_LABEL: Record<string, string> = {
  VALID: "✅ 매칭 타당",
  INVALID: "❓ 매칭 재검토 필요",
  SKIPPED_UNGROUNDED: "⏭️ 검증 스킵(원문 미확인)",
};

export default function Home() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [meta, setMeta] = useState<{ char_count: number; method: string } | null>(null);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => setPresets(d.presets ?? []));
  }, []);

  async function runAnalyze(body: Record<string, string>) {
    setLoading(true);
    setError(null);
    setFindings(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 중 오류가 발생했습니다.");
      setFindings(data.findings);
      setMeta(data.meta);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const counts = findings
    ? findings.reduce(
        (acc, f) => {
          acc[f.classification] = (acc[f.classification] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      )
    : {};
  const groundedCount = findings ? findings.filter((f) => f.quote_grounded).length : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium tracking-wide text-neutral-500">SIZE UP YOUR TERMS OF SERVICE</p>
        <h1 className="text-4xl font-bold tracking-tight">🔍 약관 X-ray</h1>
        <p className="text-neutral-500">
          이용약관·개인정보처리방침을 AI가 읽고, 위험 조항을 원문 근거와 함께 짚어드립니다.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <div className="text-xs font-semibold tracking-widest text-neutral-400">STEP 1</div>
        <Tabs defaultValue="url">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">URL로 분석</TabsTrigger>
            <TabsTrigger value="preset">크롤링된 문서에서 선택</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="mt-4 flex gap-2">
            <Input
              placeholder="https://example.com/terms"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button disabled={loading || !url} onClick={() => runAnalyze({ url })}>
              분석하기
            </Button>
          </TabsContent>
          <TabsContent value="preset" className="mt-4 flex gap-2">
            <Select value={selectedPreset} onValueChange={(v) => setSelectedPreset(v ?? "")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={`미리 크롤링해둔 ${presets.length}개 문서 중 선택`} />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.file} value={p.file}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={loading || !selectedPreset}
              onClick={() => runAnalyze({ presetFile: selectedPreset })}
            >
              분석하기
            </Button>
          </TabsContent>
        </Tabs>
      </section>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {findings && (
        <section className="space-y-6">
          <div className="text-xs font-semibold tracking-widest text-neutral-400">STEP 2 · 분석 결과</div>
          {meta && (
            <p className="text-sm text-neutral-500">
              원문 {meta.char_count.toLocaleString()}자 확보 ({meta.method} 방식)
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="치명적(blocker)" value={counts.blocker ?? 0} />
            <StatTile label="위험(bad)" value={counts.bad ?? 0} />
            <StatTile label="기타" value={counts["기타"] ?? 0} />
            <StatTile label="원문 근거 확인" value={`${groundedCount}/${findings.length}`} />
          </div>

          {findings.length === 0 && (
            <Alert>
              <AlertDescription>탐지된 위험 조항이 없습니다.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {findings.map((f, i) => {
              const style = CLASSIFICATION_STYLE[f.classification] ?? CLASSIFICATION_STYLE["기타"];
              const verdictLabel = VERDICT_LABEL[f.case_match_verdict ?? ""] ?? f.case_match_verdict;
              return (
                <div key={i} className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={style.badge}>
                      {style.emoji} {f.classification}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      매칭 기준: {f.matched_case || "기타"} ·{" "}
                      {f.quote_grounded ? "✅ 원문 확인됨" : "⚠️ 원문 미확인"} · {verdictLabel}
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold">{f.risk_summary}</h3>
                  <blockquote
                    className={`border-l-2 pl-3 text-sm ${
                      f.quote_grounded
                        ? "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                        : "border-neutral-200 text-neutral-400 line-through"
                    }`}
                  >
                    {f.quote}
                  </blockquote>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="mt-auto pt-8 text-center text-xs text-neutral-400">
        판단 기준: ToS;DR(tosdr.org) bad/blocker 케이스 79종 기반 · 모든 인용문은 원문 대조 검증을 거칩니다.
      </footer>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
