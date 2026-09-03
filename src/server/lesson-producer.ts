import "server-only";

import { ApiError, fal } from "@fal-ai/client";
import { isRecord, toLessonStepId, toPrompt } from "@/lib/classroom-boundaries";
import {
  TEACHER,
  CLASSROOM_CONFIG,
  LESSON_PLANNER_CONFIG,
  sceneCountForDuration,
  compileH3ScenePrompt,
} from "@/lib/classroom-config";
import type {
  LessonDurationSeconds,
  LessonLedger,
  LessonPlan,
  LessonStep,
  PreparationResult,
  Prompt,
  ScenePurpose,
  ValidatedScenePlan,
} from "@/lib/classroom-types";
import { plannerProgressionRole } from "@/server/progression-role";

type PlannerRoute =
  | Readonly<{ kind: "gemini"; label: string }>
  | Readonly<{ kind: "openrouter"; label: string }>
  | Readonly<{ kind: "anthropic"; label: string }>
  | Readonly<{ kind: "openai"; label: string }>
  | Readonly<{ kind: "fal"; endpoint: string; label: string }>;

type PlannerOutput = Readonly<{ output: string }>;

type PlannerResponse = Readonly<{
  output: string;
  preparedBy: string;
}>;

const PLANNER_TIMEOUT_MS = 45_000;

function envKey(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function plannerRoutes(): readonly PlannerRoute[] {
  const routes: PlannerRoute[] = [];
  if (envKey("GEMINI_API_KEY")) routes.push({ kind: "gemini", label: "Gemini" });
  if (envKey("OPENROUTER_API_KEY")) routes.push({ kind: "openrouter", label: "OpenRouter" });
  if (envKey("ANTHROPIC_API_KEY")) routes.push({ kind: "anthropic", label: "Anthropic" });
  if (envKey("OPENAI_API_KEY")) routes.push({ kind: "openai", label: envKey("OPENAI_BASE_URL") ? "OpenAI-compatible" : "OpenAI" });
  for (const target of LESSON_PLANNER_CONFIG.targets) {
    routes.push({ kind: "fal", endpoint: target.endpoint, label: target.label });
  }
  return routes;
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  label: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PLANNER_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${label} planning failed with status ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error(`${label} returned an invalid planner response`);
  return payload;
}

function chatCompletionText(payload: Record<string, unknown>, label: string): string {
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const content =
    isRecord(choice) && isRecord(choice.message) && typeof choice.message.content === "string"
      ? choice.message.content
      : null;
  if (!content) throw new Error(`${label} returned an invalid planner response`);
  return content;
}

type SceneDraft = Readonly<{
  narration: string;
  concept: string;
  summary: string;
  visualAction: string;
}>;

function requiredString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`The lesson planner omitted ${field}`);
  }
  return value.trim();
}

function jsonObject(value: string): Record<string, unknown> {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(cleaned);
  if (!isRecord(parsed)) {
    throw new Error("The lesson planner did not return a JSON object");
  }
  return parsed;
}

function parsePlannerResponse(value: unknown): PlannerOutput {
  if (!isRecord(value) || !isRecord(value.data) || typeof value.data.output !== "string") {
    throw new Error("fal returned an invalid lesson-planner response");
  }
  return { output: value.data.output };
}

async function callPlanner(input: {
  falKey: string;
  prompt: string;
  systemPrompt: string;
  maxTokens: number;
  route: PlannerRoute;
}): Promise<PlannerResponse> {
  const route = input.route;
  if (route.kind === "gemini") {
    const model = envKey("GEMINI_PLANNER_MODEL") ?? LESSON_PLANNER_CONFIG.geminiModel;
    const payload = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { "x-goog-api-key": envKey("GEMINI_API_KEY") ?? "" },
      {
        systemInstruction: { parts: [{ text: input.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: {
          temperature: LESSON_PLANNER_CONFIG.temperature,
          maxOutputTokens: input.maxTokens,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      route.label,
    );
    const candidate = Array.isArray(payload.candidates) ? payload.candidates[0] : null;
    const part =
      isRecord(candidate) && isRecord(candidate.content) && Array.isArray(candidate.content.parts)
        ? candidate.content.parts[0]
        : null;
    const text = isRecord(part) && typeof part.text === "string" ? part.text : null;
    if (!text) throw new Error("Gemini returned an invalid planner response");
    return { output: text, preparedBy: `${route.label} / ${model}` };
  }
  if (route.kind === "openrouter") {
    const model = envKey("PLANNER_MODEL") ?? LESSON_PLANNER_CONFIG.openRouterModel;
    const payload = await postJson(
      "https://openrouter.ai/api/v1/chat/completions",
      { authorization: `Bearer ${envKey("OPENROUTER_API_KEY")}` },
      {
        model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.prompt },
        ],
        temperature: LESSON_PLANNER_CONFIG.temperature,
        max_tokens: input.maxTokens,
        reasoning: { enabled: false },
      },
      route.label,
    );
    return { output: chatCompletionText(payload, route.label), preparedBy: `${route.label} / ${model}` };
  }
  if (route.kind === "anthropic") {
    const model = envKey("ANTHROPIC_PLANNER_MODEL") ?? LESSON_PLANNER_CONFIG.anthropicModel;
    const payload = await postJson(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": envKey("ANTHROPIC_API_KEY") ?? "", "anthropic-version": "2023-06-01" },
      {
        model,
        system: input.systemPrompt,
        messages: [{ role: "user", content: input.prompt }],
        temperature: LESSON_PLANNER_CONFIG.temperature,
        max_tokens: input.maxTokens,
      },
      route.label,
    );
    const block = Array.isArray(payload.content) ? payload.content[0] : null;
    const text = isRecord(block) && typeof block.text === "string" ? block.text : null;
    if (!text) throw new Error("Anthropic returned an invalid planner response");
    return { output: text, preparedBy: `${route.label} / ${model}` };
  }
  if (route.kind === "openai") {
    const model = envKey("OPENAI_PLANNER_MODEL") ?? LESSON_PLANNER_CONFIG.openAiModel;
    const reasoningFamily = model.startsWith("gpt-5") || model.startsWith("o");
    // OPENAI_BASE_URL points this route at any OpenAI-compatible server (OpenRouter, Groq, a proxy,
    // or a local model via Ollama/LM Studio); reasoning knobs only apply to OpenAI-hosted families.
    const baseUrl = (envKey("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const payload = await postJson(
      `${baseUrl}/chat/completions`,
      { authorization: `Bearer ${envKey("OPENAI_API_KEY")}` },
      {
        model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.prompt },
        ],
        max_completion_tokens: input.maxTokens,
        ...(reasoningFamily
          ? { reasoning_effort: "none" }
          : { temperature: LESSON_PLANNER_CONFIG.temperature }),
      },
      route.label,
    );
    return { output: chatCompletionText(payload, route.label), preparedBy: `${route.label} / ${model}` };
  }
  fal.config({ credentials: input.falKey });
  const model = envKey("FAL_LLM_MODEL") ?? LESSON_PLANNER_CONFIG.defaultModel;
  const result: unknown = await fal.subscribe(route.endpoint, {
    input: {
      model,
      prompt: input.prompt,
      system_prompt: input.systemPrompt,
      temperature: LESSON_PLANNER_CONFIG.temperature,
      max_tokens: input.maxTokens,
    },
  });
  return {
    ...parsePlannerResponse(result),
    preparedBy: `${route.label} / ${model}`,
  };
}

function repairBlock(error: unknown): string {
  if (error === null) {
    return "";
  }
  return `\nThe previous JSON was invalid because: ${
    error instanceof Error ? error.message : "invalid response"
  }\nReturn a fresh, complete object.\n`;
}

function parseSteps(input: {
  record: Record<string, unknown>;
  count: number;
}): readonly LessonStep[] {
  if (!Array.isArray(input.record.steps) || input.record.steps.length !== input.count) {
    throw new Error(`The lesson planner must return exactly ${input.count} steps`);
  }
  return input.record.steps.map((value, index) => {
    if (!isRecord(value)) {
      throw new Error("The lesson planner returned an invalid step");
    }
    const position = index + 1;
    const concept = requiredString(value, "concept");
    const optionalString = (field: string, fallback: string) => {
      const candidate = value[field];
      return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
    };
    return {
      id: toLessonStepId(`step-${position}`),
      position,
      role: plannerProgressionRole({
        value: value.role,
        position,
        totalPositions: input.count,
      }),
      title: optionalString("title", concept.length > 60 ? `${concept.slice(0, 57)}…` : concept),
      teachingGoal: optionalString("teachingGoal", concept),
      narration: requiredString(value, "narration"),
      concept,
      summary: optionalString("summary", concept),
      visualAction: requiredString(value, "visualAction"),
      required: value.required !== false,
    };
  });
}

function preparationPrompt(
  topic: string,
  sceneCount: number,
  repair: string,
): string {
  return `Diseña una clase de marketing visual, continua, de ${sceneCount * CLASSROOM_CONFIG.clipDurationSeconds} segundos sobre:\n${topic}\n${repair}
Devuelve solo JSON:
{
  "title":"título corto y con gancho de la clase, en español",
  "bigQuestion":"la pregunta de marketing exacta que responde esta clase, en español",
  "suggestedTopics":["pregunta de marketing para la siguiente clase","otra","otra"],
  "steps":[
    {"role":"hook|foundation|mechanism|example|connection|misconception|application|transition|synthesis|recap","narration":"una frase relajada en español que se dice en este plano","concept":"el dato exacto que se enseña, en español","visualAction":"one specific animated demonstration, written in English"}
  ]
}

Idioma:
- "narration", "title", "bigQuestion", "concept", "summary" y "suggestedTopics" van en castellano (español de España), tuteando al espectador. Nada de "ustedes" ni de español latino.
- "visualAction" va SIEMPRE en inglés: es el prompt del modelo de vídeo, no se le lee a nadie. Cualquier rótulo que pidas dibujar en pantalla, descríbelo en inglés pero con el texto en español y de dos o tres palabras como mucho.
- Los anglicismos estándar del sector se dejan tal cual (funnel, copy, lead, CTR, ROAS, CAC, LTV, landing) y se explican la primera vez que aparecen.

Requisitos:
- Exactamente ${sceneCount} pasos ordenados para ${sceneCount} planos consecutivos de cinco segundos.
- Es una sola clase con un arco, no ${sceneCount} versiones en miniatura de la clase entera.
- Empieza con un gancho, monta las bases y el mecanismo, usa ejemplos y aplicaciones, corrige un error frecuente, sintetiza y cierra con un recap.
- Escribe ya la narración, el concepto y la acción visual de cada plano. Ninguna llamada posterior va a reescribir escenas sueltas.
- Cada plano avanza sobre el anterior y cabe en una demostración visual con una narración que se pueda decir con naturalidad en cinco segundos.
- La narración son las palabras del profesor en primera persona, dirigidas a quien aprende. El profesor nunca dice su propio nombre, nunca se refiere a sí mismo, al programa, al aula ni a cómo se hizo el vídeo, y nunca se atribuye el mérito del tema (nada de "el modelo de ${TEACHER.name}").
- En visualAction el profesor es un personaje de dibujos animados llamado ${TEACHER.name}: nómbralo solo así, no describas su aspecto, su ropa ni sus objetos, y no añadas otros personajes.
- Esto es un canal de marketing: estrategia, posicionamiento, oferta, precios, marca, copy, embudos, captación de pago, orgánico, email, retención, analítica. Si el tema que pide el espectador no es de marketing, enséñalo aplicado al marketing.
- Usa marcos y métricas reales (AIDA, PAS, jobs to be done, LTV/CAC, ROAS, CTR, tasa de conversión) y explícalos con palabras llanas.
- No inventes datos, estudios, benchmarks del sector ni cifras de empresas reales. Si aparece un número, que sea aritmética de ejemplo y se vea de dónde sale ("inviertes 100 €, facturas 300 €: ROAS de 3").
- Nada de hacks, atajos ni promesas de resultados garantizados. Cada plano deja algo que el espectador pueda aplicar mañana en un negocio pequeño.
- Varía la puesta en escena, los diagramas, la distancia de cámara y los cortes entre planos contiguos.
- No repitas narraciones, aperturas ni acciones visuales.
- Usa planos de refuerzo donde la duración larga agradezca respirar.
- Incluye exactamente tres preguntas de continuación distintas y naturales en suggestedTopics. Profundizan o ramifican desde esta clase sin repetir su tema.
- Sé riguroso para un público curioso que no es experto en marketing.
- Devuelve el JSON de inmediato, sin preámbulo ni análisis.`;
}

function fallbackSuggestedTopics(input: {
  topic: string;
  title: string;
  bigQuestion: string;
}): readonly [string, string, string] {
  const fit = (value: string) => value.trim().slice(0, 500);
  return [
    fit(`¿Cómo se aplica ${input.title} en un negocio pequeño y con poco presupuesto?`),
    fit(`¿Cuál es el error más frecuente con ${input.topic}?`),
    fit(`¿Qué métrica debería mirar después de entender esto: ${input.bigQuestion}`),
  ];
}

function suggestedTopicsOf(
  value: unknown,
  fallback: readonly [string, string, string],
): readonly [string, string, string] {
  if (!Array.isArray(value) || value.length !== 3) return fallback;
  const topics = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (
    topics.some((topic) => topic.length < 8 || topic.length > 500) ||
    new Set(topics.map((topic) => topic.toLowerCase())).size !== 3
  ) {
    return fallback;
  }
  return [topics[0]!, topics[1]!, topics[2]!];
}

function parseInitialLesson(input: {
  topic: string;
  durationSeconds: LessonDurationSeconds;
  output: string;
  latencyMs: number;
  preparedBy: string;
}): LessonPlan {
  const record = jsonObject(input.output);
  const targetSceneCount = sceneCountForDuration(input.durationSeconds);
  const steps = parseSteps({ record, count: targetSceneCount });
  const title = requiredString(record, "title");
  const bigQuestion = requiredString(record, "bigQuestion");
  return {
    topic: input.topic,
    title,
    bigQuestion,
    durationSeconds: input.durationSeconds,
    targetSceneCount,
    steps,
    preparedBy: input.preparedBy,
    preparationLatencyMs: input.latencyMs,
    suggestedTopics: suggestedTopicsOf(
      record.suggestedTopics,
      fallbackSuggestedTopics({ topic: input.topic, title, bigQuestion }),
    ),
  };
}

export async function prepareLesson(input: {
  topic: string;
  durationSeconds: LessonDurationSeconds;
  falKey: string;
}): Promise<PreparationResult> {
  const startedAtMs = Date.now();
  const sceneCount = sceneCountForDuration(input.durationSeconds);
  let firstError: unknown = null;
  let repairError: unknown = null;
  const routes = plannerRoutes();
  for (let attempt = 0; attempt < CLASSROOM_CONFIG.maxPlannerAttempts; attempt += 1) {
    const route = routes[attempt];
    if (!route) break;
    try {
      const response = await callPlanner({
        falKey: input.falKey,
        prompt: preparationPrompt(input.topic, sceneCount, repairBlock(repairError)),
        systemPrompt:
          "Eres un diseñador de currículo de marketing, rápido y riguroso. Devuelve solo el JSON pedido y reparte una única clase en planos visuales cortos y distintos entre sí.",
        maxTokens: LESSON_PLANNER_CONFIG.preparationMaxTokens,
        route,
      });
      try {
        const lesson = parseInitialLesson({
          topic: input.topic,
          durationSeconds: input.durationSeconds,
          output: response.output,
          latencyMs: Date.now() - startedAtMs,
          preparedBy: response.preparedBy,
        });
        return {
          ok: true,
          lesson,
          ledger: {
            nextStepIndex: 0,
            conceptsPlanned: [],
            recentNarrations: [],
            recentVisuals: [],
          },
          plannerAttemptsUsed: attempt === 0 ? 1 : 2,
        };
      } catch (error) {
        firstError ??= error;
        repairError = error;
      }
    } catch (error) {
      firstError ??= error;
    }
  }
  return {
    ok: false,
    message:
      firstError instanceof ApiError
        ? "Las dos rutas de planificación de fal no estaban disponibles. No se llamó a H3, así que no se ha gastado crédito de vídeo. Vuelve a intentar la clase."
        : firstError instanceof Error
        ? firstError.message
        : "El planificador no ha podido preparar esta clase.",
    plannerAttemptsUsed: 2,
  };
}

function appendRecent(items: readonly string[], value: string): readonly string[] {
  return [...items, value].slice(-4);
}

function compileH3Prompt(draft: SceneDraft, sceneNumber: number): Prompt {
  return toPrompt(compileH3ScenePrompt({ sceneNumber, visualAction: draft.visualAction, narration: draft.narration }));
}

export function compileLessonScene(input: {
  lesson: LessonPlan;
  ledger: LessonLedger;
  sceneNumber: number;
  purpose: ScenePurpose;
}): ValidatedScenePlan {
  const step = input.lesson.steps.find((candidate) => candidate.id === input.purpose.stepId);
  if (!step) {
    throw new Error("The requested lesson step does not exist");
  }
  const draft: SceneDraft = {
    narration: step.narration,
    concept: step.concept,
    summary: step.summary,
    visualAction: step.visualAction,
  };
  const ledgerAfter: LessonLedger = {
    nextStepIndex: input.ledger.nextStepIndex + 1,
    conceptsPlanned: [...input.ledger.conceptsPlanned, draft.concept],
    recentNarrations: appendRecent(input.ledger.recentNarrations, draft.narration),
    recentVisuals: appendRecent(input.ledger.recentVisuals, draft.visualAction),
  };
  return {
    validation: "validated",
    sceneNumber: input.sceneNumber,
    purpose: input.purpose,
    prompt: compileH3Prompt(draft, input.sceneNumber),
    narration: draft.narration,
    captions: [{ startSeconds: 0.2, endSeconds: 4.9, text: draft.narration }],
    concept: draft.concept,
    summary: draft.summary,
    visualAction: draft.visualAction,
    ledgerAfter,
  };
}
