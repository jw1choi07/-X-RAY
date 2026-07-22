// Re-processes the low-grounding, table-heavy privacy policies through
// Upstage Document Parse instead of flat BeautifulSoup text extraction,
// so table rows/columns survive instead of getting jumbled together.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.UPSTAGE_API_KEY;
if (!KEY) throw new Error("UPSTAGE_API_KEY not set");

const TARGETS = {
  "쿠팡": "https://privacy.coupang.com/ko/center/coupang/",
  "11번가": "https://privacy.11st.co.kr/",
  "업비트": "https://static.upbit.com/terms/private_data.html",
  "원티드": "https://www.wanted.co.kr/privacy",
};

const OUT_DIRS = [
  path.join(process.cwd(), "..", "data", "texts"),
  path.join(process.cwd(), "data", "texts"),
];

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.text();
}

async function documentParse(html, filename) {
  const form = new FormData();
  form.append("model", "document-parse");
  form.append("output_formats", '["markdown"]');
  form.append("document", new Blob([html], { type: "text/html" }), filename);

  const res = await fetch("https://api.upstage.ai/v1/document-digitization", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Document Parse error: ${res.status} ${await res.text()}`);
  return res.json();
}

for (const [name, url] of Object.entries(TARGETS)) {
  process.stdout.write(`${name}: fetching ${url}...\n`);
  try {
    const html = await fetchHtml(url);
    process.stdout.write(`  html ${html.length} bytes, parsing...\n`);
    const result = await documentParse(html, `${name}.html`);
    const markdown = result.content?.markdown ?? "";
    if (!markdown || markdown.length < 500) {
      console.log(`  실패: markdown too short (${markdown.length} chars), skipping`);
      continue;
    }
    console.log(`  성공: ${markdown.length} chars markdown`);
    for (const dir of OUT_DIRS) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${name}_개인정보처리방침.txt`), markdown, "utf-8");
    }
  } catch (e) {
    console.error(`  실패: ${e.message}`);
  }
}
