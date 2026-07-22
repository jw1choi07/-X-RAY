// Re-runs the original 5-service pilot methodology against the live /api/analyze
// route (real production code path) to measure grounded% / valid% after today's
// embedding-based case retrieval + matching-validity-judge fixes.
const BASE = process.env.BASE_URL ?? "http://localhost:3002";

const SERVICES = [
  "요기요_개인정보처리방침.txt",
  "토스_개인정보처리방침.txt",
  "카카오페이_개인정보처리방침.txt",
  "넷플릭스_개인정보처리방침.txt",
  "캐시슬라이드_개인정보처리방침.txt",
];

async function analyze(presetFile) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presetFile }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

const report = [];
for (const file of SERVICES) {
  const name = file.replace("_개인정보처리방침.txt", "");
  process.stdout.write(`analyzing ${name}...\n`);
  try {
    const data = await analyze(file);
    const findings = data.findings ?? [];
    const total = findings.length;
    const grounded = findings.filter((f) => f.groundedness_verdict === "grounded").length;
    const valid = findings.filter((f) => f.case_match_verdict === "VALID").length;
    const tokens = data.usage?.total_tokens ?? "?";
    report.push({ name, total, grounded, valid, tokens });
    console.log(`  총 ${total}건 / 원문근거확인 ${grounded}건 / 매칭타당 ${valid}건 / 토큰 ${tokens}`);
  } catch (e) {
    console.error(`  실패: ${e.message}`);
    report.push({ name, error: String(e.message) });
  }
}

console.log("\n=== 요약 ===");
let totalAll = 0, groundedAll = 0, validAll = 0;
for (const r of report) {
  if (r.error) continue;
  totalAll += r.total;
  groundedAll += r.grounded;
  validAll += r.valid;
}
console.log(`총 판정 건수: ${totalAll}`);
console.log(`원문근거 확인: ${groundedAll} (${((groundedAll / totalAll) * 100).toFixed(1)}%)`);
console.log(`매칭 타당성 통과: ${validAll} (${((validAll / totalAll) * 100).toFixed(1)}%)`);

import fs from "node:fs";
fs.writeFileSync(
  "data/pilot_remeasure_report.json",
  JSON.stringify({ report, totalAll, groundedAll, validAll }, null, 2),
);
