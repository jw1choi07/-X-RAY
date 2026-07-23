"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function SiteHeader() {
  const pathname = usePathname();
  const isJp = pathname?.startsWith("/jp") ?? false;

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between py-4 pr-6 pl-16 md:pr-10 md:pl-20">
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-card/90 py-1.5 pr-4 pl-2 shadow-sm backdrop-blur-md">
        <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-muted font-mono text-[10px] font-semibold tracking-tight text-foreground">
          Rx
        </div>
        <h1 className="font-mono text-xs font-semibold tracking-[0.08em] text-foreground uppercase">
          {isJp ? "利用規約 X-ray" : "약관 X-ray"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={isJp ? "/jp/pricing" : "/pricing"}
          className="rounded-md border border-border bg-card px-3.5 py-2 font-mono text-[11px] font-semibold tracking-wide text-foreground backdrop-blur-md transition-colors hover:bg-muted"
        >
          {isJp ? "Pro · ¥990" : "Pro · 9,900원"}
        </Link>

        <a
          href="https://github.com/jw1choi07/-X-RAY"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-md border border-border bg-card/80 px-3.5 py-2 font-mono text-[11px] tracking-wide text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground sm:flex"
        >
          POWERED BY UPSTAGE SOLAR
        </a>

        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-md border border-border bg-card/80 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
            >
              {isJp ? "ログイン" : "로그인"}
            </button>
          </SignInButton>
        </Show>
      </div>
    </header>
  );
}
