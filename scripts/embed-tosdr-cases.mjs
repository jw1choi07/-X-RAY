// Precomputes embeddings for all bad/blocker ToS;DR cases so the app doesn't
// need to call the Embeddings API for the (static) case side of retrieval at
// request time -- only the incoming document/query text gets embedded live.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.UPSTAGE_API_KEY;
if (!KEY) throw new Error("UPSTAGE_API_KEY not set (run with env loaded, e.g. via `node --env-file=.env.local`)");

const casesPath = path.join(process.cwd(), "data", "tosdr-cases.json");
const outPath = path.join(process.cwd(), "data", "tosdr-case-embeddings.json");

const allCases = JSON.parse(fs.readFileSync(casesPath, "utf-8"));
const cases = allCases.filter((c) => c.classification === "bad" || c.classification === "blocker");

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

const BATCH_SIZE = 50;
const results = [];
for (let i = 0; i < cases.length; i += BATCH_SIZE) {
  const batch = cases.slice(i, i + BATCH_SIZE);
  const texts = batch.map((c) => `${c.title}: ${c.description}`);
  const embeddings = await embedBatch(texts);
  batch.forEach((c, idx) => {
    results.push({ id: c.id, title: c.title, description: c.description, classification: c.classification, embedding: embeddings[idx] });
  });
  console.log(`embedded ${results.length}/${cases.length}`);
}

fs.writeFileSync(outPath, JSON.stringify(results));
console.log(`wrote ${results.length} case embeddings to ${outPath}`);
