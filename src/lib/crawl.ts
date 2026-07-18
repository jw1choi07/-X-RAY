import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** 정적 HTML 결과가 이보다 짧으면 추가 수집 방식을 시도합니다. */
const MIN_TEXT_LENGTH = 500;

const READER_TIMEOUT_MS = 45_000;

export class CrawlBlocked extends Error {}

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/,
  /^fc[0-9a-f]{2}:/i,
  /^fe80:/i,
];

function assertPublicUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new CrawlBlocked(`올바른 URL이 아닙니다: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CrawlBlocked(`지원하지 않는 프로토콜입니다: ${parsed.protocol}`);
  }
  if (PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(parsed.hostname))) {
    throw new CrawlBlocked(`내부/사설 네트워크 주소는 분석할 수 없습니다: ${parsed.hostname}`);
  }
}

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

function jsonToText(value: unknown, depth = 0): string {
  if (depth > 8) return "";
  if (typeof value === "string") {
    return value.length >= 40 ? value : "";
  }
  if (Array.isArray(value)) {
    return value.map((item) => jsonToText(item, depth + 1)).filter(Boolean).join("\n");
  }
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const preferredKeys = [
    "text",
    "content",
    "body",
    "html",
    "description",
    "articleBody",
    "privacyPolicy",
    "termsOfService",
    "markdown",
    "rawContent",
  ];

  const chunks: string[] = [];
  for (const key of preferredKeys) {
    const part = jsonToText(record[key], depth + 1);
    if (part) chunks.push(part);
  }

  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      const part = jsonToText(nested, depth + 1);
      if (part) chunks.push(part);
    }
  }

  return chunks.join("\n");
}

function extractEmbeddedText(html: string): string {
  const $ = cheerio.load(html);
  const chunks: string[] = [];

  const nextData = $("#__NEXT_DATA__").html();
  if (nextData) {
    try {
      chunks.push(jsonToText(JSON.parse(nextData)));
    } catch {
      /* ignore malformed JSON */
    }
  }

  $('script[type="application/ld+json"], script[type="application/json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      chunks.push(jsonToText(JSON.parse(raw)));
    } catch {
      /* ignore malformed JSON */
    }
  });

  $("script:not([src])").each((_, el) => {
    const content = $(el).html() ?? "";
    const patterns = [
      /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\})\s*;?/,
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?/,
      /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?/,
    ];
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (!match) continue;
      try {
        chunks.push(jsonToText(JSON.parse(match[1])));
      } catch {
        /* ignore malformed JSON */
      }
    }
  });

  return normalizeText(chunks.join("\n"));
}

function stripReaderMetadata(raw: string): string {
  const marker = "Markdown Content:";
  const markerIndex = raw.indexOf(marker);
  if (markerIndex !== -1) {
    return raw.slice(markerIndex + marker.length).trim();
  }
  return raw.trim();
}

async function robotsAllowed(url: string): Promise<boolean> {
  try {
    const { origin } = new URL(url);
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(5000),
    });
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

async function fetchStatic(url: string): Promise<{ html: string; text: string }> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    const placeholder = `[PDF 파일 - 별도 파서 필요, 원본 URL: ${url}]`;
    return { html: "", text: placeholder };
  }
  const html = await res.text();
  return { html, text: htmlToText(html) };
}

async function fetchViaReader(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), READER_TIMEOUT_MS);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        "User-Agent": UA,
        Accept: "text/plain",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Reader API HTTP ${res.status}`);
    return normalizeText(stripReaderMetadata(await res.text()));
  } finally {
    clearTimeout(timer);
  }
}

function isPdfPlaceholder(text: string): boolean {
  return text.startsWith("[PDF 파일");
}

function pickLongerText(current: string, candidate: string): string {
  return candidate.length > current.length ? candidate : current;
}

export async function fetchDocument(url: string) {
  assertPublicUrl(url);
  if (!(await robotsAllowed(url))) {
    throw new CrawlBlocked(`이 사이트는 robots.txt로 자동 수집을 금지하고 있습니다: ${url}`);
  }

  const { html, text: staticText } = await fetchStatic(url);
  let text = staticText;
  let method = "static";

  if (text.length < MIN_TEXT_LENGTH && !isPdfPlaceholder(text)) {
    const embeddedText = extractEmbeddedText(html);
    if (embeddedText.length > text.length) {
      text = embeddedText;
      method = "embedded";
    }
  }

  if (text.length < MIN_TEXT_LENGTH && !isPdfPlaceholder(text)) {
    try {
      const readerText = await fetchViaReader(url);
      text = pickLongerText(text, readerText);
      if (readerText.length >= MIN_TEXT_LENGTH || readerText.length > staticText.length) {
        method = "reader";
      }
    } catch (e) {
      if (text.length < MIN_TEXT_LENGTH) {
        throw new Error(
          `페이지 본문을 가져오지 못했습니다. JavaScript로 렌더링되는 페이지일 수 있습니다. (${(e as Error).message})`,
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
