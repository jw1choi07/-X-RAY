import { type Finding, generateFindings, judgeCaseMatch } from "./solar";
import { buildContextText, buildDocumentElements, hybridSearchElements, type DocumentElement, type RetrievalFilter } from "./rag";
import { selectRelevantCases } from "./tosdr";

export interface AgentLoopResult {
  findings: Finding[];
  context: string;
  iterations: number;
  usage: Record<string, number>;
}

function normalizeWs(value: string): string {
  return value.replace(/\s+/g, "");
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = normalizeWs(finding.quote ?? "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function rewriteQuery(query: string): Promise<string[]> {
  const prompt = [
    "당신은 정부 공고문 검색 질의 확장 전문가입니다.",
    "사용자 질문을 바탕으로 검색에 쓰기 좋은 한국어 쿼리 3개를 생성하되, 핵심 키워드와 기관/기간/카테고리 단서를 포함하세요.",
    `질문: ${query}`,
    "출력 형식은 줄바꿈으로 구분된 문자열 3개만 출력하세요.",
  ].join("\n");

  const response = await fetch("https://api.upstage.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.UPSTAGE_CHAT_MODEL ?? "solar-pro2",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) return [query];
  const data = await response.json();
  const content = String(data.choices?.[0]?.message?.content ?? "").trim();
  return content.split(/\n+/).map((item) => item.trim()).filter(Boolean).slice(0, 3) || [query];
}

export async function runAgentLoop(
  question: string,
  sourceText: string,
  metadata: Record<string, unknown> = {},
  filters: RetrievalFilter = {},
  priorityPrompt = "",
): Promise<AgentLoopResult> {
  const elements = buildDocumentElements(sourceText, metadata);
  const rewrittenQueries = await rewriteQuery(question);
  const iterations = Math.min(3, rewrittenQueries.length);
  const collected: DocumentElement[] = [];

  for (let index = 0; index < iterations; index += 1) {
    const query = rewrittenQueries[index] ?? question;
    const hits = hybridSearchElements(query, elements, { filters, topK: 6, baseMetadata: metadata });
    collected.push(...hits);
    const context = buildContextText(hits);
    if (context.length > 800) break;
  }

  const finalContext = buildContextText(collected.length > 0 ? collected : elements);
  // Embed the retrieved context and pull only the semantically closest ToS;DR
  // cases instead of stuffing all 79 into every prompt (metadata/embedding
  // pre-filtering, per mentor feedback on RAG structure).
  const relevantTaxonomy = await selectRelevantCases(finalContext);
  const perChunkResults = await Promise.all(
    [finalContext].map((chunk) => generateFindings(chunk, relevantTaxonomy, priorityPrompt)),
  );

  const findings = dedupeFindings(perChunkResults.flatMap((r) => r.findings as Finding[])).slice(0, 10);
  const usage = perChunkResults.reduce((acc, r) => {
    const u = (r.usage ?? {}) as Record<string, number>;
    acc.total_tokens = (acc.total_tokens ?? 0) + (u.total_tokens ?? 0);
    return acc;
  }, {} as Record<string, number>);

  // generateFindings() already tagged groundedness_verdict against this same
  // context. Here we only run the second verification stage: does the quote
  // actually support the matched risk classification, or did the model grab
  // a real-but-unrelated sentence? (Originally designed in the pilot
  // pipeline, wasn't wired into the live app until now.) Skip it for
  // ungrounded quotes since there's nothing meaningful to validate.
  for (const finding of findings) {
    if (finding.groundedness_verdict === "notGrounded") {
      finding.case_match_verdict = "SKIPPED_UNGROUNDED";
      continue;
    }
    try {
      finding.case_match_verdict = await judgeCaseMatch(finding);
    } catch (e) {
      console.error("case match judge 호출 실패:", e);
    }
  }

  return { findings, context: finalContext, iterations, usage };
}
