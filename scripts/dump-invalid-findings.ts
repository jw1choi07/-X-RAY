// Error-analysis dump: runs analyzeDocument over the broad 21-service sample
// and prints every INVALID finding in full (matched_case, quote, risk_summary)
// so a human can read them and find real failure patterns, instead of
// tweaking architecture blind and re-measuring only the aggregate percentage.
import fs from "node:fs";
import path from "node:path";
import { analyzeDocument } from "../src/lib/analyze";

const SERVICES = [
  "요기요", "배달의민족", "토스", "카카오페이", "케이뱅크", "넷플릭스", "왓챠",
  "캐시슬라이드", "캐시워크", "쿠팡", "11번가", "카카오T", "쏘카", "넷마블",
  "엔씨소프트", "클래스유", "탈잉", "ChatGPT_OpenAI_", "뤼튼", "업비트", "원티드",
];

const TEXTS_DIR = path.join(process.cwd(), "data", "texts");

async function main() {
  const invalids: Record<string, unknown>[] = [];
  for (const name of SERVICES) {
    const file = `${name}_개인정보처리방침.txt`;
    const fp = path.join(TEXTS_DIR, file);
    if (!fs.existsSync(fp)) {
      console.error(`skip (no file): ${name}`);
      continue;
    }
    const text = fs.readFileSync(fp, "utf-8");
    try {
      const result = await analyzeDocument(text, [], file);
      for (const f of result.findings ?? []) {
        if (f.case_match_verdict === "INVALID") {
          invalids.push({
            service: name,
            matched_case: f.matched_case,
            classification: f.classification,
            risk_summary: f.risk_summary,
            quote: f.quote,
          });
        }
      }
      console.error(`done: ${name}`);
    } catch (e) {
      console.error(`fail: ${name}: ${(e as Error).message}`);
    }
  }
  const outPath = path.join(process.cwd(), "data", "invalid_findings_sample.json");
  fs.writeFileSync(outPath, JSON.stringify(invalids, null, 2), "utf-8");
  console.error(`\nwrote ${invalids.length} INVALID findings to ${outPath}`);
}

main();
