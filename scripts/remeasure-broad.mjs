// Broader validation pass (20 services across ~11 categories) to check that
// the few-shot accuracy gain from the 5-service pilot generalizes rather
// than being an artifact of a small/similar sample.
const BASE = process.env.BASE_URL ?? "http://localhost:3002";

const SERVICES = [
  "요기요", "배달의민족",           // 배달·프랜차이즈
  "토스", "카카오페이", "케이뱅크",  // 금융·핀테크
  "넷플릭스", "왓챠",               // 콘텐츠·스트리밍
  "캐시슬라이드", "캐시워크",        // 생활·기타
  "쿠팡", "11번가",                 // 커머스·쇼핑
  "카카오T", "쏘카",                // 교통·모빌리티
  "넷마블", "엔씨소프트",            // 게임
  "클래스유", "탈잉",               // 교육
  "ChatGPT_OpenAI_", "뤼튼",        // AI 서비스
  "업비트",                        // 투자·증권
  "원티드",                        // 구인구직·부동산
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
for (const name of SERVICES) {
  const file = `${name}_개인정보처리방침.txt`;
  process.stdout.write(`analyzing ${name}...\n`);
  try {
    const data = await analyze(file);
    const findings = data.findings ?? [];
    const total = findings.length;
    const grounded = findings.filter((f) => f.groundedness_verdict === "grounded").length;
    const valid = findings.filter((f) => f.case_match_verdict === "VALID").length;
    report.push({ name, total, grounded, valid });
    console.log(`  총 ${total}건 / 원문근거확인 ${grounded}건 / 매칭타당 ${valid}건`);
  } catch (e) {
    console.error(`  실패: ${e.message}`);
    report.push({ name, error: String(e.message) });
  }
}

console.log("\n=== 요약 ===");
let totalAll = 0, groundedAll = 0, validAll = 0, failed = 0;
for (const r of report) {
  if (r.error) { failed += 1; continue; }
  totalAll += r.total;
  groundedAll += r.grounded;
  validAll += r.valid;
}
console.log(`서비스 ${SERVICES.length}개 중 실패 ${failed}개`);
console.log(`총 판정 건수: ${totalAll}`);
console.log(`원문근거 확인: ${groundedAll} (${((groundedAll / totalAll) * 100).toFixed(1)}%)`);
console.log(`매칭 타당성 통과: ${validAll} (${((validAll / totalAll) * 100).toFixed(1)}%)`);

import fs from "node:fs";
fs.writeFileSync("data/pilot_broad_report.json", JSON.stringify({ report, totalAll, groundedAll, validAll }, null, 2));
