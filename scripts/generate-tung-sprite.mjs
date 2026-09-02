import { readFileSync, writeFileSync } from "node:fs";

// Redraws a reference photo/render of Tung Tung Tung Sahur as a transparent cartoon sprite.
// Usage: node scripts/generate-tung-sprite.mjs <reference-image> [flatten]   (the reference is never shipped)
// "flatten" keeps the reference drawing as-is and only pushes it toward flat cel shading.
const referencePath = process.argv[2];
const flatten = process.argv[3] === "flatten";
if (!referencePath) throw new Error("pass the path of a reference image of Tung");

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("OPENAI_API_KEY missing from .env.local");

const flattenPrompt =
  "Redraw this exact cartoon character with the same pose, proportions, expression, and design, but in a flat 2D cel-animation style: solid flat color fills, at most one flat darker shadow tone, no gradients, no glossy highlights, no airbrushed or 3D-looking rendering, no detailed wood texture (suggest the wood grain with just a few simple dark line strokes), bold uniform dark ink outlines, big simple eyes with flat white sclera. Keep the fully transparent background and the same framing with the whole character visible. Nothing else in the image: no background, no floor, no drop shadow, no text.";

const prompt = flatten ? flattenPrompt :
  "Redraw the character in the reference image as a single full-body 2D cartoon sprite on a fully transparent background. Keep him instantly recognizable as the same character: the tall narrow wooden log body with its rounded top and bold dark wood-grain streaks, the huge wide-open eyes with big white sclera and dark pupils, the thick arched eyebrows, the long carved nose ridge, the very prominent round cheeks, the enormous toothy grin, the thin wooden stick arms and legs, the big flat bare feet, and the wooden baseball bat. Pose: standing upright and facing the viewer, the bat resting on the ground in one hand, the other hand raised in a friendly wave. Style: clean appealing 2D cartoon illustration with crisp dark ink outlines and flat cel shading, like a mascot from an animated series, not a 3D render and not photorealistic. Show the entire character head to toe with margin around him. Nothing else in the image: no background, no scenery, no floor, no drop shadow, no text.";

const reference = readFileSync(referencePath);
const type = referencePath.endsWith(".webp") ? "image/webp" : referencePath.endsWith(".jpg") ? "image/jpeg" : "image/png";

async function generate() {
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", new File([reference], `reference.${type.split("/")[1]}`, { type }));
  form.append("prompt", prompt);
  form.append("size", "1024x1536");
  form.append("quality", "medium");
  form.append("background", "transparent");
  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
}

const response = await generate();
if (!response.ok) throw new Error(`images/edits failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
const payload = await response.json();
const b64 = payload.data?.[0]?.b64_json;
if (!b64) throw new Error("no image in response");
writeFileSync(new URL("../public/tung-standing.png", import.meta.url), Buffer.from(b64, "base64"));
console.log("wrote public/tung-standing.png");
