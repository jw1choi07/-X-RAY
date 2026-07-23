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
    <section className="section-link relative flex min-h-screen snap-start flex-col items-center justify-center overflow-hidden px-6 pt-16 pb-20">
      <div className="atmosphere-panel relative z-10 w-full max-w-lg rounded-2xl px-6 py-8 text-center md:px-8 md:py-10">
        <div className="mb-2 font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
          Direct Intake
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          검색이 안된다면?
        </h2>
        <p className="mt-2 text-base text-muted-foreground md:text-lg">링크를 입력해주세요</p>

        <div className="mt-7 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-md border-border bg-background/80 pl-11 text-base shadow-sm"
              placeholder="https://example.com/terms"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url && onAnalyze(url)}
            />
          </div>
          <Button
            className="h-12 rounded-md px-6"
            disabled={loading || !url.trim()}
            onClick={() => onAnalyze(url)}
          >
            분석하기
          </Button>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          이용약관·개인정보처리방침 URL을 직접 입력하면 AI가 위험 조항을 분석합니다
        </p>
      </div>

      <footer className="absolute bottom-6 text-center font-mono text-[11px] text-muted-foreground/60">
        판단 기준: ToS;DR(tosdr.org) bad/blocker 케이스 79종 기반 · 모든 인용문은 원문 대조 검증을 거칩니다.
      </footer>
    </section>
  );
}
