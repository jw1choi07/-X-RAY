import { runAgentLoop } from "./agent";
import {
  buildPriorityPrompt,
  prioritizeFindings,
  type RiskFilterId,
} from "./user-prefs";

export async function analyzeDocument(
  text: string,
  priorityFilters: RiskFilterId[] = [],
) {
  const priorityPrompt = buildPriorityPrompt(priorityFilters);
  const result = await runAgentLoop(
    "이용약관·개인정보처리방침에서 위험 조항을 분석해 주세요.",
    text,
    { source: "user-upload" },
    {},
    priorityPrompt,
  );
  return {
    findings: prioritizeFindings(result.findings, priorityFilters),
    usage: result.usage,
  };
}
