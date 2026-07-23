import { runAgentLoop } from "./agent";
import { loadFindingsCache } from "./findings-cache";
import {
  buildPriorityPrompt,
  prioritizeFindings,
  type RiskFilterId,
} from "./user-prefs";

export async function analyzeDocument(
  text: string,
  priorityFilters: RiskFilterId[] = [],
  presetFile?: string,
  locale = "ko",
) {
  // Presets are a fixed, known set of ~153 documents -- see
  // scripts/precompute-findings.ts, which runs the full pipeline (Solar Pro 2
  // generation + judge calls, not just retrieval) offline and writes the
  // result here. A hit skips live LLM calls entirely; priority filters still
  // apply (cheap client-side reorder, no regeneration needed for them).
  if (presetFile) {
    const cached = loadFindingsCache(presetFile);
    if (cached) {
      return {
        findings: prioritizeFindings(cached.findings, priorityFilters),
        usage: cached.usage,
      };
    }
  }

  const priorityPrompt = buildPriorityPrompt(priorityFilters);
  const result = await runAgentLoop(
    "이용약관·개인정보처리방침에서 위험 조항을 분석해 주세요.",
    text,
    { source: presetFile ? "preset" : "user-upload" },
    {},
    priorityPrompt,
    presetFile,
    locale,
  );
  return {
    findings: prioritizeFindings(result.findings, priorityFilters),
    usage: result.usage,
  };
}
