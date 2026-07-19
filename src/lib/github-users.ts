/**
 * GitHub Contents API로 users.json 을 읽고/쓰는 헬퍼.
 * PAT(GITHUB_TOKEN)은 서버 환경변수로만 사용합니다.
 */

export type StoredUser = {
  id: string;
  username: string;
  email: string;
  /** bcrypt 해시 — 평문 비밀번호는 절대 저장하지 않음 */
  passwordHash: string;
  createdAt: string;
};

type GitHubContentResponse = {
  sha: string;
  content: string;
  encoding: string;
};

type UsersFile = {
  users: StoredUser[];
  sha: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 이(가) 설정되지 않았습니다.`);
  }
  return value;
}

function getRepoConfig() {
  return {
    token: requireEnv("GITHUB_TOKEN"),
    owner: requireEnv("GITHUB_OWNER"),
    repo: requireEnv("GITHUB_REPO"),
    path: process.env.GITHUB_USERS_PATH ?? "data/users.json",
  };
}

function contentsUrl(owner: string, repo: string, path: string) {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function decodeUsers(contentBase64: string): StoredUser[] {
  const json = Buffer.from(contentBase64, "base64").toString("utf8");
  const parsed = JSON.parse(json) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as StoredUser[];
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { users?: unknown }).users)
  ) {
    return (parsed as { users: StoredUser[] }).users;
  }
  throw new Error("users.json 형식이 올바르지 않습니다. 배열 또는 { users: [] } 이어야 합니다.");
}

/** GitHub에서 users.json 을 읽어옵니다. 파일이 없으면 빈 배열 + sha=null */
export async function readUsersFile(): Promise<UsersFile> {
  const { token, owner, repo, path } = getRepoConfig();
  const res = await fetch(contentsUrl(owner, repo, path), {
    headers: authHeaders(token),
    cache: "no-store",
  });

  if (res.status === 404) {
    return { users: [], sha: null };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub users.json 읽기 실패 (${res.status}): ${body}`);
  }

  const data = (await res.json()) as GitHubContentResponse;
  return {
    users: decodeUsers(data.content),
    sha: data.sha,
  };
}

/** users.json 을 GitHub에 커밋(업데이트)합니다. */
export async function writeUsersFile(
  users: StoredUser[],
  sha: string | null,
  message: string
): Promise<void> {
  const { token, owner, repo, path } = getRepoConfig();
  const content = Buffer.from(JSON.stringify(users, null, 2), "utf8").toString(
    "base64"
  );

  const res = await fetch(contentsUrl(owner, repo, path), {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub users.json 쓰기 실패 (${res.status}): ${body}`);
  }
}
