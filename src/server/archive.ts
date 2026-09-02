import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const RECORDINGS_ROOT = join(process.cwd(), "recordings");

export function recordingsEnabled(): boolean {
  const flag = process.env.SAVE_RECORDINGS?.trim().toLowerCase();
  return !(flag === "0" || flag === "false" || flag === "off");
}

export async function archiveScene(input: {
  sessionId: string;
  sceneNumber: number;
  videoUrl: string;
  narration: string;
  summary: string;
  prompt: string;
  expandedPrompt?: string | null;
}): Promise<void> {
  try {
    const directory = join(RECORDINGS_ROOT, input.sessionId);
    await mkdir(directory, { recursive: true });
    const stem = join(directory, `scene-${String(input.sceneNumber).padStart(2, "0")}`);
    const response = await fetch(input.videoUrl, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) return;
    await writeFile(`${stem}.mp4`, Buffer.from(await response.arrayBuffer()));
    await writeFile(
      `${stem}.json`,
      JSON.stringify(
        {
          sceneNumber: input.sceneNumber,
          narration: input.narration,
          summary: input.summary,
          prompt: input.prompt,
          expandedPrompt: input.expandedPrompt ?? null,
          sourceUrl: input.videoUrl,
          savedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } catch {
    // Archiving is best-effort; playback never depends on it.
  }
}
