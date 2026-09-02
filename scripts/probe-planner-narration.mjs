// Runs the production planner prompt (lifted from lesson-producer.ts) through Gemini once (~1¢) and flags
// narration lines that name Tung or talk about the show — the planner must write first-person teaching only.
// Usage: node scripts/probe-planner-narration.mjs "topic"
import { readFileSync } from "node:fs";
const topic = process.argv[2] ?? "How do diffusion models generate video from a text prompt?";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("GEMINI_API_KEY missing from .env.local");
const source = readFileSync(new URL("../src/server/lesson-producer.ts", import.meta.url), "utf8");
const template = source.match(/return `(Design one continuous[\s\S]*?no preamble or analysis\.)`;/)?.[1];
if (!template) throw new Error("planner template not found in lesson-producer.ts");
const system = source.match(/"(You are a fast, accurate curriculum designer[^"]*)"/)?.[1];
const sceneCount = 12;
const teacherName = source.match(/name: "([^"]+)"/)?.[1]
  ?? readFileSync(new URL("../src/lib/classroom-config.ts", import.meta.url), "utf8").match(/name: "([^"]+)"/)?.[1]
  ?? "Tung";
const prompt = template
  .replaceAll("${TEACHER.name}", teacherName)
  .replaceAll("${sceneCount * CLASSROOM_CONFIG.clipDurationSeconds}", String(sceneCount * 5))
  .replaceAll("${sceneCount}", String(sceneCount))
  .replace("${topic}", topic)
  .replace("${repair}", "");
const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent", {
  method: "POST",
  headers: { "content-type": "application/json", "x-goog-api-key": key },
  body: JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.35, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
  }),
});
if (!response.ok) throw new Error(`gemini ${response.status}: ${(await response.text()).slice(0, 200)}`);
const payload = await response.json();
const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
const plan = JSON.parse(text);
let flagged = 0;
for (const [i, step] of plan.steps.entries()) {
  const bad = new RegExp(`\\b${teacherName}\\b`).test(step.narration) || /this (video|show|classroom|lesson|channel)|\bI (made|created|generated)\b/i.test(step.narration);
  if (bad) flagged += 1;
  console.log(`${String(i + 1).padStart(2)}. ${step.narration}${bad ? "   <-- FLAG" : ""}`);
  console.log(`    visual: ${step.visualAction}`);
}
console.log(`\nflagged narration lines: ${flagged}/${plan.steps.length}`);
