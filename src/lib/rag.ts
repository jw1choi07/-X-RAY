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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildEmbedding(text: string): number[] {
  const tokens = tokenize(text);
  const values = Array.from(new Set(tokens)).map((token) => ({ token, score: 1 }));
  return values.map((item) => item.score);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
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

export function buildDocumentElements(text: string, metadata: Record<string, unknown> = {}): DocumentElement[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

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

export function createRetrievalIndex(elements: DocumentElement[], baseMetadata: Record<string, unknown> = {}): DocumentRecord[] {
  return elements.map((element, index) => ({
    id: element.id ?? `doc-${index + 1}`,
    content: element.text,
    metadata: { ...baseMetadata, ...element.metadata },
    embedding: buildEmbedding(element.text),
  }));
}

export function hybridSearchElements(
  query: string,
  elements: DocumentElement[],
  options: {
    filters?: RetrievalFilter;
    topK?: number;
    baseMetadata?: Record<string, unknown>;
  } = {},
): DocumentElement[] {
  const filters = options.filters ?? {};
  const topK = options.topK ?? 6;
  const records = createRetrievalIndex(elements, options.baseMetadata ?? {});
  const queryEmbedding = buildEmbedding(query);
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
