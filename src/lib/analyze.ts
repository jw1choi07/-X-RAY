import { runAgentLoop } from "./agent";
import {
  buildPriorityPrompt,
  prioritizeFindings,
  type RiskFilterId,
} from "./user-prefs";

export async function analyzeDocument(
  text: string,
  priorityFilters: RiskFilterId[] = [],
  presetFile?: string,
) {
  const priorityPrompt = buildPriorityPrompt(priorityFilters);
  const result = await runAgentLoop(
    "이용약관·개인정보처리방침에서 위험 조항을 분석해 주세요.",
    text,
    { source: presetFile ? "preset" : "user-upload" },
    {},
    priorityPrompt,
    presetFile,
  );
  return {
    findings: prioritizeFindings(result.findings, priorityFilters),
    usage: result.usage,
  };
}
