// Prints fal's rewritten ("expanded") H3 prompt for every scene of a session still held by the dev server,
// plus which parts of the Tung spec survived the rewrite.
// Usage: node scripts/expanded-prompts.mjs <sessionId> [port]
const [sessionId, port = "3000"] = process.argv.slice(2);
if (!sessionId) throw new Error("usage: node scripts/expanded-prompts.mjs <sessionId> [port]");

const response = await fetch(`http://localhost:${port}/api/classroom/${sessionId}`);
if (!response.ok) throw new Error(`session fetch failed ${response.status}`);
const payload = await response.json();
const scenes = payload.outcome?.snapshot?.scenes ?? [];
if (scenes.length === 0) throw new Error(payload.error ?? "no scenes in this session (restarted server?)");

const features = {
  nose: /nose/i,
  cheeks: /cheek/i,
  teeth: /teeth/i,
  irises: /iris/i,
  feet: /feet|toes/i,
  grain: /grain strok/i,
  bat: /\bbat\b/i,
  "no clothing": /no clothing|no tie|no hat/i,
  accent: /American/i,
};
const header = ["scene", "shots", ...Object.keys(features)].join(" | ");
console.log(header);
for (const [index, scene] of scenes.entries()) {
  const text = scene.segment?.expandedPrompt ?? "";
  const shots = (text.match(/\[Shot/g) ?? []).length;
  const row = Object.values(features).map((pattern) => (pattern.test(text) ? "Y" : "-"));
  console.log([String(index + 1).padStart(5), String(shots).padStart(5), ...row].join(" | "));
}
console.log();
for (const [index, scene] of scenes.entries()) {
  console.log(`===== scene ${index + 1} =====`);
  console.log(scene.segment?.expandedPrompt ?? "(no expansion returned)");
  console.log();
}
