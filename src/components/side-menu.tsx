"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import { Filter, ListChecks, Menu, Sparkles, X } from "lucide-react";
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

  // Fires once per session, only on an actual signed-out -> signed-in
  // transition (not on page load for an already-logged-in user), so this
  // approximates a sign-in conversion event rather than every visit.
  const wasSignedInRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    if (wasSignedInRef.current === false && isSignedIn) {
      sendGAEvent("event", "sign_in_success", {});
    }
    wasSignedInRef.current = isSignedIn ?? false;
  }, [isLoaded, isSignedIn]);

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
        className="fixed top-4 left-3 z-[70] flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-md transition hover:border-scan/40 md:left-4"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <button
          type="button"
          aria-label="메뉴 닫기 배경"
          className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex w-[min(22rem,85vw)] flex-col border-r border-border bg-card/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out md:w-[34vw] md:max-w-[26rem] md:min-w-[18rem] ${
          open ? "translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-scan uppercase">
              Menu
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
              약관 X-ray
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
          {!isLoaded && (
            <p className="px-2 text-sm text-muted-foreground">불러오는 중…</p>
          )}

          <nav className="mb-3 flex flex-col gap-1">
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                pathname === "/pricing"
                  ? "bg-scan/15 text-scan ring-1 ring-scan/30"
                  : "text-scan hover:bg-scan/10"
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              유료 구독 · Pro
            </Link>
          </nav>

          <Show when="signed-out">
            <div className="mx-1 rounded-md border border-border bg-muted/40 px-4 py-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                메뉴 기능을 이용하려면 로그인이 필요합니다.
                로그인 후 이용현황과 약관 필터를 사용할 수 있습니다.
              </p>
              <SignInButton mode="modal">
                <Button
                  type="button"
                  className="mt-4 w-full rounded-md"
                  onClick={() => sendGAEvent("event", "sign_in_click", { source: "side_menu_modal" })}
                >
                  로그인하러 가기
                </Button>
              </SignInButton>
              <Link
                href="/sign-in"
                className="mt-2 block text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  sendGAEvent("event", "sign_in_click", { source: "side_menu_page" });
                  setOpen(false);
                }}
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
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                  pathname === "/my-sites"
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <ListChecks className="h-4 w-4 shrink-0" />
                나의 이용현황
              </Link>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium transition-colors ${
                  showFilters
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Filter className="h-4 w-4 shrink-0" />
                약관 필터
              </button>
            </nav>

            {showFilters && (
              <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/40 px-3 py-4">
                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                  선택한 항목은 이후 분석 결과에서 최우선으로 표시됩니다.
                  {saving ? " 저장 중…" : ""}
                </p>
                {error && (
                  <p className="px-1 text-xs text-risk-blocker" role="alert">
                    {error}
                  </p>
                )}
                <ul className="space-y-2">
                  {RISK_FILTER_OPTIONS.map((option) => {
                    const checked = prefs?.riskFilters.includes(option.id) ?? false;
                    return (
                      <li key={option.id}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm text-foreground transition hover:bg-card">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-border accent-scan"
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
