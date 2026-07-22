import * as cheerio from "cheerio";
import { extractDocumentMetadata, extractMetadataFromText, type DocumentMetadata } from "./info-extract";

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

const DOCUMENT_PARSE_TIMEOUT_MS = 60_000;

/**
 * Upstage Document Parse API로 PDF(표/레이아웃 포함)를 마크다운 텍스트로 변환합니다.
 * 참고: https://console.upstage.ai/api/docs/for-agents/raw
 * 표는 마크다운 표 문법으로 보존되어, 이후 청킹 단계에서 행/열 관계가 깨지지 않습니다.
 */
async function parsePdfWithDocumentParse(pdfBuffer: ArrayBuffer, sourceUrl: string): Promise<string> {
  const key = process.env.UPSTAGE_API_KEY;
  if (!key) throw new Error("UPSTAGE_API_KEY not set");

  const form = new FormData();
  form.append("document", new Blob([pdfBuffer], { type: "application/pdf" }), "document.pdf");
  form.append("model", "document-parse");
  form.append("output_formats", "['markdown']");

  const res = await fetch("https://api.upstage.ai/v1/document-digitization", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(DOCUMENT_PARSE_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Document Parse API 오류: ${res.status} ${await res.text()} (원본: ${sourceUrl})`);
  }
  const data = await res.json();
  // 응답 스키마는 콘솔 문서 기준 content.markdown 형태 - 실제 응답을 한 번 찍어보고
  // 필드명이 다르면 아래 경로만 맞춰주면 됩니다.
  const markdown: string | undefined = data?.content?.markdown ?? data?.markdown;
  if (!markdown) throw new Error("Document Parse 응답에서 텍스트를 찾지 못했습니다.");
  return normalizeText(markdown);
}

async function fetchStatic(url: string): Promise<{ html: string; text: string; metadata?: DocumentMetadata | null }> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    try {
      const pdfBuffer = await res.arrayBuffer();
      // Document Parse(전체 텍스트화)와 Information Extraction(구조화 메타데이터)은
      // 서로 독립된 API 호출이라 동시에 실행 -- 메타데이터 추출 실패가 본문 분석을
      // 막지 않도록 별도 함수에서 실패를 흡수하고 null을 반환함.
      const [text, metadata] = await Promise.all([
        parsePdfWithDocumentParse(pdfBuffer, url),
        extractDocumentMetadata(pdfBuffer, url),
      ]);
      return { html: "", text, metadata };
    } catch (e) {
      // Document Parse 실패 시 완전히 죽지 않고, 이유를 알 수 있는 placeholder로 폴백
      console.error("Document Parse 실패:", e);
      return { html: "", text: `[PDF 파싱 실패: ${(e as Error).message}, 원본 URL: ${url}]` };
    }
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
  // Document Parse가 실패했을 때만 placeholder로 취급 (성공 시 실제 텍스트가 오므로 정상 검증 경로를 탐)
  return text.startsWith("[PDF 파싱 실패");
}

function pickLongerText(current: string, candidate: string): string {
  return candidate.length > current.length ? candidate : current;
}

export async function fetchDocument(url: string) {
  assertPublicUrl(url);
  if (!(await robotsAllowed(url))) {
    throw new CrawlBlocked(`이 사이트는 robots.txt로 자동 수집을 금지하고 있습니다: ${url}`);
  }

  const { html, text: staticText, metadata } = await fetchStatic(url);
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

  // PDF 경로는 위에서 이미 Information Extraction으로 메타데이터를 채워뒀고,
  // HTML 경로(정적/embedded/reader 어떤 방식으로 텍스트를 얻었든)는 아직 없으므로
  // 확보된 원문 텍스트로 한 번 더 시도한다 -- 두 경로 모두 같은 "한눈에 보기" 카드로 이어짐.
  const finalMetadata = metadata ?? (await extractMetadataFromText(text));

  return { text, method, char_count: text.length, metadata: finalMetadata };
}
