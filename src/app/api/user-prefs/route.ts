import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  isRiskFilterId,
  normalizeUserPrefs,
  type MySite,
  type UserPrefs,
} from "@/lib/user-prefs";

const META_KEY = "xrayPrefs";

function readPrefsFromMetadata(metadata: Record<string, unknown> | undefined): UserPrefs {
  return normalizeUserPrefs(metadata?.[META_KEY]);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const prefs = readPrefsFromMetadata(user.privateMetadata as Record<string, unknown>);

  return NextResponse.json({ prefs });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const incoming = (body as { prefs?: unknown })?.prefs;
  const prefs = normalizeUserPrefs(incoming);

  const nextPrefs: UserPrefs = {
    sites: prefs.sites.slice(0, 50).map(
      (site): MySite => ({
        id: site.id,
        name: site.name.slice(0, 80),
        url: site.url?.slice(0, 2048),
        presetFile: site.presetFile?.slice(0, 200),
        riskLabel: site.riskLabel ?? "미분석",
        riskScore: site.riskScore,
        summary: site.summary?.slice(0, 200),
        lastAnalyzedAt: site.lastAnalyzedAt,
        createdAt: site.createdAt,
      }),
    ),
    riskFilters: prefs.riskFilters.filter(isRiskFilterId).slice(0, 5),
  };

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      [META_KEY]: nextPrefs,
    },
  });

  return NextResponse.json({ prefs: nextPrefs });
}
