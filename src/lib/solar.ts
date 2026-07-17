export const SYSTEM_PROMPT = `당신은 이용약관·개인정보처리방침을 분석해서 이용자에게 위험한 조항을 짚어주는 전문가입니다.
아래는 ToS;DR(국제 약관 감시 프로젝트)이 정의한 "위험 조항 판단 기준" 목록입니다. 이 기준을 참고해서 주어진 약관 원문 안에서 실제로 해당하는 조항을 찾아내세요.

판단 기준 목록:
{taxonomy}

규칙:
1. 반드시 원문에 실제로 존재하는 문장만 인용하세요. 원문에 없는 내용을 지어내지 마세요.
2. 판단 기준 목록에 없는 위험이어도, 이용자에게 불리하다고 판단되면 "기타"로 분류해 포함하세요.
3. 출력은 JSON 배열만 반환하세요. 다른 설명 텍스트는 붙이지 마세요.
4. 각 항목은 다음 필드를 가져야 합니다:
   - "matched_case": 매칭된 판단 기준 제목 (없으면 "기타")
   - "classification": "blocker" | "bad" | "기타"
   - "risk_summary": 이용자 관점에서 한 문장 요약 (한국어)
   - "quote": 원문에서 그대로 발췌한 근거 문장 (한국어 원문 그대로, 15~200자)
5. 최대 10개까지만, 가장 중요한 위험 조항 순으로 반환하세요.
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
}

function getKey(): string {
  const key = process.env.UPSTAGE_API_KEY;
  if (!key) throw new Error("UPSTAGE_API_KEY not set");
  return key;
}

async function chat(messages: { role: string; content: string }[], maxTokens?: number) {
  const res = await fetch("https://api.upstage.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "solar-pro2",
      messages,
      temperature: 0,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Upstage API error: ${res.status} ${await res.text()}`);
  return res.json();
}

function extractJsonArray(content: string): Finding[] {
  let c = content.trim();
  if (c.startsWith("```")) {
    c = c.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(c);
}

export async function generateFindings(text: string, taxonomy: string): Promise<{ findings: Finding[]; usage: unknown }> {
  const doc = text.slice(0, 15000);
  const result = await chat([
    { role: "system", content: SYSTEM_PROMPT.replace("{taxonomy}", taxonomy) },
    { role: "user", content: `다음은 약관 원문입니다:\n\n${doc}` },
  ]);
  const content = result.choices[0].message.content;
  return { findings: extractJsonArray(content), usage: result.usage ?? {} };
}

export async function judgeCaseMatch(finding: Finding): Promise<string> {
  const prompt = JUDGE_PROMPT.replace("{matched_case}", finding.matched_case ?? "")
    .replace("{classification}", finding.classification ?? "")
    .replace("{risk_summary}", finding.risk_summary ?? "")
    .replace("{quote}", finding.quote ?? "");
  const result = await chat([{ role: "user", content: prompt }], 5);
  const content: string = result.choices[0].message.content.trim().toUpperCase();
  return content.includes("VALID") && !content.includes("INVALID") ? "VALID" : "INVALID";
}
