import fs from "node:fs";
import path from "node:path";
import { getSiteCategory, type SiteCategory } from "@/lib/site-categories";

const JUNK_PHRASES = [
  "Your browser is not compatible",
  "Skip to main content",
  "Enable JavaScript",
  "브라우저가 지원되지",
];

// Some presets were crawled from JS-rendered sites and only captured nav/boilerplate,
// not the actual terms text — filter those out so users don't get ungrounded results.
export function isUsablePresetText(text: string): boolean {
  if (text.length < 500) return false;
  if (JUNK_PHRASES.some((p) => text.slice(0, 300).includes(p))) return false;
  const koreanChars = (text.match(/[가-힣]/g) ?? []).length;
  const koreanRatio = koreanChars / text.length;
  return koreanRatio >= 0.15;
}

export interface Preset {
  file: string;
  label: string;
  siteName: string;
  category: SiteCategory;
}

export function listUsablePresets(): Preset[] {
  const dir = path.join(process.cwd(), "data", "texts");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .filter((f) => isUsablePresetText(fs.readFileSync(path.join(dir, f), "utf-8")))
    .sort();
  return files.map((f) => {
    const nameKey = f.replace(/\.txt$/, "").replace(/_(개인정보처리방침|이용약관)$/, "");
    const siteName = nameKey.split("_")[0];
    return {
      file: f,
      label: f.replace(".txt", "").replace(/_/g, " · "),
      siteName,
      category: getSiteCategory(nameKey),
    };
  });
}
