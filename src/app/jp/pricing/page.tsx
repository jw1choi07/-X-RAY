import Link from "next/link";
import { Check, Minus, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

const UNIT_PRICE = 300;

const PACKS: {
  count: number;
  price: number;
  highlight?: boolean;
}[] = [
  { count: 1, price: 300 },
  { count: 3, price: 700, highlight: true },
  { count: 5, price: 1000 },
];

function discountPercent(count: number, price: number): number | null {
  if (count <= 1) return null;
  const full = UNIT_PRICE * count;
  return Math.round(((full - price) / full) * 100);
}

const COMPARISON_ROWS: {
  feature: string;
  free: string | boolean;
  paid: string | boolean;
}[] = [
  {
    feature: "主要サービスの高速リスク条項分析",
    free: true,
    paid: true,
  },
  {
    feature: "利用状況の登録・管理",
    free: true,
    paid: true,
  },
  {
    feature: "規約フィルター(関心のあるリスクを優先表示)",
    free: true,
    paid: true,
  },
  {
    feature: "精密な全文分析ポートフォリオ",
    free: false,
    paid: "最大3サイト",
  },
  {
    feature: "条項別・カテゴリー別リスクレポート",
    free: "要約中心",
    paid: "全条項の詳細分析",
  },
  {
    feature: "不利な規約変更のメール通知",
    free: false,
    paid: "3ヶ月・登録済みサイト対象",
  },
  {
    feature: "分析結果のメール受信",
    free: false,
    paid: true,
  },
];

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-foreground" aria-label="含む">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-muted-foreground/50" aria-label="含まない">
        <Minus className="h-4 w-4" />
      </span>
    );
  }
  return <span className="text-sm leading-snug text-foreground">{value}</span>;
}

function formatYen(n: number) {
  return n.toLocaleString("ja-JP");
}

export default function JapanPricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-24 pb-20 md:px-10">
        <Link
          href="/jp"
          className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          ← 日本版ホームへ
        </Link>

        <div className="mt-6">
          <p className="font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
            Premium Plan
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            有料プラン
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            詳細分析3回と不利な規約変更通知3ヶ月がセットになったProプラン、
            または必要な分だけ詳細分析を個別に購入できます。
          </p>
        </div>

        <section className="mt-8 rounded-md border border-border bg-muted/60 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                X-ray Pro
              </p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  990
                </span>
                <span className="text-sm text-muted-foreground">円</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                詳細分析3回 · 不利な規約変更通知3ヶ月
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="rounded-md"
              disabled
              title="決済連携は準備中です"
            >
              <Sparkles className="h-4 w-4" />
              購読する (準備中)
            </Button>
          </div>
          <p className="mt-4 font-mono text-[10px] tracking-wide text-muted-foreground/80">
            * 決済・分析・通知機能は近日公開予定です。現在はプラン内容のご案内のみとなります。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
            Free vs Pro
          </h2>
          <p className="mt-1 text-lg font-semibold text-foreground">
            無料とProプラン、何が違うの?
          </p>

          <div className="mt-5 overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground md:px-5">
                    機能
                  </th>
                  <th className="w-[22%] px-3 py-3 text-center text-xs font-medium text-muted-foreground md:w-28">
                    無料
                  </th>
                  <th className="w-[28%] px-3 py-3 text-center text-xs font-semibold text-foreground md:w-36">
                    Pro · 990円
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
                    <td className="bg-muted/40 px-3 py-3.5 text-center">
                      <CellValue value={row.paid} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Proに含まれる内容</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <span>
                <strong className="font-medium text-foreground">詳細分析3回</strong> —
                選択したサイトの利用規約を条項単位で精密に分析したポートフォリオを
                提供します。
              </span>
            </li>
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <span>
                <strong className="font-medium text-foreground">通知3ヶ月</strong> —
                利用状況に登録したサイトの規約がユーザーに不利な形で変更された場合、
                登録メールアドレスへ通知します。
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
            Deep Analysis Packs
          </h2>
          <p className="mt-1 text-lg font-semibold text-foreground">
            詳細分析のみ個別購入
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            通知なしで詳細分析クレジットのみ必要な場合はこちら。1回あたりの基準価格は
            {" "}{formatYen(UNIT_PRICE)}円です。
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {PACKS.map((pack) => {
              const discount = discountPercent(pack.count, pack.price);
              const perUnit = Math.round(pack.price / pack.count);
              return (
                <div
                  key={pack.count}
                  className={`flex flex-col rounded-md border p-5 ${
                    pack.highlight
                      ? "border-foreground/30 bg-muted/50"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                      {pack.count}回分析
                    </p>
                    {discount != null && (
                      <span className="rounded-sm bg-risk-bad/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-risk-bad">
                        {discount}%割引
                      </span>
                    )}
                  </div>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {formatYen(pack.price)}
                    </span>
                    <span className="text-sm text-muted-foreground">円</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    1回あたり{formatYen(perUnit)}円
                    {discount != null && (
                      <>
                        {" "}
                        · 定価{formatYen(UNIT_PRICE * pack.count)}円
                      </>
                    )}
                  </p>
                  <Button
                    type="button"
                    variant={pack.highlight ? "default" : "outline"}
                    className="mt-5 w-full rounded-md"
                    disabled
                    title="決済連携は準備中です"
                  >
                    購入する (準備中)
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
