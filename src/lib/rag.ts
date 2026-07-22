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
  const records = options.precomputedIndex ?? (await createRetrievalIndex(elements, options.baseMetadata ?? {}));
  const queryEmbedding = await embedQuery(query);
  const ranked = records
    .filter((record) => metadataMatches(record, filters))
    .map((record) => ({
      record,
      score: cosineSimilarity(queryEmbedding, record.embedding) + (record.content.length > 200 ? 0.05 : 0),
    }))
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
