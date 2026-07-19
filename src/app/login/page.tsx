"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { login, signup } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    try {
      if (mode === "signup") {
        const result = await signup({ username, email, password });
        setSuccess(`환영합니다, ${result.user.username}님! 가입이 완료되었습니다.`);
      } else {
        const result = await login({ username, password });
        setSuccess(`${result.user.username}님, 로그인되었습니다.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 text-sm text-neutral-500 transition-colors hover:text-neutral-800"
      >
        ← 약관 X-ray
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
        {mode === "login" ? "로그인" : "회원가입"}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        계정 정보는 GitHub private repo의 users.json에 저장됩니다.
      </p>

      <div className="mt-6 flex gap-2">
        <Button
          type="button"
          variant={mode === "login" ? "default" : "outline"}
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccess(null);
          }}
        >
          로그인
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "default" : "outline"}
          onClick={() => {
            setMode("signup");
            setError(null);
            setSuccess(null);
          }}
        >
          회원가입
        </Button>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700">사용자명</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={2}
          />
        </label>

        {mode === "signup" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-700">이메일</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700">비밀번호</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
          />
        </label>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-700" role="status">
            {success}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-2">
          {pending
            ? "처리 중…"
            : mode === "login"
              ? "로그인"
              : "가입하기"}
        </Button>
      </form>
    </main>
  );
}
