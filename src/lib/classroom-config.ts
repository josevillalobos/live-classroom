import type {
  ClassroomPolicy,
  LessonDurationSeconds,
  LessonSceneCount,
} from "@/lib/classroom-types";

// Lessons are spoken in Castilian Spanish, but every prompt sent to fal stays in English: H3's prompt
// rewriter reasons in English and mangles Spanish instructions. Only the narration line the teacher
// says out loud is Spanish, and the prompt says so explicitly.
export const LESSON_LANGUAGE = {
  label: "castellano (español de España)",
  promptLabel: "European Castilian Spanish as spoken in Spain",
} as const;

// The teacher is fully described here and nowhere else. To ship your own character: rewrite
// characterSheet (short numbered lines — fal's prompt rewriter copies lists verbatim but compresses
// prose and silently drops features), set name/showName/voice, and replace public/teacher-standing.png.
export const TEACHER = {
  name: "Megafón",
  showName: "Canal Megafón",
  voice:
    "a warm medium-pitch adult male voice speaking European Castilian Spanish as spoken in Spain (never Latin American Spanish, never English, never any other language or regional accent) with an enthusiastic but relaxed rhythmic delivery",
  characterSheet: [
    "1. Body: one tall upright cartoon megaphone standing on its narrow end, a straight cone that flares into a wide round bell at the top, four times taller than wide.",
    "2. Color: warm mustard yellow as a solid flat fill, with one thick burnt-orange band around the rim of the bell.",
    "3. Eyes: two huge round white eyes with brown irises and black pupils, set close together high on the cone just below the bell.",
    "4. Eyebrows: thick arched dark-brown eyebrows above the eyes.",
    "5. Nose: a clearly visible simple cartoon nose in the middle of the face, between the eyes and the mouth.",
    "6. Cheeks: two round bulging cheeks, one on each side of the face under the eyes.",
    "7. Mouth: a big expressive cartoon mouth with white teeth that moves in sync with every word he says (clear lip sync); he only settles into his wide friendly grin between sentences.",
    "8. Arms: two long thin stick arms with simple three-fingered hands; one hand holds a fat red marker pen at his side in every scene.",
    "9. Legs: two very long thin stick legs. Proportions: if the cone body is 4 units tall, each leg is 3 units long, so the bottom of the cone sits high off the ground and he stands tall like a stilt-walker. Big flat rounded cartoon shoes.",
    "10. Nothing else on him: no clothing, no tie, no hat, no hair, no glasses, no accessories.",
    "11. Drawn as flat 2D cel art with black ink outlines and solid fills; never 3D, never glossy, never metallic.",
  ],
} as const;

export const TEACHER_DESCRIPTION = [
  `${TEACHER.name.toUpperCase()} CHARACTER SHEET (${TEACHER.name} is the only character; keep every numbered line in the final prompt exactly as written, never summarize or omit a line):`,
  ...TEACHER.characterSheet,
].join("\n");

export const CLASSROOM_STYLE =
  "flat 2D hand-drawn cel animation like a 1970s American educational television cartoon: flat cel paint with no gradients, no 3D rendering, no CGI, no photorealism, no glossy surfaces; black ink outlines with slight line boil; a muted limited palette of mustard yellow, burnt orange, rust red, avocado green, olive, cream, and warm brown; simple flat geometric backgrounds with sparse detail; visible paper grain, faint film scratches, and warm faded 16mm film color; limited animation with held poses and snappy movement";

// Voice and editing deliberately match the pre-character-sheet prompt: the user preferred the rewriter's
// cuts, camera moves, and "enthusiastic but relaxed rhythmic delivery"; only the character had to be locked.
export type H3SceneInput = Readonly<{ sceneNumber: number; visualAction: string; narration: string }>;

export function compileH3ScenePrompt(input: H3SceneInput): string {
  const beat = input.visualAction.trim().replace(/[.\s]+$/, "");
  const name = TEACHER.name;
  return [
    `${TEACHER_DESCRIPTION}\nVoice: ${TEACHER.voice}.`,
    `Five-second 16:9 scene ${input.sceneNumber} of one continuous 1970s educational cartoon episode of a marketing show. ${name} is drawn exactly the same in every scene.`,
    `Visual beat: ${beat}. Let the scene use natural editorial cuts, expressive staging, and camera movement when they help the explanation. Any lettering, label, or number drawn on screen is written in Spanish and kept to a few short words.`,
    `${name} speaks this line out loud in ${LESSON_LANGUAGE.promptLabel} with visible lip sync, their mouth shapes matching each word and their eyebrows and gestures animating with the delivery: "${input.narration.trim()}" The line is spoken in Spanish exactly as written, never translated or dubbed into another language. ${name}'s voice is identical in every scene of this episode: ${TEACHER.voice}. Use clear narration and playful diegetic sound effects only. No background music or musical score; the player supplies one continuous soundtrack across scenes.`,
    `STYLE (mandatory): ${CLASSROOM_STYLE}. Never 3D, never CGI, never photorealistic, never modern digital vector art.`,
  ].join("\n\n");
}

// The four topics offered before the first lesson. They set the tone of the channel, so keep them
// concrete marketing questions a small business would actually ask.
export const LOBBY_TOPIC_PICKS = [
  "Cómo escribir una oferta irresistible para un servicio de 500 €",
  "Qué es un embudo de ventas y por dónde se rompe casi siempre",
  "Cómo calcular el CAC y el LTV de un negocio pequeño",
  "Cómo elegir el público de un anuncio sin quemar presupuesto",
] as const;

export const LESSON_DURATION_OPTIONS = [60, 120] as const satisfies readonly LessonDurationSeconds[];

export function sceneCountForDuration(durationSeconds: LessonDurationSeconds): LessonSceneCount {
  return durationSeconds === 60 ? 12 : 24;
}

export const CLASSROOM_CONFIG = {
  clipDurationSeconds: 5,
  durationOptionsSeconds: LESSON_DURATION_OPTIONS,
  startupRunwayScenes: 2,
  startupProductionRunwayScenes: 4,
  steadyRunwayScenes: 4,
  recoveryRunwayScenes: 6,
  videoConcurrency: 2,
  maxLessonScenes: 24,
  maxQueuedLessons: 3,
  maxPlannerAttempts: 2,
  planningAttemptCostCents: 1,
  videoAttemptCostCents: 13,
  localCeilingCents: 1_016,
  maxLogEntries: 160,
  pollIntervalMs: 600,
  startupPollIntervalMs: 300,
} as const satisfies ClassroomPolicy & {
  startupProductionRunwayScenes: number;
  maxLogEntries: number;
  pollIntervalMs: number;
  startupPollIntervalMs: number;
};

export const CLASSROOM_POLICY: ClassroomPolicy = {
  clipDurationSeconds: CLASSROOM_CONFIG.clipDurationSeconds,
  durationOptionsSeconds: LESSON_DURATION_OPTIONS,
  startupRunwayScenes: CLASSROOM_CONFIG.startupRunwayScenes,
  steadyRunwayScenes: CLASSROOM_CONFIG.steadyRunwayScenes,
  recoveryRunwayScenes: CLASSROOM_CONFIG.recoveryRunwayScenes,
  videoConcurrency: CLASSROOM_CONFIG.videoConcurrency,
  maxLessonScenes: CLASSROOM_CONFIG.maxLessonScenes,
  maxQueuedLessons: CLASSROOM_CONFIG.maxQueuedLessons,
  maxPlannerAttempts: CLASSROOM_CONFIG.maxPlannerAttempts,
  videoAttemptCostCents: CLASSROOM_CONFIG.videoAttemptCostCents,
  planningAttemptCostCents: CLASSROOM_CONFIG.planningAttemptCostCents,
  localCeilingCents: CLASSROOM_CONFIG.localCeilingCents,
};

export type LessonQuote = Readonly<{
  sceneCount: LessonSceneCount;
  expectedCents: number;
  protectedMaximumCents: number;
}>;

export function quoteForDuration(durationSeconds: LessonDurationSeconds): LessonQuote {
  const sceneCount = sceneCountForDuration(durationSeconds);
  return {
    sceneCount,
  expectedCents:
      CLASSROOM_CONFIG.planningAttemptCostCents +
      sceneCount * CLASSROOM_CONFIG.videoAttemptCostCents,
    protectedMaximumCents:
      CLASSROOM_CONFIG.maxPlannerAttempts * CLASSROOM_CONFIG.planningAttemptCostCents +
      sceneCount * CLASSROOM_CONFIG.videoAttemptCostCents,
  };
}

export const H3_MAX_CONFIG = {
  endpoint: "minimax/h3-max-turbo/text-to-video",
  duration: CLASSROOM_CONFIG.clipDurationSeconds,
  resolution: "480P",
  aspectRatio: "16:9",
  seed: 314_159,
  promptExpansionMode: "balanced",
} as const;

export const LESSON_PLANNER_CONFIG = {
  targets: [
    { endpoint: "openrouter/router", label: "fal OpenRouter" },
    { endpoint: "fal-ai/any-llm", label: "fal Any LLM" },
  ],
  defaultModel: "google/gemini-2.5-flash-lite",
  geminiModel: "gemini-3.1-flash-lite",
  openRouterModel: "google/gemini-3.5-flash-lite",
  anthropicModel: "claude-haiku-4-5",
  openAiModel: "gpt-5.4-nano",
  preparationMaxTokens: 8_000,
  temperature: 0.35,
} as const;
