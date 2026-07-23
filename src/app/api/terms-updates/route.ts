import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { FEATURED_SITES } from "@/lib/featured-sites";
import {
  extractEffectiveDateFromText,
  getTermsUpdateInfo,
  type TermsUpdateEntry,
} from "@/lib/terms-update";

const effectiveDateCache = new Map<string, string | null>();

function readPresetEffectiveDate(presetFile: string): string | null {
  if (presetFile.includes("/") || presetFile.includes("\\") || presetFile.includes("..")) {
    return null;
  }
  if (effectiveDateCache.has(presetFile)) {
    return effectiveDateCache.get(presetFile) ?? null;
  }
  const filePath = path.join(process.cwd(), "data", "texts", presetFile);
  if (!fs.existsSync(filePath)) {
    effectiveDateCache.set(presetFile, null);
    return null;
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const date = extractEffectiveDateFromText(text);
  effectiveDateCache.set(presetFile, date);
  return date;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filesParam = searchParams.get("files");
  const files = filesParam
    ? filesParam.split(",").map((f) => f.trim()).filter(Boolean)
    : FEATURED_SITES.map((site) => site.presetFile);

  const unique = [...new Set(files)].slice(0, 80);
  const updates: Record<string, TermsUpdateEntry> = {};

  for (const presetFile of unique) {
    const effectiveDate = readPresetEffectiveDate(presetFile);
    const info = getTermsUpdateInfo(effectiveDate);
    if (!info) continue;
    updates[presetFile] = { ...info, presetFile };
  }

  return NextResponse.json({ updates });
}
