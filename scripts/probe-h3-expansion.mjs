// Renders ONE H3 Max clip (paid: one 480P clip) from a sample beat using the production prompt compiler,
// then prints fal's expanded prompt and which Tung character-sheet lines survived the rewrite.
// Usage: node --experimental-strip-types scripts/probe-h3-expansion.mjs ["visual beat"] ["narration"]
import { readFileSync } from "node:fs";
import { fal } from "@fal-ai/client";
import { compileH3ScenePrompt, H3_MAX_CONFIG } from "../src/lib/classroom-config.ts";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^FAL_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("FAL_KEY missing from .env.local");

const visualAction = process.argv[2] ?? "A simplified cartoon globe rotates, wrapped in a web of glowing interconnected fiber lines.";
const narration = process.argv[3] ?? "It's a high-speed, light-based highway connecting our world in milliseconds.";
const prompt = compileH3ScenePrompt({ sceneNumber: 7, visualAction, narration });
console.log("===== OUR PROMPT =====\n" + prompt + "\n");

fal.config({ credentials: key });
const startedAt = Date.now();
const result = await fal.subscribe(H3_MAX_CONFIG.endpoint, {
  input: {
    prompt,
    duration: H3_MAX_CONFIG.duration,
    resolution: H3_MAX_CONFIG.resolution,
    aspect_ratio: H3_MAX_CONFIG.aspectRatio,
    seed: H3_MAX_CONFIG.seed,
    prompt_expansion_mode: H3_MAX_CONFIG.promptExpansionMode,
  },
  logs: false,
});
const expanded = result.data?.expanded_prompt ?? "(no expansion returned)";
console.log(`===== EXPANDED (${((Date.now() - startedAt) / 1000).toFixed(1)}s total) =====\n` + expanded + "\n");

const features = {
  nose: /nose/i, cheeks: /cheek/i, teeth: /teeth/i, irises: /iris/i, feet: /feet|toes/i,
  "three fingers": /three-finger|three finger/i, "flat top": /flat rounded top|rounded top/i,
  "no clothing": /no clothing|no tie|no hat/i, "no cuts": /no cuts|single continuous|one continuous|locked/i,
  bat: /\bbat\b/i, accent: /American/i,
};
console.log("survived: " + Object.entries(features).map(([k, re]) => `${k}=${re.test(expanded) ? "Y" : "-"}`).join("  "));
console.log("shots: " + (expanded.match(/\[Shot/g) ?? []).length);
console.log("video: " + result.data?.video?.url);
