import { loadRiskTaxonomy } from "./tosdr";
import { generateFindings, judgeCaseMatch, type Finding } from "./solar";

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, "");
}

function quoteIsGrounded(quote: string, sourceText: string): boolean {
  return normalizeWs(sourceText).includes(normalizeWs(quote));
}

export async function analyzeDocument(text: string) {
  const taxonomy = loadRiskTaxonomy();
  const { findings, usage } = await generateFindings(text, taxonomy);

  for (const f of findings as Finding[]) {
    const grounded = quoteIsGrounded(f.quote ?? "", text);
    f.quote_grounded = grounded;
    if (grounded) {
      try {
        f.case_match_verdict = await judgeCaseMatch(f);
      } catch (e) {
        f.case_match_verdict = `판정실패:${(e as Error).message}`;
      }
    } else {
      f.case_match_verdict = "SKIPPED_UNGROUNDED";
    }
  }

  return { findings, usage };
}
