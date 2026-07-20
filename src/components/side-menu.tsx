"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import { Filter, ListChecks, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RISK_FILTER_OPTIONS,
  type RiskFilterId,
  type UserPrefs,
} from "@/lib/user-prefs";
import { fetchUserPrefs, updateRiskFilters } from "@/lib/user-prefs-client";

export function SideMenu() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setShowFilters(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || !isSignedIn) return;
    let cancelled = false;
    fetchUserPrefs()
      .then((next) => {
        if (!cancelled) setPrefs(next);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isSignedIn]);

  async function toggleFilter(id: RiskFilterId) {
    if (!prefs) return;
    const next = prefs.riskFilters.includes(id)
      ? prefs.riskFilters.filter((item) => item !== id)
      : [...prefs.riskFilters, id];
    setPrefs({ ...prefs, riskFilters: next });
    setSaving(true);
    setError(null);
    try {
      const saved = await updateRiskFilters(next);
      setPrefs(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 열기"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed top-4 left-3 z-[70] flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-sm ring-1 ring-black/5 backdrop-blur-md transition hover:bg-white dark:bg-neutral-900/80 dark:text-neutral-100 dark:ring-white/10 md:left-4"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <button
          type="button"
          aria-label="메뉴 닫기 배경"
          className="fixed inset-0 z-[75] bg-neutral-900/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex w-[min(22rem,85vw)] flex-col border-r border-neutral-200/80 bg-white/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out md:w-[34vw] md:max-w-[26rem] md:min-w-[18rem] dark:border-neutral-800 dark:bg-neutral-950/95 ${
          open ? "translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Menu
            </p>
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              약관 X-ray
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {!isLoaded && (
            <p className="px-2 text-sm text-neutral-500">불러오는 중…</p>
          )}

          <Show when="signed-out">
            <div className="mx-1 rounded-2xl bg-neutral-50 px-4 py-5 dark:bg-neutral-900">
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                메뉴 기능을 이용하려면 로그인이 필요합니다.
                로그인 후 이용현황과 약관 필터를 사용할 수 있습니다.
              </p>
              <SignInButton mode="modal">
                <Button type="button" className="mt-4 w-full">
                  로그인하러 가기
                </Button>
              </SignInButton>
              <Link
                href="/sign-in"
                className="mt-2 block text-center text-xs text-neutral-500 underline-offset-2 hover:underline"
                onClick={() => setOpen(false)}
              >
                로그인 페이지로 이동
              </Link>
            </div>
          </Show>

          <Show when="signed-in">
            <nav className="flex flex-col gap-1">
              <Link
                href="/my-sites"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  pathname === "/my-sites"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                }`}
              >
                <ListChecks className="h-4 w-4 shrink-0" />
                나의 이용현황
              </Link>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
                  showFilters
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-white"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                }`}
              >
                <Filter className="h-4 w-4 shrink-0" />
                약관 필터
              </button>
            </nav>

            {showFilters && (
              <div className="mt-3 space-y-3 rounded-2xl bg-neutral-50 px-3 py-4 dark:bg-neutral-900">
                <p className="px-1 text-xs leading-relaxed text-neutral-500">
                  선택한 항목은 이후 분석 결과에서 최우선으로 표시됩니다.
                  {saving ? " 저장 중…" : ""}
                </p>
                {error && (
                  <p className="px-1 text-xs text-red-600" role="alert">
                    {error}
                  </p>
                )}
                <ul className="space-y-2">
                  {RISK_FILTER_OPTIONS.map((option) => {
                    const checked = prefs?.riskFilters.includes(option.id) ?? false;
                    return (
                      <li key={option.id}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-2 text-sm text-neutral-700 transition hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-950">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-neutral-300"
                            checked={checked}
                            onChange={() => toggleFilter(option.id)}
                          />
                          <span className="leading-snug">{option.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Show>
        </div>
      </aside>
    </>
  );
}
