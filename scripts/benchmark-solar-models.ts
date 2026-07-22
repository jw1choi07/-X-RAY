// Real Solar Pro 2 vs Pro 3 benchmark: runs the actual analysis pipeline
// (analyzeDocument -> runAgentLoop -> generateFindings + groundedness +
// judgeCaseMatch) against every preset document, once per model, and
// compares latency, token usage, grounded%, and matching-validity%.
//
// Usage: npm run benchmark   (see package.json)
import fs from "node:fs";
import path from "node:path";
import { analyzeDocument } from "../src/lib/analyze";

const TEXTS_DIR = path.join(process.cwd(), "data", "texts");
const OUT_PATH = path.join(process.cwd(), "data", "benchmark-solar-models.json");
const MODELS = ["solar-pro2", "solar-pro3"];
const CONCURRENCY = 2;

interface RunResult {
  service: string;
  model: string;
  ok: boolean;
  latencyMs?: number;
  total?: number;
  grounded?: number;
  valid?: number;
  totalTokens?: number;
  error?: string;
}

function loadUsablePresetFiles(): string[] {
  return fs
    .readdirSync(TEXTS_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();
}

async function runOne(file: string, model: string): Promise<RunResult> {
  const service = file.replace("_개인정보처리방침.txt", "").replace(".txt", "");
  process.env.UPSTAGE_CHAT_MODEL = model;
  const text = fs.readFileSync(path.join(TEXTS_DIR, file), "utf-8");
  const start = Date.now();
  try {
    const result = await analyzeDocument(text, [], file);
    const findings = result.findings ?? [];
    const grounded = findings.filter((f) => f.groundedness_verdict === "grounded").length;
    const valid = findings.filter((f) => f.case_match_verdict === "VALID").length;
    return {
      service,
      model,
      ok: true,
      latencyMs: Date.now() - start,
      total: findings.length,
      grounded,
      valid,
      totalTokens: (result.usage as { total_tokens?: number } | undefined)?.total_tokens,
    };
  } catch (e) {
    return { service, model, ok: false, latencyMs: Date.now() - start, error: (e as Error).message };
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
  console.log(`${files.length}개 문서 × ${MODELS.length}개 모델 실행 (동시성 ${CONCURRENCY})`);

  // IMPORTANT: process.env.UPSTAGE_CHAT_MODEL is a shared global -- concurrent
  // workers racing between models would read the wrong one mid-flight. Run
  // each model's full batch to completion before switching (concurrency is
  // still used *within* a model's batch, which is safe since every worker
  // sets the same value).
  const results: RunResult[] = [];
  for (const model of MODELS) {
    console.log(`\n--- ${model} 시작 ---`);
    let done = 0;
    const batch = await pool(files, CONCURRENCY, async (file) => {
      const r = await runOne(file, model);
      done += 1;
      if (done % 20 === 0) console.log(`  ${done}/${files.length}`);
      return r;
    });
    results.push(...batch);
    fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2)); // checkpoint after each model
  }

  for (const model of MODELS) {
    const rows = results.filter((r) => r.model === model && r.ok);
    const failed = results.filter((r) => r.model === model && !r.ok).length;
    const totalFindings = rows.reduce((s, r) => s + (r.total ?? 0), 0);
    const totalGrounded = rows.reduce((s, r) => s + (r.grounded ?? 0), 0);
    const totalValid = rows.reduce((s, r) => s + (r.valid ?? 0), 0);
    const totalTokens = rows.reduce((s, r) => s + (r.totalTokens ?? 0), 0);
    const avgLatency = rows.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / (rows.length || 1);
    console.log(`\n=== ${model} ===`);
    console.log(`성공 ${rows.length}/${files.length} (실패 ${failed})`);
    console.log(`평균 응답시간: ${(avgLatency / 1000).toFixed(1)}초`);
    console.log(`총 판정 건수: ${totalFindings}`);
    console.log(`원문근거확인: ${totalGrounded} (${((totalGrounded / totalFindings) * 100).toFixed(1)}%)`);
    console.log(`매칭타당성: ${totalValid} (${((totalValid / totalFindings) * 100).toFixed(1)}%)`);
    console.log(`총 토큰: ${totalTokens} (문서당 평균 ${(totalTokens / rows.length).toFixed(0)})`);
  }
  console.log(`\n결과 저장: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
