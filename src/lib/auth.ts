import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = "7d";

export type AuthTokenPayload = {
  sub: string;
  username: string;
  email: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("환경변수 JWT_SECRET 이(가) 설정되지 않았습니다.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function signAuthToken(
  payload: AuthTokenPayload
): Promise<string> {
  return new SignJWT({
    username: payload.username,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getJwtSecret());
}

export async function verifyAuthToken(
  token: string
): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  const sub = payload.sub;
  const username = payload.username;
  const email = payload.email;

  if (
    typeof sub !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string"
  ) {
    throw new Error("유효하지 않은 토큰입니다.");
  }

  return { sub, username, email };
}

export function validateCredentials(input: {
  username?: unknown;
  email?: unknown;
  password?: unknown;
}): { username: string; email: string; password: string } | { error: string } {
  const username =
    typeof input.username === "string" ? input.username.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!username || username.length < 2) {
    return { error: "사용자명은 2자 이상이어야 합니다." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "올바른 이메일을 입력해 주세요." };
  }
  if (!password || password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  return { username, email, password };
}
