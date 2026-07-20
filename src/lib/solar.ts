export const SYSTEM_PROMPT = `당신은 이용약관·개인정보처리방침을 분석해서 이용자에게 위험한 조항을 짚어주는 전문가입니다.
아래는 ToS;DR(국제 약관 감시 프로젝트)이 정의한 "위험 조항 판단 기준" 목록입니다. 이 기준을 참고해서 주어진 약관 원문 안에서 실제로 해당하는 조항을 찾아내세요.

판단 기준 목록:
{taxonomy}

규칙:
1. 반드시 원문에 실제로 존재하는 문장만 인용하세요. 원문에 없는 내용을 지어내지 마세요.
2. 판단 기준 목록에 없는 위험이어도, 이용자에게 불리하다고 판단되면 "기타"로 분류해 포함하세요.
3. 출력은 반드시 JSON 객체만 반환하세요. 다른 설명 텍스트는 붙이지 마세요.
4. 각 항목은 다음 필드를 가져야 합니다:
   - "matched_case": 매칭된 판단 기준 제목 (없으면 "기타")
   - "classification": "blocker" | "bad" | "기타"
   - "risk_summary": 이용자 관점에서 한 문장 요약 (한국어)
   - "quote": 원문에서 그대로 발췌한 근거 문장 (한국어 원문 그대로, 15~200자)
5. 최대 10개까지만, 가장 중요한 위험 조항 순으로 반환하세요.
6. 결과는 {"findings": [...]} 형식으로만 출력하세요.
`;

export const JUDGE_PROMPT = `당신은 약관 위험 조항 분석 결과를 검수하는 검수자입니다.
아래는 하나의 분석 결과입니다:

- 매칭된 위험 기준: {matched_case} ({classification})
- 위험 요약: {risk_summary}
- 근거 인용문: {quote}

이 인용문이 실제로 "매칭된 위험 기준"과 "위험 요약"을 타당하게 뒷받침하는지 판단하세요.
인용문 내용과 위험 기준/요약이 논리적으로 맞지 않으면(예: 인용문은 그냥 일반 법령 준수 조항인데 "개인정보 매각"으로 분류한 경우) 부적절한 매칭입니다.

"VALID" 또는 "INVALID" 중 하나만, 다른 텍스트 없이 정확히 그 단어로만 답하세요.`;

export interface Finding {
  matched_case: string;
  classification: "blocker" | "bad" | "기타";
  risk_summary: string;
  quote: string;
  quote_grounded?: boolean;
  case_match_verdict?: string;
  groundedness_verdict?: "grounded" | "notGrounded" | "notSure";
}

export const SOLAR_CHAT_MODEL = process.env.UPSTAGE_CHAT_MODEL ?? "solar-pro2";
const GROUNDEDNESS_MODEL = "solar-1-mini-groundedness-check";

function getKey(): string {
  const key = process.env.UPSTAGE_API_KEY;
  if (!key) throw new Error("UPSTAGE_API_KEY not set");
  return key;
}

async function chat(
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; model?: string; responseFormat?: Record<string, unknown> } = {},
) {
  const res = await fetch("https://api.upstage.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? SOLAR_CHAT_MODEL,
      messages,
      temperature: 0,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Upstage API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function checkGroundedness(
  context: string,
  answer: string,
): Promise<"grounded" | "notGrounded" | "notSure"> {
  try {
    const result = await chat(
      [
        { role: "user", content: context },
        { role: "assistant", content: answer },
      ],
      { model: GROUNDEDNESS_MODEL, maxTokens: 5 },
    );
    const verdict = String(result.choices?.[0]?.message?.content ?? "").trim();
    if (verdict === "grounded" || verdict === "notGrounded" || verdict === "notSure") {
      return verdict;
    }
    return "notSure";
  } catch (e) {
    console.error("Groundedness Check API 호출 실패:", e);
    return "notSure";
  }
}

function parseFindingsResponse(raw: string): Finding[] {
  let content = raw.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  content = content.trim();
  if (!content) throw new Error("빈 응답입니다.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    if (!content.endsWith("]")) {
      const lastComplete = content.lastIndexOf("},");
      if (lastComplete !== -1) content = content.slice(0, lastComplete + 1) + "]";
      parsed = JSON.parse(content);
    } else {
      throw new Error("AI 응답을 해석하지 못했습니다.");
    }
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "findings" in parsed) {
    const payload = parsed as { findings?: unknown };
    if (!Array.isArray(payload.findings)) throw new Error("모델 응답에서 findings 배열을 찾을 수 없습니다.");
    return payload.findings as Finding[];
  }

  if (!Array.isArray(parsed)) throw new Error("모델 응답 형식이 올바르지 않습니다.");
  return parsed as Finding[];
}

function validateFindings(findings: Finding[]): Finding[] {
  return findings.filter((finding) => {
    if (!finding || typeof finding !== "object") return false;
    if (typeof finding.matched_case !== "string" || typeof finding.risk_summary !== "string" || typeof finding.quote !== "string") {
      return false;
    }
    if (!["blocker", "bad", "기타"].includes(finding.classification)) return false;
    return finding.quote.trim().length > 0;
  });
}

const FINDINGS_JSON_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "terms_findings",
    schema: {
      type: "object",
      properties: {
        findings: {
          type: "array",
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              matched_case: { type: "string" },
              classification: { type: "string", enum: ["blocker", "bad", "기타"] },
              risk_summary: { type: "string" },
              quote: { type: "string" },
            },
            required: ["matched_case", "classification", "risk_summary", "quote"],
          },
        },
      },
      required: ["findings"],
    },
  },
};

export async function generateFindings(
  text: string,
  taxonomy: string,
  priorityPrompt = "",
): Promise<{ findings: Finding[]; usage: unknown }> {
  const doc = text.slice(0, 15000);
  const system = SYSTEM_PROMPT.replace("{taxonomy}", taxonomy) + priorityPrompt;
  const messages = [
    { role: "system", content: system },
    { role: "user", content: `다음은 약관 원문입니다:\n\n${doc}` },
  ];

  let content = "";
  let usage: unknown = {};
  let lastError: unknown;

  for (const useStructuredOutput of [true, false]) {
    try {
      const result = await chat(messages, useStructuredOutput ? { responseFormat: FINDINGS_JSON_SCHEMA } : {});
      content = String(result.choices?.[0]?.message?.content ?? "").trim();
      usage = result.usage ?? {};
      const parsed = parseFindingsResponse(content);
      const findings = validateFindings(parsed);
      const groundedFindings: Finding[] = [];
      for (const finding of findings) {
        const verdict = await checkGroundedness(text, finding.quote ?? "");
        finding.quote_grounded = verdict === "grounded";
        finding.groundedness_verdict = verdict;
        if (verdict === "grounded" || verdict === "notSure") {
          groundedFindings.push(finding);
        }
      }
      return { findings: groundedFindings.slice(0, 10), usage };
    } catch (error) {
      lastError = error;
      if (!useStructuredOutput) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 응답을 해석하지 못했습니다.");
}

export async function judgeCaseMatch(finding: Finding): Promise<string> {
  const prompt = JUDGE_PROMPT.replace("{matched_case}", finding.matched_case ?? "")
    .replace("{classification}", finding.classification ?? "")
    .replace("{risk_summary}", finding.risk_summary ?? "")
    .replace("{quote}", finding.quote ?? "");
  const result = await chat([{ role: "user", content: prompt }], { maxTokens: 5 });
  const content: string = result.choices[0].message.content.trim().toUpperCase();
  return content.includes("VALID") && !content.includes("INVALID") ? "VALID" : "INVALID";
}
