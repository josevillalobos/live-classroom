// Draws the lobby sprite of the teacher defined in src/lib/classroom-config.ts.
// Usage: node --experimental-strip-types scripts/generate-teacher-sprite.mjs [reference-image] [flatten]
//   (no arguments)      draws the character from its numbered character sheet
//   <reference-image>   redraws that reference as the sprite (the reference is never shipped)
//   <reference> flatten keeps the reference drawing as-is and only pushes it toward flat cel shading
import { readFileSync, writeFileSync } from "node:fs";
import { TEACHER, TEACHER_DESCRIPTION } from "../src/lib/classroom-config.ts";

const referencePath = process.argv[2];
const flatten = process.argv[3] === "flatten";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("OPENAI_API_KEY missing from .env.local");

const POSE =
  `Pose: standing upright and facing the viewer, ${TEACHER.name} holds the marker pen down at one side and raises the other hand in a friendly wave. ` +
  "Style: clean appealing 2D cartoon illustration with crisp dark ink outlines and flat cel shading, like a mascot from an animated series, not a 3D render and not photorealistic. " +
  "Show the entire character head to toe with margin around them. Nothing else in the image: no background, no scenery, no floor, no drop shadow, no text.";

const flattenPrompt =
  "Redraw this exact cartoon character with the same pose, proportions, expression, and design, but in a flat 2D cel-animation style: solid flat color fills, at most one flat darker shadow tone, no gradients, no glossy highlights, no airbrushed or 3D-looking rendering, bold uniform dark ink outlines, big simple eyes with flat white sclera. Keep the fully transparent background and the same framing with the whole character visible. Nothing else in the image: no background, no floor, no drop shadow, no text.";

const fromSheet = `Draw this character as a single full-body 2D cartoon sprite on a fully transparent background. Follow every numbered line exactly.\n\n${TEACHER_DESCRIPTION}\n\n${POSE}`;

const fromReference = `Redraw the character in the reference image as a single full-body 2D cartoon sprite on a fully transparent background, matching this character sheet line by line.\n\n${TEACHER_DESCRIPTION}\n\n${POSE}`;

async function generate() {
  if (!referencePath) {
    return fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: fromSheet,
        size: "1024x1536",
        quality: "medium",
        background: "transparent",
      }),
    });
  }
  const type = referencePath.endsWith(".webp") ? "image/webp" : referencePath.endsWith(".jpg") ? "image/jpeg" : "image/png";
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", new File([readFileSync(referencePath)], `reference.${type.split("/")[1]}`, { type }));
  form.append("prompt", flatten ? flattenPrompt : fromReference);
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
if (!response.ok) throw new Error(`OpenAI Images failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
const payload = await response.json();
const b64 = payload.data?.[0]?.b64_json;
if (!b64) throw new Error("no image in response");
writeFileSync(new URL("../public/teacher-standing.png", import.meta.url), Buffer.from(b64, "base64"));
console.log("wrote public/teacher-standing.png");
