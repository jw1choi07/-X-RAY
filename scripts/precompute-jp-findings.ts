// Japan-localization proof of concept: runs the same pipeline used for the
// 148 Korean presets against a handful of real Japanese services, with
// risk_summary output in Japanese (see the `locale` param threaded through
// solar.ts/agent.ts/analyze.ts). Not wired into the main preset flow --
// output feeds src/app/jp/page.tsx's static findings only.
import fs from "node:fs";
import path from "node:path";
import { analyzeDocument } from "../src/lib/analyze";

const TEXTS_DIR = path.join(process.cwd(), "data", "texts-jp");
const OUT_DIR = path.join(process.cwd(), "data", "findings-cache-jp");

const SERVICES: { file: string; slug: string; name: string; domain: string }[] = [
  { file: "line_プライバシーポリシー.txt", slug: "line", name: "LINE", domain: "lycorp.co.jp" },
  { file: "paypay_プライバシーポリシー.txt", slug: "paypay", name: "PayPay", domain: "paypay.ne.jp" },
  { file: "rakuten_個人情報保護方針.txt", slug: "rakuten", name: "楽天 (Rakuten)", domain: "rakuten.co.jp" },
  { file: "mercari_プライバシーポリシー.txt", slug: "mercari", name: "メルカリ (Mercari)", domain: "mercari.com" },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const svc of SERVICES) {
    console.log(`analyzing ${svc.name}...`);
    const text = fs.readFileSync(path.join(TEXTS_DIR, svc.file), "utf-8");
    try {
      const result = await analyzeDocument(text, [], undefined, "ja");
      fs.writeFileSync(
        path.join(OUT_DIR, `${svc.slug}.json`),
        JSON.stringify({ ...svc, findings: result.findings, usage: result.usage, char_count: text.length }, null, 2),
      );
      console.log(`  ${svc.name}: ${result.findings.length}건`);
    } catch (e) {
      console.error(`  FAILED ${svc.name}: ${(e as Error).message}`);
    }
  }
}

main();
