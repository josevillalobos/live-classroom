import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("OPENAI_API_KEY missing");
const sprite = readFileSync(new URL("../public/tung-standing.png", import.meta.url));
const STYLE = "vintage 1970s American classroom wall poster, screen-printed look with flat inks, slightly faded paper, muted mustard, rust, avocado, cream and teal palette, bold friendly typography";

async function generate(name, prompt, reference) {
  const t = Date.now();
  let response;
  if (reference) {
    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("image[]", new File([sprite], "tung.png", { type: "image/png" }));
    form.append("prompt", prompt);
    form.append("size", "1024x1536");
    form.append("quality", "medium");
    response = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
  } else {
    response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1536", quality: "medium" }),
    });
  }
  if (!response.ok) return `${name}: FAILED ${response.status} ${(await response.text()).slice(0, 160)}`;
  const b64 = (await response.json()).data?.[0]?.b64_json;
  writeFileSync(new URL(`../public/posters/${name}.png`, import.meta.url), Buffer.from(b64, "base64"));
  return `${name}: ok in ${Date.now() - t}ms`;
}

const results = await Promise.all([
  generate("read", `${STYLE}. Use the attached character as the exact reference for Tung, a tall wooden-log cartoon teacher. Poster shows Tung sitting on a tall stack of books, happily reading an open book. The single word "READ" in huge bold letters across the top. No other text.`, true),
  generate("hang-in-there", `${STYLE}. A cute cartoon kitten dangling by its front paws from a tree branch, wide-eyed. The words "HANG IN THERE!" in big bold letters across the bottom. No other text.`, false),
  generate("solar-system", `${STYLE}. Educational science chart of the solar system: the Sun at the left and the planets in a row with simple orbit arcs, each planet drawn in flat colors. Title "OUR SOLAR SYSTEM" at the top in bold letters. Small clean planet name labels only: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.`, false),
]);
console.log(results.join("\n"));
