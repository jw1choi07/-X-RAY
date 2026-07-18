import { runAgentLoop } from "./agent";

export async function analyzeDocument(text: string) {
  const result = await runAgentLoop("정부 공고문에서 위험 조항을 분석해 주세요.", text, { source: "user-upload" });
  return { findings: result.findings, usage: result.usage };
}
