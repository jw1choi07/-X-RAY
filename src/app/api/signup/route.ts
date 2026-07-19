import { NextResponse } from "next/server";
import { hashPassword, signAuthToken, validateCredentials } from "@/lib/auth";
import { readUsersFile, writeUsersFile, type StoredUser } from "@/lib/github-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: unknown;
      email?: unknown;
      password?: unknown;
    };

    const validated = validateCredentials(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { username, email, password } = validated;
    const { users, sha } = await readUsersFile();

    const exists = users.some(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() ||
        u.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { error: "이미 사용 중인 사용자명 또는 이메일입니다." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await writeUsersFile(
      [...users, newUser],
      sha,
      `auth: signup ${username}`
    );

    const token = await signAuthToken({
      sub: newUser.id,
      username: newUser.username,
      email: newUser.email,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "회원가입에 실패했습니다.";
    console.error("[signup]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
