export const runtime = "nodejs";

declare global {
  var tungSignoffImageCache: Map<string, Promise<Buffer | null>> | undefined;
}

const cache = (globalThis.tungSignoffImageCache ??= new Map());

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function generate(topic: string): Promise<Buffer | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.SIGNOFF_IMAGE_MODEL?.trim() || "gpt-image-2";
  const prompt = `A finished, polished animation title card from a 1970s educational television cartoon, closing a lesson about: ${topic}. Wide 16:9 composition depicting one iconic, instantly readable scene from that topic. Clean confident ink outlines, rich flat cel paint in muted mustard, rust, avocado, and cream, soft paper-grain texture, gentle analog film warmth. Charming, well-drawn, professional Saturday-morning-cartoon quality with appealing shapes and clear silhouettes. Leave calm, uncluttered space near the center for overlaid text. No text, letters, numbers, or logos anywhere in the image.`;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      prompt,
      size: "1536x1024",
      quality: process.env.SIGNOFF_IMAGE_QUALITY?.trim() || "medium",
    }),
    signal: AbortSignal.timeout(150_000),
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  const first = isRecord(payload) && Array.isArray(payload.data) ? payload.data[0] : null;
  const b64 = isRecord(first) && typeof first.b64_json === "string" ? first.b64_json : null;
  return b64 ? Buffer.from(b64, "base64") : null;
}

export async function GET(request: Request): Promise<Response> {
  const topic = new URL(request.url).searchParams.get("topic")?.trim().slice(0, 500) ?? "";
  if (topic.length < 8) return new Response(null, { status: 400 });
  if (!cache.has(topic)) {
    if (cache.size >= 24) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(topic, generate(topic).catch(() => null));
  }
  const image = await cache.get(topic);
  if (!image) {
    cache.delete(topic);
    return new Response(null, { status: 404 });
  }
  return new Response(new Uint8Array(image), {
    headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" },
  });
}
