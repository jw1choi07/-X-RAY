// Full-dataset re-measurement (all usable preset documents) of the current
// pipeline (solar-pro2, whatever few-shot prompt is live in solar.ts) --
// runs analyzeDocument() in-process against every preset, same metric
// definitions as scripts/remeasure-broad.mjs, but full coverage instead of
// the fixed 21-service sample.
import fs from "node:fs";
import path from "node:path";
import { analyzeDocument } from "../src/lib/analyze";

const TEXTS_DIR = path.join(process.cwd(), "data", "texts");
const OUT_PATH = path.join(process.cwd(), "data", "remeasure_full_report.json");
const CONCURRENCY = 4;

interface RunResult {
  service: string;
  ok: boolean;
  total?: number;
  grounded?: number;
  valid?: number;
  error?: string;
}

function loadUsablePresetFiles(): string[] {
  return fs
    .readdirSync(TEXTS_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();
}

async function runOne(file: string): Promise<RunResult> {
  const service = file.replace("_개인정보처리방침.txt", "").replace(".txt", "");
  const text = fs.readFileSync(path.join(TEXTS_DIR, file), "utf-8");
  try {
    const result = await analyzeDocument(text, [], file);
    const findings = result.findings ?? [];
    const grounded = findings.filter((f) => f.groundedness_verdict === "grounded").length;
    const valid = findings.filter((f) => f.case_match_verdict === "VALID").length;
    return { service, ok: true, total: findings.length, grounded, valid };
  } catch (e) {
    return { service, ok: false, error: (e as Error).message };
  }
}

async function pool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner));
  return results;
}

async function main() {
  const files = loadUsablePresetFiles();
  console.log(`${files.length}개 문서 재측정 시작 (동시성 ${CONCURRENCY})`);

  let done = 0;
  const results = await pool(files, CONCURRENCY, async (file) => {
    const r = await runOne(file);
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${files.length}`);
    return r;
  });
  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));

  const rows = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const totalFindings = rows.reduce((s, r) => s + (r.total ?? 0), 0);
  const totalGrounded = rows.reduce((s, r) => s + (r.grounded ?? 0), 0);
  const totalValid = rows.reduce((s, r) => s + (r.valid ?? 0), 0);

  console.log(`\n=== 결과 ===`);
  console.log(`성공 ${rows.length}/${files.length} (실패 ${failed.length})`);
  if (failed.length > 0) console.log(`실패 목록: ${failed.map((f) => f.service).join(", ")}`);
  console.log(`총 판정 건수: ${totalFindings}`);
  console.log(`원문근거확인: ${totalGrounded} (${((totalGrounded / totalFindings) * 100).toFixed(1)}%)`);
  console.log(`매칭타당성: ${totalValid} (${((totalValid / totalFindings) * 100).toFixed(1)}%)`);
  console.log(`\n결과 저장: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
