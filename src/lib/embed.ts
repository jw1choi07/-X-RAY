function getKey(): string {
  const key = process.env.UPSTAGE_API_KEY;
  if (!key) throw new Error("UPSTAGE_API_KEY not set");
  return key;
}

const EMBED_QUERY_MODEL = "solar-embedding-1-large-query";
const EMBED_PASSAGE_MODEL = "solar-embedding-1-large-passage";

async function embed(input: string | string[], model: string): Promise<number[][]> {
  const res = await fetch("https://api.upstage.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Upstage Embeddings API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.data as { embedding: number[] }[]).map((d) => d.embedding);
}

export function embedQuery(text: string): Promise<number[]> {
  return embed(text, EMBED_QUERY_MODEL).then((r) => r[0]);
}

export function embedPassages(texts: string[]): Promise<number[][]> {
  return embed(texts, EMBED_PASSAGE_MODEL);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
