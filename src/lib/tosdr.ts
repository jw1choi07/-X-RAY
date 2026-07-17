import fs from "node:fs";
import path from "node:path";

interface TosdrCase {
  title: string;
  description: string;
  classification: string;
}

let cache: TosdrCase[] | null = null;

export function loadRiskTaxonomy(): string {
  if (!cache) {
    const filePath = path.join(process.cwd(), "data", "tosdr-cases.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as TosdrCase[];
    cache = raw.filter((c) => c.classification === "bad" || c.classification === "blocker");
  }
  return cache.map((c) => `- [${c.classification}] ${c.title}: ${c.description}`).join("\n");
}
