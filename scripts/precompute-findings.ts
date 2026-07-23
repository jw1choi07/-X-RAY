// Precomputes the full analysis result (Solar Pro 2 findings generation +
// judge calls, not just retrieval -- see src/lib/findings-cache.ts) for
// every usable preset, so a preset click serves an instant cached result
// instead of re-running the whole live pipeline on every visitor's click.
//
// Usage: npx tsx scripts/precompute-findings.ts
// Resumable: skips any file already at FINDINGS_CACHE_VERSION. Re-run after
// bumping that version (prompt/taxonomy/pipeline changes) to refresh stale
// entries -- it'll only regenerate what's actually stale.
import fs from "node:fs";
import path from "node:path";
import { analyzeDocument } from "../src/lib/analyze";
import { listUsablePresets } from "../src/lib/presets";
import { FINDINGS_CACHE_VERSION, loadFindingsCache } from "../src/lib/findings-cache";

const OUT_DIR = path.join(process.cwd(), "data", "findings-cache");
const TEXTS_DIR = path.join(process.cwd(), "data", "texts");
const CONCURRENCY = 4;

interface RunResult {
  file: string;
  ok: boolean;
  findingCount?: number;
  error?: string;
}

async function runOne(file: string): Promise<RunResult> {
  if (loadFindingsCache(file)) return { file, ok: true, findingCount: -1 }; // -1 = skipped, already current
  try {
    const text = fs.readFileSync(path.join(TEXTS_DIR, file), "utf-8");
    // presetFile intentionally omitted here -- passing it would make
    // analyzeDocument() check the very cache we're about to write, which
    // is always a miss right now anyway, but this keeps the call explicit
    // about "run the live pipeline unconditionally."
    const result = await analyzeDocument(text, [], undefined);
    fs.writeFileSync(
      path.join(OUT_DIR, `${file}.json`),
      JSON.stringify({ version: FINDINGS_CACHE_VERSION, findings: result.findings, usage: result.usage }),
    );
    return { file, ok: true, findingCount: result.findings.length };
  } catch (e) {
    return { file, ok: false, error: (e as Error).message };
  }
}

async function pool<T>(items: string[], worker: (item: string) => Promise<T>, size: number): Promise<T[]> {
  const results: T[] = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: size }, runner));
  return results;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = listUsablePresets().map((p) => p.file);
  console.log(`${files.length}개 프리셋 findings 캐시 생성 시작 (동시성 ${CONCURRENCY})`);

  let done = 0;
  const results = await pool(
    files,
    async (file) => {
      const r = await runOne(file);
      done += 1;
      if (done % 10 === 0) console.log(`${done}/${files.length}`);
      return r;
    },
    CONCURRENCY,
  );

  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.ok && r.findingCount === -1).length;
  const generated = results.filter((r) => r.ok && r.findingCount !== -1).length;
  console.log(`\n=== 결과 ===`);
  console.log(`성공 ${results.length - failed.length}/${results.length} (신규 생성 ${generated}, 이미 최신이라 스킵 ${skipped})`);
  if (failed.length) {
    console.log(`실패: ${failed.map((f) => `${f.file} (${f.error})`).join(", ")}`);
  }
}

main();
