// Precomputes the document-chunk embedding index for every preset text file,
// so live analysis of a preset doesn't need to call the Embeddings API on
// every request (faster + avoids rate-limit risk with concurrent demo-day
// traffic). Mirrors buildDocumentElements()/splitLongBlock() in src/lib/rag.ts
// exactly -- keep these in sync if that logic changes.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.UPSTAGE_API_KEY;
if (!KEY) throw new Error("UPSTAGE_API_KEY not set (run with --env-file=.env.local)");

const TEXTS_DIR = path.join(process.cwd(), "data", "texts");
const OUT_DIR = path.join(process.cwd(), "data", "preset-index");
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_CHUNK_CHARS = 3000;

// Keep in sync by hand with CHUNK_LOGIC_VERSION in src/lib/rag.ts -- bump
// both whenever the chunking logic below changes, so loadCachedIndex()
// refuses stale cache files instead of silently trusting them.
const CHUNK_LOGIC_VERSION = 1;

function splitLongBlock(block) {
  if (block.length <= MAX_CHUNK_CHARS) return [block];
  const lines = block.split("\n");
  const chunks = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + line.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks.flatMap((chunk) =>
    chunk.length <= MAX_CHUNK_CHARS
      ? [chunk]
      : Array.from({ length: Math.ceil(chunk.length / MAX_CHUNK_CHARS) }, (_, i) =>
          chunk.slice(i * MAX_CHUNK_CHARS, (i + 1) * MAX_CHUNK_CHARS),
        ),
  );
}

function buildDocumentElements(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((block) => splitLongBlock(block));

  const elements = [];
  rawBlocks.forEach((block, index) => {
    const trimmed = block.trim();
    const type = /^\|.*\|/.test(trimmed) ? "table" : "paragraph";
    elements.push({
      id: `element-${index + 1}`,
      type,
      text: trimmed,
      metadata: { sectionType: type },
    });
  });
  if (elements.length === 0) {
    elements.push({ id: "element-1", type: "paragraph", text: normalized, metadata: { sectionType: "paragraph" } });
  }
  return elements;
}

const EMBED_BATCH_SIZE = 50;

async function embedBatch(texts) {
  const res = await fetch("https://api.upstage.ai/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "solar-embedding-1-large-passage", input: texts }),
  });
  if (!res.ok) throw new Error(`Embeddings API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

const files = fs.readdirSync(TEXTS_DIR).filter((f) => f.endsWith(".txt"));
console.log(`${files.length}개 프리셋 문서 처리 시작`);

let done = 0;
let failed = 0;
function isUpToDate(outPath) {
  if (!fs.existsSync(outPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    return !Array.isArray(parsed) && parsed.version === CHUNK_LOGIC_VERSION;
  } catch {
    return false;
  }
}

for (const file of files) {
  const outPath = path.join(OUT_DIR, `${file}.json`);
  if (isUpToDate(outPath)) { done += 1; continue; } // resumable, and re-embeds stale/pre-versioning files
  try {
    const text = fs.readFileSync(path.join(TEXTS_DIR, file), "utf-8");
    const elements = buildDocumentElements(text);
    const embeddings = [];
    for (let i = 0; i < elements.length; i += EMBED_BATCH_SIZE) {
      const batch = elements.slice(i, i + EMBED_BATCH_SIZE);
      const batchEmbeddings = await embedBatch(batch.map((el) => el.text));
      embeddings.push(...batchEmbeddings);
    }
    // Round to 6 decimals -- full float64 JSON precision is unnecessary for
    // cosine similarity and roughly doubles file size for no benefit.
    const records = elements.map((el, i) => ({
      ...el,
      embedding: embeddings[i].map((v) => Math.round(v * 1e6) / 1e6),
    }));
    fs.writeFileSync(outPath, JSON.stringify({ version: CHUNK_LOGIC_VERSION, records }));
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${files.length}`);
  } catch (e) {
    failed += 1;
    console.error(`  실패 ${file}: ${e.message}`);
  }
}
console.log(`완료: ${done}/${files.length}, 실패: ${failed}`);
