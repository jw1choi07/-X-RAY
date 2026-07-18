import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** 정적 HTML 결과가 이보다 짧으면 JS 렌더링 폴백을 시도합니다. */
const MIN_TEXT_LENGTH = 500;

const BROWSER_TIMEOUT_MS = 45_000;

export class CrawlBlocked extends Error {}

function normalizeText(raw: string): string {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  return normalizeText($("body").text());
}

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
  return htmlToText(html);
}

async function fetchWithBrowser(url: string): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(url, { waitUntil: "networkidle", timeout: BROWSER_TIMEOUT_MS });

    // SPA가 #root 등에 늦게 렌더링하는 경우를 위해 잠시 대기
    await page
      .waitForFunction(
        () => (document.body?.innerText?.replace(/\s+/g, "")?.length ?? 0) > 200,
        { timeout: 10_000 },
      )
      .catch(() => {});

    const text = await page.locator("body").innerText();
    return normalizeText(text);
  } finally {
    await browser.close();
  }
}

function isPdfPlaceholder(text: string): boolean {
  return text.startsWith("[PDF 파일");
}

export async function fetchDocument(url: string) {
  if (!(await robotsAllowed(url))) {
    throw new CrawlBlocked(`이 사이트는 robots.txt로 자동 수집을 금지하고 있습니다: ${url}`);
  }

  let text = await fetchStatic(url);
  let method = "static";

  if (text.length < MIN_TEXT_LENGTH && !isPdfPlaceholder(text)) {
    try {
      const browserText = await fetchWithBrowser(url);
      if (browserText.length > text.length) {
        text = browserText;
        method = "browser";
      }
    } catch (e) {
      if (text.length < MIN_TEXT_LENGTH) {
        throw new Error(
          `페이지 본문을 가져오지 못했습니다. JavaScript 렌더링이 필요한 페이지일 수 있습니다. (${(e as Error).message})`,
        );
      }
    }
  }

  if (text.length < MIN_TEXT_LENGTH && !isPdfPlaceholder(text)) {
    throw new Error(
      "페이지 본문이 너무 짧습니다. JavaScript로 렌더링되는 페이지이거나, 약관 URL이 아닐 수 있습니다.",
    );
  }

  return { text, method, char_count: text.length };
}
