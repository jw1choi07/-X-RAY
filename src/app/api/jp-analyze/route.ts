import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Serves the precomputed Japan-localization proof-of-concept findings (see
// scripts/precompute-jp-findings.ts) -- static read only, no live pipeline
// call, since this is a small fixed set of demo services, not user input.
const ALLOWED_SLUGS = ["line", "paypay", "rakuten", "mercari"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug || !ALLOWED_SLUGS.includes(slug)) {
      return NextResponse.json({ error: "存在しないサービスです。" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data", "findings-cache-jp", `${slug}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "分析結果が見つかりません。" }, { status: 404 });
    }

    let data: { findings?: unknown; char_count?: number };
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
        findings?: unknown;
        char_count?: number;
      };
    } catch {
      return NextResponse.json({ error: "分析結果を読み込めませんでした。" }, { status: 500 });
    }

    return NextResponse.json({
      findings: data.findings,
      meta: { char_count: data.char_count, method: "jp-preset" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
