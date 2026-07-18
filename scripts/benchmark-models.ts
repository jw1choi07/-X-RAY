import { readFileSync } from "node:fs";
import path from "node:path";
import { checkGroundedness } from "../src/lib/solar";

interface BenchmarkCase {
  id: string;
  question: string;
  context: string;
}

function loadCases(): BenchmarkCase[] {
  const fixturePath = path.join(process.cwd(), "data", "benchmark-cases.json");
  if (!require("node:fs").existsSync(fixturePath)) {
    return [
      {
        id: "sample-1",
        question: "개인정보를 제3자에 제공하는지 알려줘",
        context: "당사는 수집한 개인정보를 제3자에게 제공하지 않습니다. 사용자의 동의 없이 개인정보를 공유하지 않습니다.",
      },
    ];
  }
  return JSON.parse(readFileSync(fixturePath, "utf8"));
}

async function callModel(model: string, prompt: string): Promise<{ text: string; latencyMs: number }> {
  const start = Date.now();
  const res = await fetch("https://api.upstage.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Model call failed: ${res.status}`);
  const data = await res.json();
  return { text: String(data.choices?.[0]?.message?.content ?? ""), latencyMs: Date.now() - start };
}

async function main() {
  const cases = loadCases();
  const results: Array<Record<string, unknown>> = [];
  for (const testCase of cases) {
    const prompt = `질문: ${testCase.question}\n\n문서:\n${testCase.context}`;
    const [solarPro2, solarPro3] = await Promise.all([
      callModel(process.env.UPSTAGE_CHAT_MODEL ?? "solar-pro2", prompt),
      callModel("solar-pro3", prompt),
    ]);
    const groundedness = await Promise.all([
      checkGroundedness(testCase.context, solarPro2.text),
      checkGroundedness(testCase.context, solarPro3.text),
    ]);
    results.push({
      id: testCase.id,
      solarPro2LatencyMs: solarPro2.latencyMs,
      solarPro3LatencyMs: solarPro3.latencyMs,
      solarPro2Groundedness: groundedness[0],
      solarPro3Groundedness: groundedness[1],
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
