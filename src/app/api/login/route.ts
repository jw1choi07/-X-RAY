import { NextResponse } from "next/server";
import { signAuthToken, verifyPassword } from "@/lib/auth";
import { readUsersFile } from "@/lib/github-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };

    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "사용자명과 비밀번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    const { users } = await readUsersFile();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    // 사용자 존재 여부를 숨기기 위해 동일한 메시지 사용
    if (!user) {
      return NextResponse.json(
        { error: "사용자명 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "사용자명 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = await signAuthToken({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "로그인에 실패했습니다.";
    console.error("[login]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
