import type { Span } from "./rag";

export const SYSTEM_PROMPT = `당신은 이용약관·개인정보처리방침을 분석해서 이용자에게 위험한 조항을 짚어주는 전문가입니다.
아래는 ToS;DR(국제 약관 감시 프로젝트)이 정의한 "위험 조항 판단 기준" 목록입니다. 이 기준을 참고해서 주어진 약관 원문 안에서 실제로 해당하는 조항을 찾아내세요.

판단 기준 목록:
{taxonomy}

원문은 "[sN] 문장내용" 형식의 번호가 매겨진 문장/행 목록으로 주어집니다. 각 위험 조항의 근거는 이 목록 중 정확히 하나의 항목을 가리키는 quote_id(sN)로만 지정하세요 — 문장을 직접 다시 타이핑하지 마세요.

규칙:
1. quote_id는 반드시 주어진 목록에 실제로 있는 sN 값이어야 합니다. 목록에 없는 내용을 지어내지 마세요.
2. 판단 기준 목록에 없는 위험이어도, 이용자에게 불리하다고 판단되면 "기타"로 분류해 포함하세요.
3. 출력은 반드시 JSON 객체만 반환하세요. 다른 설명 텍스트는 붙이지 마세요.
4. 각 항목은 다음 필드를 가져야 합니다:
   - "matched_case": 매칭된 판단 기준 제목 (없으면 "기타")
   - "classification": "blocker" | "bad" | "기타"
   - "risk_summary": 이용자 관점에서 한 문장 요약 ({summary_language})
   - "quote_id": 근거가 되는 항목의 번호 (예: "s7")
5. 최대 10개까지만, 가장 중요한 위험 조항 순으로 반환하세요.
6. 결과는 {"findings": [...]} 형식으로만 출력하세요.
7. 매칭은 반드시 quote_id로 지정한 그 한 문장/행만 보고 성립해야 합니다. 문서의 다른 곳에서 본 내용을 끌어와 추론하거나, 정황상 그럴듯해서 갖다붙이지 마세요.
   - 예: 표의 한 행이 "전화: 휴대전화 상태 및 기기 식별"이라면, 이 한 줄만으로는 "광범위한 기기 권한 요구(broad device permissions)"가 성립하지 않습니다 — 권한 여러 개가 나열된 문장/행이 있을 때만 그 항목을 인용하세요.
   - 예: 회사명 하나("OO(주)")만 있는 행은 그 자체로는 "필수적이지 않은 제3자 제공"을 증명하지 못합니다 — 목적/이유가 함께 적힌 문장을 인용하세요.
   - "위치정보" 관련 기준은 실제로 GPS/위치 좌표/위치기반서비스를 언급하는 문장에만 매칭하세요. 배송주소, IP주소, 기기정보처럼 위치와 무관한 필드를 "위치정보"로 확대해석하지 마세요.
   - 인용문 자체가 그 위험 기준을 온전히 뒷받침하지 못한다면, 억지로 매칭하지 말고 다른 후보를 찾거나 생략하세요.

예시 (실제 크롤링된 한국 서비스 원문에서 발췌 — matched_case는 반드시 판단 기준 목록에 있는 제목과 정확히 일치시키세요. quote_id 번호는 예시일 뿐, 실제로는 주어진 목록에서 해당 문장의 진짜 번호를 쓰세요):
- [s12] 회원탈퇴일로부터 90일(단, 휴대폰번호, DI는 5년)
  → {"matched_case": "Some personal data may be kept for business interests or legal obligations", "classification": "bad", "risk_summary": "회원 탈퇴 후에도 최대 90일(일부 정보는 5년)간 개인정보가 보관됩니다.", "quote_id": "s12"}
- [s5] 카카오페이 및 제3자 소식∙상품∙혜택∙이벤트∙광고 등 마케팅, 안내 및 알림
  → {"matched_case": "Your personal data may be used for marketing purposes", "classification": "bad", "risk_summary": "수집된 개인정보가 카카오페이 및 제3자의 마케팅·광고 목적으로 활용될 수 있습니다.", "quote_id": "s5"}
- [s21] 회사는 「위치정보의 보호 및 이용 등에 관한 법률」 제16조 제2항에 따라 위치정보 수집∙이용∙제공사실 확인자료를 자동으로 기록되고 보존되도록 합니다. 해당 자료는 6개월간 보관합니다.
  → {"matched_case": "Location data may be collected, used and/or shared", "classification": "bad", "risk_summary": "위치정보 수집·이용·제공 사실이 자동으로 기록되어 6개월간 보관됩니다.", "quote_id": "s21"}
- [s33] Supermatrix, Meta, Naver, Google ads
  → {"matched_case": "This service shares your personal data with third parties that are not essential to its operation", "classification": "bad", "risk_summary": "서비스 운영에 필수적이지 않은 광고 제공업체(Meta, Naver, Google ads 등)와 개인정보가 공유됩니다.", "quote_id": "s33"}
- [s40] IP주소, 웹브라우징, 검색항목, 쿠키 정보/태그/웹비콘, 이메일주소, 전화번호, MAC주소, 기타고유ID, 기기정보
  → {"matched_case": "You are tracked via web beacons, tracking pixels, browser fingerprinting, and/or device fingerprinting", "classification": "bad", "risk_summary": "쿠키·웹비콘·MAC주소 등 기기 식별 정보를 통해 이용자가 추적됩니다.", "quote_id": "s40"}
`;

export const JUDGE_PROMPT = `당신은 약관 위험 조항 분석 결과를 검수하는 검수자입니다.

이 인용문이 실제로 "매칭된 위험 기준"과 "위험 요약"을 타당하게 뒷받침하는지 판단하세요.
인용문 내용과 위험 기준/요약이 논리적으로 맞지 않으면(예: 인용문은 그냥 일반 법령 준수 조항인데 "개인정보 매각"으로 분류한 경우) 부적절한 매칭입니다.

예시 1 (VALID — 인용문이 실제로 해당 위험 기준을 뒷받침함):
- 매칭된 위험 기준: Some personal data may be kept for business interests or legal obligations (bad)
- 위험 요약: 회원 탈퇴 후에도 최대 90일(일부 정보는 5년)간 개인정보가 보관됩니다.
- 근거 인용문: 회원탈퇴일로부터 90일(단, 휴대폰번호, DI는 5년)
→ VALID (인용문이 탈퇴 후 보관기간을 명시하므로 위험 기준과 정확히 일치)

예시 2 (INVALID — 인용문이 위험 기준과 무관함):
- 매칭된 위험 기준: Your personal data is used to employ targeted third-party advertising (bad)
- 위험 요약: 수집된 개인정보가 제3자 맞춤형 광고에 활용됩니다.
- 근거 인용문: 회원탈퇴일로부터 90일(단, 휴대폰번호, DI는 5년)
→ INVALID (인용문은 탈퇴 후 보관기간에 관한 내용일 뿐, 제3자 맞춤형 광고와는 무관함)

이제 아래 실제 분석 결과를 같은 기준으로 판단하세요:

- 매칭된 위험 기준: {matched_case} ({classification})
- 위험 요약: {risk_summary}
- 근거 인용문: {quote}

"VALID" 또는 "INVALID" 중 하나만, 다른 텍스트 없이 정확히 그 단어로만 답하세요.`;

export interface Finding {
  matched_case: string;
  classification: "blocker" | "bad" | "기타";
  risk_summary: string;
  quote: string;
  quote_id?: string;
  quote_grounded?: boolean;
  case_match_verdict?: string;
  groundedness_verdict?: "grounded" | "notGrounded" | "notSure";
}

// Read at call time, not module-load time, so a benchmark script can flip
// process.env.UPSTAGE_CHAT_MODEL between requests without re-importing.
export function getChatModel(): string {
  return process.env.UPSTAGE_CHAT_MODEL ?? "solar-pro2";
}

function getKey(): string {
  const key = process.env.UPSTAGE_API_KEY;
  if (!key) throw new Error("UPSTAGE_API_KEY not set");
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries on 429 (rate limit) with exponential backoff + jitter. Concurrent
// requests -- multiple demo-day visitors, or a finding-heavy document doing
// up to 10 sequential judgeCaseMatch calls -- can trip Upstage's per-second
// limit even when well under any per-minute quota. A transient 429 shouldn't
// surface as a failed analysis.
const MAX_RETRIES = 4;

export async function chat(
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; model?: string; responseFormat?: Record<string, unknown> } = {},
) {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const res = await fetch("https://api.upstage.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model ?? getChatModel(),
        messages,
        temperature: 0,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const backoffMs = 500 * 2 ** attempt + Math.random() * 300;
      await sleep(backoffMs);
      continue;
    }
    lastError = new Error(`Upstage API error: ${res.status} ${await res.text()}`);
    break;
  }
  throw lastError;
}

// Grounding used to be verified by a substring check of the model's re-typed
// quote against the source text, which missed real quotes whenever the model
// reformatted whitespace/punctuation while copying. generateFindings() now
// has the model cite a quote_id (see rag.ts buildSpans) instead of re-typing
// text, and the literal span text is substituted in server-side -- so a
// finding's quote is either a verbatim source excerpt or dropped entirely;
// there is no "notGrounded" state to detect anymore.

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
    if (typeof finding.matched_case !== "string" || typeof finding.risk_summary !== "string" || typeof finding.quote_id !== "string") {
      return false;
    }
    if (!["blocker", "bad", "기타"].includes(finding.classification)) return false;
    return finding.quote_id.trim().length > 0;
  });
}

function buildFindingsSchema(spanIds: string[], matchedCaseTitles: string[]) {
  return {
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
                // Enum-constrained to the exact taxonomy titles offered in this
                // prompt (plus "기타"), same trick as quote_id/span IDs: it makes
                // paraphrased/typo'd/hallucinated case titles structurally
                // impossible instead of just less likely, and guarantees a judge
                // downstream can always look up the case's real definition.
                matched_case: { type: "string", enum: [...matchedCaseTitles, "기타"] },
                classification: { type: "string", enum: ["blocker", "bad", "기타"] },
                risk_summary: { type: "string" },
                quote_id: { type: "string", enum: spanIds },
              },
              required: ["matched_case", "classification", "risk_summary", "quote_id"],
            },
          },
        },
        required: ["findings"],
      },
    },
  };
}

// Caps how many spans get sent to the model -- long documents can produce
// thousands of table-row-sized spans, and the enum of valid IDs in the JSON
// schema grows with them. 15000 chars matches the old whole-context budget.
const MAX_SPAN_CONTEXT_CHARS = 15000;

function truncateSpans(spans: Span[]): Span[] {
  const result: Span[] = [];
  let total = 0;
  for (const span of spans) {
    const cost = span.text.length + span.id.length + 3;
    if (total + cost > MAX_SPAN_CONTEXT_CHARS) break;
    result.push(span);
    total += cost;
  }
  return result.length > 0 ? result : spans.slice(0, 1);
}

// Output-language override for risk_summary -- everything else about the
// pipeline (taxonomy, span citation, judge) stays identical. Added for the
// Japan localization proof-of-concept (see /jp): same engine, same 79 ToS;DR
// cases, only the summary language changes. Defaults to Korean untouched.
const SUMMARY_LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  ja: "일본어(日本語)로, 이용자 관점 한 문장 요약",
};

export async function generateFindings(
  spans: Span[],
  taxonomy: string,
  priorityPrompt = "",
  matchedCaseTitles: string[] = [],
  locale: string = "ko",
): Promise<{ findings: Finding[]; usage: unknown }> {
  const usableSpans = truncateSpans(spans);
  if (usableSpans.length === 0) return { findings: [], usage: {} };
  const spanMap = new Map(usableSpans.map((s) => [s.id, s.text]));
  const spanIds = usableSpans.map((s) => s.id);
  const doc = usableSpans.map((s) => `[${s.id}] ${s.text}`).join("\n");
  const summaryLanguage = SUMMARY_LANGUAGE_NAMES[locale] ?? SUMMARY_LANGUAGE_NAMES.ko;
  const system =
    SYSTEM_PROMPT.replace("{taxonomy}", taxonomy).replace("{summary_language}", summaryLanguage) + priorityPrompt;
  const messages = [
    { role: "system", content: system },
    { role: "user", content: `다음은 약관 원문입니다:\n\n${doc}` },
  ];

  let content = "";
  let usage: unknown = {};
  let lastError: unknown;

  for (const useStructuredOutput of [true, false]) {
    try {
      const result = await chat(
        messages,
        useStructuredOutput ? { responseFormat: buildFindingsSchema(spanIds, matchedCaseTitles) } : {},
      );
      content = String(result.choices?.[0]?.message?.content ?? "").trim();
      usage = result.usage ?? {};
      const parsed = parseFindingsResponse(content);
      // quote_id is resolved to the literal span text here -- a finding
      // whose id doesn't resolve (only possible on the unstructured fallback
      // pass, since the structured pass enum-constrains quote_id to real
      // ids) is dropped rather than shown with a fabricated quote.
      const findings = validateFindings(parsed)
        .map((finding) => {
          const text = spanMap.get(finding.quote_id ?? "");
          if (!text) return null;
          finding.quote = text;
          finding.quote_grounded = true;
          finding.groundedness_verdict = "grounded";
          return finding;
        })
        .filter((f): f is Finding => f !== null);
      return { findings: findings.slice(0, 10), usage };
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
