export interface DocumentMetadata {
  effective_date: string;
  company_name: string;
  data_retention_period: string;
  contact: string;
  jurisdiction: string;
}

const INFO_EXTRACT_TIMEOUT_MS = 60_000;

const METADATA_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "terms_metadata",
    schema: {
      type: "object",
      properties: {
        effective_date: {
          type: "string",
          description: "약관/방침의 시행일자 또는 최종 개정일 (예: 2024-01-15). 명시되어 있지 않으면 빈 문자열.",
        },
        company_name: {
          type: "string",
          description: "약관을 제공하는 회사명 또는 사업자명",
        },
        data_retention_period: {
          type: "string",
          description: "개인정보 보관기간 (예: 회원 탈퇴 후 90일). 명시되어 있지 않으면 빈 문자열.",
        },
        contact: {
          type: "string",
          description: "개인정보 관련 문의처 (이메일, 전화번호, 담당 부서 등)",
        },
        jurisdiction: {
          type: "string",
          description: "분쟁 발생 시 관할 법원 또는 준거법. 명시되어 있지 않으면 빈 문자열.",
        },
      },
      required: ["effective_date", "company_name", "data_retention_period", "contact", "jurisdiction"],
    },
  },
};

/**
 * Upstage Information Extraction API로 PDF 약관에서 시행일자/사업자명/보관기간
 * 같은 구조화된 메타데이터를 뽑아냅니다. Document Parse(전체 텍스트화)와는 별개
 * 엔드포인트로, PDF 원본을 그대로 multipart 업로드합니다.
 * 참고: https://api.upstage.ai/v1/information-extraction
 */
export async function extractDocumentMetadata(
  pdfBuffer: ArrayBuffer,
  sourceUrl: string,
): Promise<DocumentMetadata | null> {
  const key = process.env.UPSTAGE_API_KEY;
  if (!key) return null;

  try {
    const base64 = Buffer.from(pdfBuffer).toString("base64");
    const res = await fetch("https://api.upstage.ai/v1/information-extraction", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "information-extract",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
            ],
          },
        ],
        response_format: METADATA_SCHEMA,
      }),
      signal: AbortSignal.timeout(INFO_EXTRACT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`Information Extraction API 오류: ${res.status} ${await res.text()} (원본: ${sourceUrl})`);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const parsed = JSON.parse(content) as Partial<DocumentMetadata>;

    return {
      effective_date: parsed.effective_date ?? "",
      company_name: parsed.company_name ?? "",
      data_retention_period: parsed.data_retention_period ?? "",
      contact: parsed.contact ?? "",
      jurisdiction: parsed.jurisdiction ?? "",
    };
  } catch (e) {
    console.error("Information Extraction 실패, 메타데이터 없이 진행:", e);
    return null;
  }
}
