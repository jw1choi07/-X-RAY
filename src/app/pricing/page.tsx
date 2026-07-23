import Link from "next/link";
import { Check, Minus, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

const COMPARISON_ROWS: {
  feature: string;
  free: string | boolean;
  paid: string | boolean;
}[] = [
  {
    feature: "주요 서비스 빠른 위험 조항 분석",
    free: true,
    paid: true,
  },
  {
    feature: "나의 이용현황 등록·관리",
    free: true,
    paid: true,
  },
  {
    feature: "약관 필터(관심 위험 우선 표시)",
    free: true,
    paid: true,
  },
  {
    feature: "정교한 전체 이용약관 분석 포트폴리오",
    free: false,
    paid: "최대 10개 사이트",
  },
  {
    feature: "조항별·카테고리별 위험도 리포트",
    free: "요약 중심",
    paid: "전체 조항 심층 분석",
  },
  {
    feature: "불리한 약관 변경 이메일 알림",
    free: false,
    paid: "이용현황 등록 사이트 대상",
  },
  {
    feature: "분석 결과 메일 수신",
    free: false,
    paid: true,
  },
];

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-scan" aria-label="포함">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-muted-foreground/50" aria-label="미포함">
        <Minus className="h-4 w-4" />
      </span>
    );
  }
  return <span className="text-sm leading-snug text-foreground">{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-24 pb-20 md:px-10">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          ← 홈으로
        </Link>

        <div className="mt-6">
          <p className="font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
            Premium Plan
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            유료 구독
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            한 번의 결제로 최대 10개 사이트의 정교한 전체 약관 분석을 받고,
            등록한 사이트의 약관이 불리하게 바뀌면 이메일로 알려드립니다.
          </p>
        </div>

        <section className="mt-8 rounded-md border border-scan/40 bg-scan/5 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-scan uppercase">
                X-ray Pro
              </p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  19,000
                </span>
                <span className="text-sm text-muted-foreground">원</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                최대 10개 사이트 심층 분석 · 불리한 약관 변경 알림
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="rounded-md"
              disabled
              title="결제 연동은 준비 중입니다"
            >
              <Sparkles className="h-4 w-4" />
              구독하기 (준비 중)
            </Button>
          </div>
          <p className="mt-4 font-mono text-[10px] tracking-wide text-muted-foreground/80">
            * 결제·분석·알림 기능은 곧 연결됩니다. 현재는 플랜 안내만 제공됩니다.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
            Free vs Pro
          </h2>
          <p className="mt-1 text-lg font-semibold text-foreground">
            무료와 유료, 무엇이 다른가요?
          </p>

          <div className="mt-5 overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground md:px-5">
                    기능
                  </th>
                  <th className="w-[22%] px-3 py-3 text-center text-xs font-medium text-muted-foreground md:w-28">
                    무료
                  </th>
                  <th className="w-[28%] px-3 py-3 text-center text-xs font-semibold text-scan md:w-36">
                    Pro · 19,000원
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3.5 text-sm text-foreground md:px-5">
                      {row.feature}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="bg-scan/[0.04] px-3 py-3.5 text-center">
                      <CellValue value={row.paid} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Pro에 포함되는 내용</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-scan" />
              <span>
                <strong className="font-medium text-foreground">최대 10개 사이트</strong>의
                이용약관을 조항 단위로 정교하게 분석한 포트폴리오를 제공합니다.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-scan" />
              <span>
                <strong className="font-medium text-foreground">나의 이용현황</strong>에
                등록된 사이트의 약관이 사용자에게 불리하게 변경되면, 로그인 계정 이메일로
                알림을 보냅니다.
              </span>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
