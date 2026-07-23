"use client";

import { useState } from "react";
import { FileText, Link2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LinkSectionProps {
  loading: boolean;
  onAnalyze: (url: string) => void;
}

const STEPS = [
  {
    icon: Link2,
    title: "약관 URL 입력",
    desc: "이용약관·개인정보처리방침 페이지 주소",
  },
  {
    icon: ScanSearch,
    title: "AI 판독",
    desc: "위험 조항을 원문 근거와 함께 추출",
  },
  {
    icon: FileText,
    title: "결과 확인",
    desc: "치명적·위험 등급으로 바로 파악",
  },
];

export function LinkSection({ loading, onAnalyze }: LinkSectionProps) {
  const [url, setUrl] = useState("");

  return (
    <section className="section-link relative flex min-h-[100svh] snap-start flex-col items-center justify-center overflow-hidden px-5 pt-12 pb-16 md:px-8">
      <div className="relative z-10 w-full max-w-2xl space-y-4">
        <div className="atmosphere-panel rounded-2xl px-5 py-6 md:px-7 md:py-7">
          <div className="mb-1 font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
            Direct Intake
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            검색이 안된다면?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            링크를 입력하면 바로 위험 조항을 분석합니다
          </p>

          <div className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 rounded-md border-border bg-background pl-11 text-base shadow-sm"
                placeholder="https://example.com/terms"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && url && onAnalyze(url)}
              />
            </div>
            <Button
              className="h-11 rounded-md px-5"
              disabled={loading || !url.trim()}
              onClick={() => onAnalyze(url)}
            >
              분석하기
            </Button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            이용약관·개인정보처리방침 URL을 직접 입력하면 AI가 위험 조항을 분석합니다
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-xl border border-border bg-card/80 px-3.5 py-3.5 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted font-mono text-[10px] text-muted-foreground">
                    0{index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="absolute bottom-5 text-center font-mono text-[11px] text-muted-foreground/60">
        판단 기준: ToS;DR(tosdr.org) bad/blocker 케이스 79종 기반 · 모든 인용문은 원문 대조 검증을 거칩니다.
      </footer>
    </section>
  );
}
