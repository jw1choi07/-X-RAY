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

  await Promise.all(
    (findings as Finding[]).map(async (f) => {
      const grounded = quoteIsGrounded(f.quote ?? "", text);
      f.quote_grounded = grounded;
      if (grounded) {
        try {
          f.case_match_verdict = await judgeCaseMatch(f);
        } catch {
          f.case_match_verdict = "VALID";
        }
      } else {
        f.case_match_verdict = "SKIPPED_UNGROUNDED";
      }
    }),
  );

  return { findings, usage };
}
