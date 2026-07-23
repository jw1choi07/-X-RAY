import fs from "node:fs";
import path from "node:path";
import { cosineSimilarity, embedQuery } from "./embed";

interface TosdrCase {
  id: number;
  title: string;
  description: string;
  classification: string;
  /** ToS;DR's own severity weight -- was present in the source data but previously dropped by this interface. */
  weight: number;
  /** ToS;DR's topic grouping id (e.g. all "data retention" cases share one topic_id) -- same as above. */
  topic_id: number;
}

interface TosdrCaseEmbedding extends TosdrCase {
  embedding: number[];
}

let cache: TosdrCase[] | null = null;
let embeddingCache: TosdrCaseEmbedding[] | null = null;

function loadCases(): TosdrCase[] {
  if (!cache) {
    const filePath = path.join(process.cwd(), "data", "tosdr-cases.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as TosdrCase[];
    cache = raw.filter((c) => c.classification === "bad" || c.classification === "blocker");
  }
  return cache;
}

function loadCaseEmbeddings(): TosdrCaseEmbedding[] {
  if (!embeddingCache) {
    const filePath = path.join(process.cwd(), "data", "tosdr-case-embeddings.json");
    embeddingCache = JSON.parse(fs.readFileSync(filePath, "utf-8")) as TosdrCaseEmbedding[];
  }
  return embeddingCache;
}

export function formatTaxonomy(cases: TosdrCase[]): string {
  return cases.map((c) => `- [${c.classification}] ${c.title}: ${c.description}`).join("\n");
}

/** All 79 bad/blocker cases, unfiltered -- used as a fallback if embedding retrieval fails. */
export function loadRiskTaxonomy(): string {
  return formatTaxonomy(loadCases());
}

/**
 * Embeds the document text and returns only the topK most semantically relevant
 * ToS;DR cases (by cosine similarity against precomputed case embeddings), instead
 * of dumping all 79 cases into every prompt. Returns the case objects (not just
 * formatted text) so callers can also constrain matched_case to an exact-title enum.
 */
export async function selectRelevantCaseList(docText: string, topK = 15): Promise<TosdrCase[]> {
  try {
    const queryEmbedding = await embedQuery(docText.slice(0, 3000));
    const cases = loadCaseEmbeddings();
    const ranked = cases
      .map((c) => ({ case: c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return ranked.map((r) => r.case);
  } catch (e) {
    console.error("케이스 임베딩 검색 실패, 전체 taxonomy로 폴백:", e);
    return loadCases();
  }
}

export async function selectRelevantCases(docText: string, topK = 15): Promise<string> {
  return formatTaxonomy(await selectRelevantCaseList(docText, topK));
}
