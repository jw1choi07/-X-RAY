import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { fetchDocument, CrawlBlocked } from "@/lib/crawl";
import { analyzeDocument } from "@/lib/analyze";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let text: string;
    let meta: { char_count: number; method: string } | null = null;

    if (body.presetFile) {
      const dir = path.join(process.cwd(), "data", "texts");
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
      if (!files.includes(body.presetFile)) {
        return NextResponse.json({ error: "존재하지 않는 프리셋입니다." }, { status: 400 });
      }
      text = fs.readFileSync(path.join(dir, body.presetFile), "utf-8");
      meta = { char_count: text.length, method: "preset" };
    } else if (body.url) {
      const doc = await fetchDocument(body.url);
      text = doc.text;
      meta = { char_count: doc.char_count, method: doc.method };
    } else if (body.text) {
      text = body.text;
      meta = { char_count: text.length, method: "text" };
    } else {
      return NextResponse.json({ error: "url, presetFile, text 중 하나가 필요합니다." }, { status: 400 });
    }

    const result = await analyzeDocument(text);
    return NextResponse.json({ ...result, meta });
  } catch (e) {
    if (e instanceof CrawlBlocked) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
