import fs from "node:fs";
import path from "node:path";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchDocument, CrawlBlocked } from "@/lib/crawl";
import { analyzeDocument } from "@/lib/analyze";
import { isUsablePresetText } from "@/lib/presets";
import { getCollectionSchedule } from "@/lib/scheduler";
import { isRiskFilterId, normalizeUserPrefs, type RiskFilterId } from "@/lib/user-prefs";

async function loadPriorityFilters(): Promise<RiskFilterId[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const prefs = normalizeUserPrefs(
      (user.privateMetadata as Record<string, unknown> | undefined)?.xrayPrefs,
    );
    return prefs.riskFilters.filter(isRiskFilterId);
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let text: string;
    let meta: { char_count: number; method: string; schedule: string } | null = null;
    if (body.presetFile) {
      if (typeof body.presetFile !== "string" || body.presetFile.includes("/") || body.presetFile.includes("\\")) {
        return NextResponse.json({ error: "존재하지 않는 프리셋입니다." }, { status: 400 });
      }
      const dir = path.join(process.cwd(), "data", "texts");
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
      if (!files.includes(body.presetFile)) {
        return NextResponse.json({ error: "존재하지 않는 프리셋입니다." }, { status: 400 });
      }
      text = fs.readFileSync(path.join(dir, body.presetFile), "utf-8");
      if (!isUsablePresetText(text)) {
        return NextResponse.json(
          { error: "이 프리셋은 원문 크롤링에 실패해 분석할 수 없습니다. 다른 문서를 선택해주세요." },
          { status: 400 },
        );
      }
      meta = { char_count: text.length, method: "preset", schedule: getCollectionSchedule("preset") };
    } else if (body.url) {
      if (typeof body.url !== "string" || body.url.length > 2048) {
        return NextResponse.json({ error: "올바른 URL을 입력해주세요." }, { status: 400 });
      }
      const doc = await fetchDocument(body.url);
      text = doc.text;
      meta = { char_count: doc.char_count, method: doc.method, schedule: getCollectionSchedule("government-notices") };
    } else if (body.text) {
      if (typeof body.text !== "string") {
        return NextResponse.json({ error: "텍스트 형식이 올바르지 않습니다." }, { status: 400 });
      }
      if (body.text.trim().length < 200) {
        return NextResponse.json({ error: "분석하기에는 원문이 너무 짧습니다 (최소 200자)." }, { status: 400 });
      }
      text = body.text.slice(0, 100000);
      meta = { char_count: text.length, method: "text", schedule: getCollectionSchedule("default") };
    } else {
      return NextResponse.json({ error: "url, presetFile, text 중 하나가 필요합니다." }, { status: 400 });
    }

    const priorityFilters = await loadPriorityFilters();
    const result = await analyzeDocument(text, priorityFilters, typeof body.presetFile === "string" ? body.presetFile : undefined);
    return NextResponse.json({ ...result, meta, priorityFilters });
  } catch (e) {
    if (e instanceof CrawlBlocked) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
