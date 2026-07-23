import fs from "node:fs";
import path from "node:path";
import type { Finding } from "./solar";

// Bump whenever SYSTEM_PROMPT/JUDGE_PROMPT/taxonomy or the generation
// pipeline changes meaningfully -- scripts/precompute-findings.ts stamps
// this into every cache file it writes, and loadFindingsCache() below
// refuses a file whose version doesn't match, the same pattern as
// CHUNK_LOGIC_VERSION in rag.ts for the embedding cache.
export const FINDINGS_CACHE_VERSION = 1;

export interface FindingsCacheEntry {
  version: number;
  findings: Finding[];
  usage: Record<string, number>;
}

function cachePath(presetFile: string): string {
  return path.join(process.cwd(), "data", "findings-cache", `${presetFile}.json`);
}

/**
 * Precomputed final analysis result for a preset (see
 * scripts/precompute-findings.ts) -- skips live Solar Pro 2 generation +
 * judge calls entirely for the ~153 documents users pick from a list,
 * instead of only skipping the embedding/retrieval step like the
 * preset-index cache does. Returns null on any miss (no file, stale
 * version, unreadable) so callers fall back to live analysis.
 */
export function loadFindingsCache(presetFile: string): FindingsCacheEntry | null {
  const filePath = cachePath(presetFile);
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as FindingsCacheEntry;
    if (parsed.version !== FINDINGS_CACHE_VERSION) return null;
    return parsed;
  } catch (e) {
    console.error(`findings 캐시 로드 실패 (${presetFile}):`, e);
    return null;
  }
}
