"use client";

import {
  EMPTY_USER_PREFS,
  type RiskFilterId,
  type UserPrefs,
  normalizeUserPrefs,
} from "@/lib/user-prefs";

export async function fetchUserPrefs(): Promise<UserPrefs> {
  const res = await fetch("/api/user-prefs", { cache: "no-store" });
  if (res.status === 401) return { ...EMPTY_USER_PREFS };
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "이용자 설정을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { prefs?: unknown };
  return normalizeUserPrefs(data.prefs);
}

export async function saveUserPrefs(prefs: UserPrefs): Promise<UserPrefs> {
  const res = await fetch("/api/user-prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "이용자 설정을 저장하지 못했습니다.");
  }
  const data = (await res.json()) as { prefs?: unknown };
  return normalizeUserPrefs(data.prefs);
}

/** Pass `base` from local state to avoid GET→PUT races that drop concurrent edits. */
export async function updateRiskFilters(
  riskFilters: RiskFilterId[],
  base?: UserPrefs,
): Promise<UserPrefs> {
  const current = base ?? (await fetchUserPrefs());
  return saveUserPrefs({ ...current, riskFilters });
}

export async function updateSites(
  sites: UserPrefs["sites"],
  base?: UserPrefs,
): Promise<UserPrefs> {
  const current = base ?? (await fetchUserPrefs());
  return saveUserPrefs({ ...current, sites });
}
