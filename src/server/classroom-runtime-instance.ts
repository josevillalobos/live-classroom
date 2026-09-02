import "server-only";

import { ClassroomRuntime } from "@/server/classroom-runtime";
import { ClassroomPlaylistRuntime } from "@/server/classroom-playlist-runtime";
import { archiveScene, recordingsEnabled } from "@/server/archive";
import { generateH3MaxClip } from "@/server/fal";
import { classifyFalError } from "@/server/fal-error";
import { compileLessonScene, prepareLesson } from "@/server/lesson-producer";

function falKey(): string | null {
  const key = process.env.FAL_KEY?.trim();
  return key ? key : null;
}

function createRuntime(): ClassroomPlaylistRuntime {
  const worker = new ClassroomRuntime({
    configured: () => falKey() !== null,
    fixture: () => false,
    prepare: async ({ topic, durationSeconds }) => {
      const key = falKey();
      if (!key) {
        return { ok: false, message: "FAL_KEY is missing.", plannerAttemptsUsed: 1 };
      }
      return prepareLesson({ topic, durationSeconds, falKey: key });
    },
    compile: compileLessonScene,
    render: async ({ sessionId, plan }) => {
      const key = falKey();
      if (!key) {
        return {
          ok: false,
          reason: "render-failed",
          message: "FAL_KEY is missing. Add it to .env.local and restart the app.",
        };
      }
      let generated;
      try {
        generated = await generateH3MaxClip({ prompt: plan.prompt, falKey: key });
      } catch (error) {
        const classified = classifyFalError(error);
        const deterministic =
          classified.code === "FAL_CONTENT_REJECTED" || classified.code === "FAL_REQUEST_REJECTED";
        if (deterministic) {
          return { ok: false, reason: "render-failed", message: classified.message };
        }
        const balanceLock = classified.code === "FAL_BALANCE_EXHAUSTED";
        const retries = balanceLock ? 3 : 1;
        const delayMs = balanceLock ? 4_000 : 1_500;
        let lastMessage = classified.message;
        let recovered = null;
        for (let attempt = 0; attempt < retries && recovered === null; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          try {
            recovered = await generateH3MaxClip({ prompt: plan.prompt, falKey: key });
          } catch (retryError) {
            lastMessage = classifyFalError(retryError).message;
          }
        }
        if (recovered === null) {
          return {
            ok: false,
            reason: "render-failed",
            message: `${lastMessage} (after ${retries} retr${retries === 1 ? "y" : "ies"})`,
          };
        }
        generated = recovered;
      }
      if (recordingsEnabled()) {
        void archiveScene({
          sessionId,
          sceneNumber: plan.sceneNumber,
          videoUrl: generated.providerUrl,
          narration: plan.narration,
          summary: plan.summary,
          prompt: plan.prompt,
          expandedPrompt: generated.expandedPrompt,
        });
      }
      return {
        ok: true,
        videoUrl: generated.providerUrl,
        providerUrl: generated.providerUrl,
        expandedPrompt: generated.expandedPrompt,
        timings: generated.timings,
      };
    },
    clear: async () => {},
  });
  return new ClassroomPlaylistRuntime(worker);
}

declare global {
  var tungClassroomRuntimeV5: ClassroomPlaylistRuntime | undefined;
}

export function getClassroomRuntime(): ClassroomPlaylistRuntime {
  globalThis.tungClassroomRuntimeV5 ??= createRuntime();
  return globalThis.tungClassroomRuntimeV5;
}
