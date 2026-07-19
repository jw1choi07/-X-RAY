/**
 * 프론트엔드에서 백엔드 auth API를 호출하는 예시 헬퍼.
 * GitHub API는 절대 브라우저에서 직접 호출하지 않습니다.
 */

export type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type AuthError = {
  error: string;
};

const TOKEN_KEY = "xray_auth_token";
const USER_KEY = "xray_auth_user";

async function postAuth(
  path: "/api/signup" | "/api/login",
  body: Record<string, string>
): Promise<AuthResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as AuthResponse | AuthError;
  if (!res.ok) {
    throw new Error(
      "error" in data ? data.error : "요청에 실패했습니다."
    );
  }

  return data as AuthResponse;
}

/** 회원가입 예시 */
export async function signup(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await postAuth("/api/signup", input);
  persistSession(result);
  return result;
}

/** 로그인 예시 */
export async function login(input: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await postAuth("/api/login", input);
  persistSession(result);
  return result;
}

export function persistSession(result: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * 인증이 필요한 API 호출 시 Authorization 헤더에 JWT를 붙이는 예시:
 *
 * const token = getStoredToken();
 * await fetch("/api/some-protected", {
 *   headers: { Authorization: `Bearer ${token}` },
 * });
 */
