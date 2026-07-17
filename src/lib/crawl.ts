import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class CrawlBlocked extends Error {}

async function robotsAllowed(url: string): Promise<boolean> {
  try {
    const { origin } = new URL(url);
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": UA } });
    if (!res.ok) return true;
    const text = await res.text();
    const lines = text.split("\n").map((l) => l.trim());
    let applies = false;
    for (const line of lines) {
      const [rawKey, ...rest] = line.split(":");
      if (!rawKey) continue;
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        applies = value === "*";
      } else if (applies && key === "disallow" && value) {
        const path = new URL(url).pathname;
        if (path.startsWith(value)) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

async function fetchStatic(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    return `[PDF 파일 - 별도 파서 필요, 원본 URL: ${url}]`;
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const text = $("body").text();
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

export async function fetchDocument(url: string) {
  if (!(await robotsAllowed(url))) {
    throw new CrawlBlocked(`이 사이트는 robots.txt로 자동 수집을 금지하고 있습니다: ${url}`);
  }
  const text = await fetchStatic(url);
  return { text, method: "static", char_count: text.length };
}
