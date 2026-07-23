/** 약관 시행/개정일이 최근인지 판별하는 유틸 */

export const TERMS_UPDATE_WINDOW_DAYS = 30;

export type TermsUpdateInfo = {
  /** YYYY-MM-DD */
  effectiveDate: string;
  daysAgo: number;
  isRecent: boolean;
  /** UI용 짧은 문구 */
  label: string;
};

export type TermsUpdateEntry = TermsUpdateInfo & {
  presetFile: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseFlexibleDate(raw: string, now = new Date()): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const dotted = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotted) {
    return new Date(Number(dotted[1]), Number(dotted[2]) - 1, Number(dotted[3]));
  }

  const korean = s.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (korean) {
    return new Date(Number(korean[1]), Number(korean[2]) - 1, Number(korean[3]));
  }

  const english = s.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (english) {
    const parsed = new Date(`${english[1]} ${english[2]}, ${english[3]}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(s);
  if (!Number.isNaN(fallback.getTime())) {
    // Date 파서가 현재 시각을 붙이는 경우 날짜만 유지
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }

  // "최근" 같은 상대 표현은 지원하지 않음
  void now;
  return null;
}

const DATE_CAPTURE =
  "(\\d{4}\\s*년\\s*\\d{1,2}\\s*월\\s*\\d{1,2}\\s*일|\\d{4}[-./]\\d{1,2}[-./]\\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},?\\s+\\d{4})";

const KEYWORD_PATTERNS: RegExp[] = [
  new RegExp(
    `(?:최종\\s*(?:업데이트|갱신|개정|변경)|시행\\s*(?:일자|일)|개정\\s*(?:일자|일)|변경\\s*(?:일자|일)|업데이트\\s*(?:일자|일)|Effective\\s*Date|Last\\s*updated|Last\\s*modified)\\s*[:：]?\\s*${DATE_CAPTURE}`,
    "i",
  ),
  new RegExp(`${DATE_CAPTURE}\\s*(?:부터\\s*)?(?:시행|개정|적용)`, "i"),
  new RegExp(`(?:시행|개정|적용)\\s*[:：]?\\s*${DATE_CAPTURE}`, "i"),
];

/**
 * 원문에서 시행/개정일 후보를 찾아 가장 최근 날짜를 ISO로 반환합니다.
 * AI 호출 없이 프리셋/캐시 텍스트에 빠르게 쓸 수 있습니다.
 */
export function extractEffectiveDateFromText(text: string): string | null {
  if (!text) return null;

  const head = text.slice(0, 4000);
  const tail = text.slice(Math.max(0, text.length - 2500));
  const sample = `${head}\n${tail}`;

  const candidates: Date[] = [];
  for (const pattern of KEYWORD_PATTERNS) {
    const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const match of sample.matchAll(global)) {
      const parsed = parseFlexibleDate(match[1] ?? "");
      if (parsed) candidates.push(parsed);
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.getTime() - a.getTime());
  return formatDateISO(candidates[0]);
}

export function getTermsUpdateInfo(
  effectiveDateRaw: string | null | undefined,
  now = new Date(),
): TermsUpdateInfo | null {
  if (!effectiveDateRaw?.trim()) return null;
  const date = parseFlexibleDate(effectiveDateRaw, now);
  if (!date || Number.isNaN(date.getTime())) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  // 미래 날짜는 아직 시행 전이므로 "최근 갱신"으로 보지 않음
  if (daysAgo < 0) return null;

  const isRecent = daysAgo <= TERMS_UPDATE_WINDOW_DAYS;
  const label =
    daysAgo === 0
      ? "오늘 갱신"
      : daysAgo === 1
        ? "어제 갱신"
        : `${daysAgo}일 전 갱신`;

  return {
    effectiveDate: formatDateISO(date),
    daysAgo,
    isRecent,
    label,
  };
}
