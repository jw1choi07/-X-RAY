"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LinkSectionProps {
  loading: boolean;
  onAnalyze: (url: string) => void;
}

export function LinkSection({ loading, onAnalyze }: LinkSectionProps) {
  const [url, setUrl] = useState("");

  return (
    <section className="relative flex min-h-screen snap-start flex-col items-center justify-center overflow-hidden bg-white px-6 pb-16 dark:bg-neutral-950">
      <div className="pointer-events-none absolute top-1/3 right-1/3 h-72 w-72 rounded-full bg-violet-100/40 blur-3xl dark:bg-violet-500/5" />

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <Link2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl dark:text-white">
          검색이 안된다면?
        </h2>
        <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400">링크를 입력해주세요</p>

        <div className="mt-10 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              className="h-12 rounded-2xl border-neutral-200 pl-11 text-base shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              placeholder="https://example.com/terms"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url && onAnalyze(url)}
            />
          </div>
          <Button
            className="h-12 rounded-2xl px-6"
            disabled={loading || !url.trim()}
            onClick={() => onAnalyze(url)}
          >
            분석하기
          </Button>
        </div>

        <p className="mt-6 text-xs text-neutral-400 dark:text-neutral-500">
          이용약관·개인정보처리방침 URL을 직접 입력하면 AI가 위험 조항을 분석합니다
        </p>
      </div>

      <footer className="absolute bottom-6 text-center text-xs text-neutral-400 dark:text-neutral-600">
        판단 기준: ToS;DR(tosdr.org) bad/blocker 케이스 79종 기반 · 모든 인용문은 원문 대조 검증을 거칩니다.
      </footer>
    </section>
  );
}
