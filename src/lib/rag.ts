import fs from "node:fs";
import path from "node:path";
import { cosineSimilarity, embedPassages, embedQuery } from "./embed";

export interface DocumentElement {
  id: string;
  type: "paragraph" | "table" | "section";
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalFilter {
  agency?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  sectionType?: string;
}

export interface DocumentRecord {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

function metadataMatches(record: DocumentRecord, filters: RetrievalFilter): boolean {
  if (filters.agency && String(record.metadata.agency ?? "").toLowerCase() !== filters.agency.toLowerCase()) {
    return false;
  }
  if (filters.category && String(record.metadata.category ?? "").toLowerCase() !== filters.category.toLowerCase()) {
    return false;
  }
  if (filters.sectionType && String(record.metadata.sectionType ?? "").toLowerCase() !== filters.sectionType.toLowerCase()) {
    return false;
  }
  const date = String(record.metadata.postedAt ?? "");
  if (filters.startDate && date && date < filters.startDate) return false;
  if (filters.endDate && date && date > filters.endDate) return false;
  return true;
}

// Upstage's embedding-passage model caps input at 4000 tokens (~2 chars/token
// for Korean observed in practice). Splitting only on blank lines (\n{2,})
// leaves dense blocks -- especially markdown tables, which have no blank
// lines between rows -- as a single huge element; one Document Parse table
// hit 112K tokens in one block and made the whole request fail. Cap chunk
// size and, for oversized blocks, split further along line boundaries.
const MAX_CHUNK_CHARS = 3000;

function splitLongBlock(block: string): string[] {
  if (block.length <= MAX_CHUNK_CHARS) return [block];
  const lines = block.split("\n");
  const chunks: string[] = [];
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
  // A single line longer than MAX_CHUNK_CHARS (no line breaks at all) still
  // needs a hard cut, otherwise it passes through unsplit.
  return chunks.flatMap((chunk) =>
    chunk.length <= MAX_CHUNK_CHARS
      ? [chunk]
      : Array.from({ length: Math.ceil(chunk.length / MAX_CHUNK_CHARS) }, (_, i) =>
          chunk.slice(i * MAX_CHUNK_CHARS, (i + 1) * MAX_CHUNK_CHARS),
        ),
  );
}

export function buildDocumentElements(text: string, metadata: Record<string, unknown> = {}): DocumentElement[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((block) => splitLongBlock(block));

  const elements: DocumentElement[] = [];
  rawBlocks.forEach((block, index) => {
    const trimmed = block.trim();
    const type = /^\|.*\|/.test(trimmed) ? "table" : "paragraph";
    elements.push({
      id: `element-${index + 1}`,
      type,
      text: trimmed,
      metadata: {
        ...metadata,
        sectionType: type,
      },
    });
  });

  if (elements.length === 0) {
    elements.push({
      id: "element-1",
      type: "paragraph",
      text: normalized,
      metadata: { ...metadata, sectionType: "paragraph" },
    });
  }

  return elements;
}

const EMBED_BATCH_SIZE = 50;

/**
 * Embeds every element's text via the real Upstage Embeddings API (batched).
 * Previously this called a fake bag-of-words "embedding" (an array of 1s per
 * unique token) that made cosine similarity meaningless -- retrieval was
 * effectively random, which is why long documents sometimes had their only
 * risky chunk skipped entirely (see 원티드 case, 2026-07-22).
 */
export async function createRetrievalIndex(
  elements: DocumentElement[],
  baseMetadata: Record<string, unknown> = {},
): Promise<DocumentRecord[]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < elements.length; i += EMBED_BATCH_SIZE) {
    const batch = elements.slice(i, i + EMBED_BATCH_SIZE);
    const batchEmbeddings = await embedPassages(batch.map((el) => el.text));
    embeddings.push(...batchEmbeddings);
  }
  return elements.map((element, index) => ({
    id: element.id ?? `doc-${index + 1}`,
    content: element.text,
    metadata: { ...baseMetadata, ...element.metadata },
    embedding: embeddings[index],
  }));
}

/**
 * Loads a precomputed embedding index for a preset document (built offline
 * via scripts/embed-presets.mjs) instead of calling the Embeddings API live.
 * Avoids per-request embedding latency/cost/rate-limit exposure for the 147
 * preset documents users pick from most often. Returns null if no cache
 * exists (e.g. the preset was added after the cache was last built, or this
 * is a URL/pasted-text analysis) -- callers should fall back to
 * createRetrievalIndex() in that case.
 */
export function loadCachedIndex(presetFile: string, baseMetadata: Record<string, unknown> = {}): DocumentRecord[] | null {
  const cachePath = path.join(process.cwd(), "data", "preset-index", `${presetFile}.json`);
  if (!fs.existsSync(cachePath)) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as (DocumentElement & { embedding: number[] })[];
    return cached.map((el) => ({
      id: el.id,
      content: el.text,
      metadata: { ...baseMetadata, ...el.metadata },
      embedding: el.embedding,
    }));
  } catch (e) {
    console.error(`프리셋 임베딩 캐시 로드 실패 (${presetFile}):`, e);
    return null;
  }
}

// Matches runs of Hangul syllables, Latin letters, or digits as "words".
// Korean has no whitespace between words the way English does and we have no
// morphological analyzer available, so this is a crude tokenizer -- but legal
// boilerplate ("제3자", "위치정보", "보관기간") tends to appear as fixed
// compounds, which this catches well enough for keyword scoring purposes.
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[가-힣]+|[a-zA-Z0-9]+/g) ?? []).filter((t) => t.length > 1);
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

/**
 * Real keyword scoring (BM25) over the current retrieval pool, computed
 * fresh per query since the pool is just this one document's elements/spans
 * rather than a shared corpus. Embedding similarity alone (the previous
 * "hybridSearchElements" despite its name) rewards semantically-close text
 * but can miss exact legal terms ("제3자 제공", "위치정보") when a chunk's
 * embedding drifts slightly off -- BM25 catches those by exact term overlap
 * instead, so combining the two covers each other's blind spot.
 */
function bm25Scores(query: string, records: DocumentRecord[]): Map<string, number> {
  const queryTerms = Array.from(new Set(tokenize(query)));
  const docTokens = records.map((r) => tokenize(r.content));
  const docLengths = docTokens.map((t) => t.length);
  const avgDocLength = docLengths.reduce((s, l) => s + l, 0) / (docLengths.length || 1);

  const df = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const tokens of docTokens) {
      if (tokens.includes(term)) count += 1;
    }
    df.set(term, count);
  }

  const N = records.length;
  const scores = new Map<string, number>();
  records.forEach((record, i) => {
    const tokens = docTokens[i];
    const dl = docLengths[i];
    let score = 0;
    for (const term of queryTerms) {
      const tf = tokens.filter((t) => t === term).length;
      if (tf === 0) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);
      score += idf * ((tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (dl / (avgDocLength || 1)))));
    }
    scores.set(record.id, score);
  });
  return scores;
}

function normalize(values: number[]): (v: number) => number {
  const max = Math.max(...values, 0);
  if (max <= 0) return () => 0;
  return (v) => v / max;
}

// Embeddings get more weight (0.65) since they still carry most of the
// semantic recall; BM25 (0.35) mainly rescues exact-term matches embeddings
// miss rather than replacing them.
const EMBEDDING_WEIGHT = 0.65;

export async function hybridSearchElements(
  query: string,
  elements: DocumentElement[],
  options: {
    filters?: RetrievalFilter;
    topK?: number;
    baseMetadata?: Record<string, unknown>;
    precomputedIndex?: DocumentRecord[];
  } = {},
): Promise<DocumentElement[]> {
  const filters = options.filters ?? {};
  const topK = options.topK ?? 6;
  const allRecords = options.precomputedIndex ?? (await createRetrievalIndex(elements, options.baseMetadata ?? {}));
  const records = allRecords.filter((record) => metadataMatches(record, filters));
  const queryEmbedding = await embedQuery(query);

  const keywordScores = bm25Scores(query, records);
  const normalizeKeyword = normalize(Array.from(keywordScores.values()));
  const normalizeEmbedding = normalize(records.map((r) => cosineSimilarity(queryEmbedding, r.embedding)));

  const ranked = records
    .map((record) => {
      const embeddingScore = normalizeEmbedding(cosineSimilarity(queryEmbedding, record.embedding));
      const keywordScore = normalizeKeyword(keywordScores.get(record.id) ?? 0);
      const lengthBonus = record.content.length > 200 ? 0.05 : 0;
      return {
        record,
        score: EMBEDDING_WEIGHT * embeddingScore + (1 - EMBEDDING_WEIGHT) * keywordScore + lengthBonus,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked.map(({ record }) => {
    const element = elements.find((item) => item.id === record.id);
    return element ?? { id: record.id, type: "paragraph", text: record.content, metadata: record.metadata };
  });
}

export function buildContextText(elements: DocumentElement[]): string {
  return elements.map((element) => element.text).join("\n\n");
}

export interface Span {
  id: string;
  text: string;
}

const MAX_SENTENCE_CHARS = 220;

// Splits a paragraph-length line further along Korean sentence-ending
// punctuation ("다.", "함.", "니다." + following space) so a single dense
// paragraph doesn't become one giant span the model has to quote wholesale.
function splitIntoSentences(line: string): string[] {
  if (line.length <= MAX_SENTENCE_CHARS) return [line];
  const parts = line.split(/(?<=[다함음됨]\.)\s+/);
  return parts.flatMap((part) =>
    part.length <= MAX_SENTENCE_CHARS
      ? [part]
      : Array.from({ length: Math.ceil(part.length / MAX_SENTENCE_CHARS) }, (_, i) =>
          part.slice(i * MAX_SENTENCE_CHARS, (i + 1) * MAX_SENTENCE_CHARS),
        ),
  );
}

/**
 * Splits retrieved elements into small, uniquely-IDed spans (table
 * rows / lines / sentences) so the model can cite an exact span instead of
 * re-typing a quote from memory. The literal span text is then substituted
 * back in server-side (see generateFindings in solar.ts), which makes
 * "원문 미확인" quotes structurally impossible for anything the model
 * actually points at -- it can only ever cite spans that are verbatim
 * substrings of the source document.
 */
export function buildSpans(elements: DocumentElement[]): Span[] {
  const spans: Span[] = [];
  let counter = 1;
  for (const element of elements) {
    const lines = element.text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      for (const sentence of splitIntoSentences(line)) {
        const trimmed = sentence.trim();
        if (trimmed.length < 8) continue; // too short to be a meaningful quote
        spans.push({ id: `s${counter}`, text: trimmed });
        counter += 1;
      }
    }
  }
  return spans;
}

export function buildSpanContextText(spans: Span[]): string {
  return spans.map((span) => `[${span.id}] ${span.text}`).join("\n");
}
