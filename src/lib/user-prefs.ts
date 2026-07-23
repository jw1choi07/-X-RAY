export type RiskFilterId =
  | "privacy"
  | "financial"
  | "ip"
  | "account"
  | "legal";

export type SiteRiskLabel = "높음" | "보통" | "낮음" | "미분석";

export type MySite = {
  id: string;
  name: string;
  url?: string;
  presetFile?: string;
  riskLabel: SiteRiskLabel;
  riskScore?: number;
  summary?: string;
  /** 약관 시행·개정일 (YYYY-MM-DD) */
  effectiveDate?: string;
  lastAnalyzedAt?: string;
  createdAt: string;
};

export type UserPrefs = {
  sites: MySite[];
  riskFilters: RiskFilterId[];
};

export const EMPTY_USER_PREFS: UserPrefs = {
  sites: [],
  riskFilters: [],
};

export const RISK_FILTER_OPTIONS: {
  id: RiskFilterId;
  label: string;
  keywords: string[];
}[] = [
  {
    id: "privacy",
    label: "개인정보 수집·공유 범위 (Privacy Risk)",
    keywords: ["개인정보", "프라이버시", "제3자", "수집", "공유", "위치", "쿠키", "동의", "privacy"],
  },
  {
    id: "financial",
    label: "금전·결제·환불 조건 (Financial Risk)",
    keywords: ["결제", "환불", "요금", "구독", "청구", "가격", "자동결제", "위약금", "financial"],
  },
  {
    id: "ip",
    label: "콘텐츠 권리 및 저작권 (Intellectual Property Risk)",
    keywords: ["저작권", "지적재산", "콘텐츠", "라이선스", "이용허락", "복제", "intellectual"],
  },
  {
    id: "account",
    label: "계정 제재 및 서비스 중단 (Account Control Risk)",
    keywords: ["계정", "정지", "해지", "서비스 중단", "이용제한", "제재", "영구정지", "account"],
  },
  {
    id: "legal",
    label: "분쟁 해결 및 법적 책무 (Legal & Liability Risk)",
    keywords: ["분쟁", "중재", "준거법", "면책", "책임", "소송", "관할", "배상", "legal"],
  },
];

export function isRiskFilterId(value: unknown): value is RiskFilterId {
  return (
    typeof value === "string" &&
    RISK_FILTER_OPTIONS.some((option) => option.id === value)
  );
}

export function normalizeUserPrefs(raw: unknown): UserPrefs {
  if (!raw || typeof raw !== "object") return { ...EMPTY_USER_PREFS };

  const data = raw as Partial<UserPrefs>;
  const sites = Array.isArray(data.sites)
    ? data.sites.filter((site): site is MySite => {
        return (
          !!site &&
          typeof site === "object" &&
          typeof site.id === "string" &&
          typeof site.name === "string" &&
          typeof site.createdAt === "string"
        );
      })
    : [];

  const riskFilters = Array.isArray(data.riskFilters)
    ? data.riskFilters.filter(isRiskFilterId)
    : [];

  return { sites, riskFilters };
}

export function prioritizeFindings<T extends {
  matched_case: string;
  risk_summary: string;
  quote: string;
  classification: string;
}>(findings: T[], priorityFilters: RiskFilterId[]): T[] {
  if (!priorityFilters.length) return findings;

  const keywordSets = priorityFilters.map((id) => {
    const option = RISK_FILTER_OPTIONS.find((item) => item.id === id);
    return option?.keywords ?? [];
  });

  const scoreOf = (finding: T) => {
    const haystack = `${finding.matched_case} ${finding.risk_summary} ${finding.quote}`.toLowerCase();
    let score = 0;
    keywordSets.forEach((keywords, index) => {
      if (keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
        // 앞쪽 필터일수록 더 높은 우선순위
        score += 100 - index;
      }
    });
    if (finding.classification === "blocker") score += 2;
    if (finding.classification === "bad") score += 1;
    return score;
  };

  return [...findings].sort((a, b) => scoreOf(b) - scoreOf(a));
}

export function buildPriorityPrompt(priorityFilters: RiskFilterId[]): string {
  if (!priorityFilters.length) return "";
  const labels = priorityFilters
    .map((id) => RISK_FILTER_OPTIONS.find((item) => item.id === id)?.label)
    .filter(Boolean);
  return [
    "",
    "이용자가 선택한 최우선 관심 위험 카테고리:",
    ...labels.map((label) => `- ${label}`),
    "위 카테고리에 해당하는 조항을 반드시 먼저, 더 많이 찾아 findings 배열 앞쪽에 배치하세요.",
  ].join("\n");
}

export function overallRiskFromFindings(
  findings: { classification: string }[],
): { riskLabel: SiteRiskLabel; riskScore: number } {
  const blockerCount = findings.filter((f) => f.classification === "blocker").length;
  const badCount = findings.filter((f) => f.classification === "bad").length;
  if (blockerCount > 0) {
    return { riskLabel: "높음", riskScore: Math.min(95, 70 + blockerCount * 8) };
  }
  if (badCount > 0) {
    return { riskLabel: "보통", riskScore: Math.min(75, 50 + badCount * 6) };
  }
  return { riskLabel: "낮음", riskScore: 35 };
}
