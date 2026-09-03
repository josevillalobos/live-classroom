"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LessonDeck, type SignoffState } from "@/components/lesson-deck";
import { ClassroomSet } from "@/components/classroom-set";
import { CLASSROOM_CONFIG, LOBBY_TOPIC_PICKS, TEACHER } from "@/lib/classroom-config";
import { useClassroom } from "@/hooks/use-classroom";
import { useContinuousSoundtrack } from "@/hooks/use-continuous-soundtrack";

const AUTO_ADVANCE_SECONDS = 10;

type PlaylistLesson = ReturnType<typeof useClassroom>["playlist"][number];

function lineupStatus(lesson: PlaylistLesson): string {
  switch (lesson.kind) {
    case "waiting": return "en la parrilla";
    case "preparing": return "escribiendo";
    case "generating": return `rodando ${lesson.readyScenes}/${lesson.targetScenes}`;
    case "ready": return "lista para emitir";
    case "playing": return "en emisión";
    case "complete": return "emitida";
    case "failed": return "no se pudo emitir";
  }
}

export function Classroom() {
  const classroom = useClassroom();
  const { snapshot } = classroom;
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [queueingTopic, setQueueingTopic] = useState<string | null>(null);
  const [autoAdvanceCancelled, setAutoAdvanceCancelled] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Phones only: the guide starts as a bar over the CRT and opens into a sheet. The desktop
  // layout ignores the class, so defaulting to closed needs no viewport check at render time.
  const [guideOpen, setGuideOpen] = useState(false);
  const phase = snapshot?.phase ?? "idle";
  const experienceActive = snapshot !== null && snapshot.production.kind !== "idle";
  const music = useContinuousSoundtrack(
    Boolean(snapshot?.hasPlaybackBegun && phase !== "complete"),
  );
  const topicLocked = snapshot?.production.kind !== "idle";
  const queuedTopics = useMemo(
    () => new Set(classroom.playlist.slice(1).map((lesson) => lesson.topic.toLowerCase())),
    [classroom.playlist],
  );
  const current = classroom.playlist.find((lesson) => lesson.kind === "playing")
    ?? classroom.playlist.find((lesson) => lesson.kind !== "complete" && lesson.kind !== "failed")
    ?? classroom.playlist[classroom.playlist.length - 1]
    ?? null;
  const upcoming = classroom.playlist.filter(
    (lesson) => lesson !== current && lesson.kind !== "complete" && lesson.kind !== "failed",
  );
  const aired = classroom.playlist.filter((lesson) => lesson.kind === "complete" && lesson !== current);
  const targetScenes = snapshot?.lesson?.targetSceneCount ?? 12;
  const playedScenes = snapshot?.scenes.filter((scene) => scene.kind === "played").length ?? 0;
  const clipSeconds = CLASSROOM_CONFIG.clipDurationSeconds;
  const playingScene = snapshot?.scenes.find((scene) => scene.kind === "playing") ?? null;
  const playingKey = playingScene && snapshot ? `${snapshot.id}:${playingScene.number}` : null;

  // The server only reports whole scenes; assume each clip runs its nominal length and tick between updates.
  const [sceneElapsed, setSceneElapsed] = useState<{ key: string | null; seconds: number }>({ key: null, seconds: 0 });
  useEffect(() => {
    if (!playingKey) return;
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setSceneElapsed({ key: playingKey, seconds: (Date.now() - startedAt) / 1000 }),
      250,
    );
    return () => window.clearInterval(timer);
  }, [playingKey]);
  const elapsedInScene = playingKey && sceneElapsed.key === playingKey
    ? Math.min(clipSeconds, sceneElapsed.seconds)
    : 0;
  const totalSeconds = targetScenes * clipSeconds;
  const playedSeconds = Math.min(totalSeconds, playedScenes * clipSeconds + elapsedInScene);
  const secondsLeft = Math.max(0, Math.ceil(totalSeconds - playedSeconds));
  const progress = totalSeconds > 0 ? playedSeconds / totalSeconds : 0;
  const firstPick = classroom.suggestedTopics[0] ?? null;

  const queueLesson = useCallback(async (nextTopic: string) => {
    music.arm();
    setQueueingTopic(nextTopic);
    await classroom.actions.queueLesson(nextTopic);
    setQueueingTopic(null);
  }, [classroom.actions, music]);

  const [lastPhase, setLastPhase] = useState(phase);
  if (phase !== lastPhase) {
    setLastPhase(phase);
    if (phase !== "complete") setAutoAdvanceCancelled(false);
  }

  const autoAdvanceEligible =
    phase === "complete" &&
    classroom.queuedLessonCount === 0 &&
    firstPick !== null &&
    classroom.actions.canQueue &&
    !autoAdvanceCancelled &&
    queueingTopic === null;

  useEffect(() => {
    if (!autoAdvanceEligible || !firstPick) {
      const reset = window.setTimeout(() => setCountdown(null), 0);
      return () => window.clearTimeout(reset);
    }
    const startedAt = Date.now();
    let fired = false;
    const tick = () => {
      const left = AUTO_ADVANCE_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      setCountdown(Math.max(0, left));
      if (left <= 0 && !fired) {
        fired = true;
        void queueLesson(firstPick);
      }
    };
    const kickoff = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [autoAdvanceEligible, firstPick, queueLesson]);

  const startLesson = () => {
    if (!classroom.actions.canStart || topic.trim().length < 8) return;
    music.arm();
    void classroom.actions.start({ topic, durationSeconds: 60 });
  };

  const addCustomTopic = () => {
    const trimmed = customTopic.trim();
    if (trimmed.length < 8 || !classroom.actions.canQueue || queueingTopic !== null) return;
    setCustomTopic("");
    void queueLesson(trimmed);
  };

  const signoff: SignoffState = phase !== "complete"
    ? null
    : upcoming[0]
      ? { kind: "queued", topic: upcoming[0].topic }
      : classroom.suggestedTopics.length > 0
        ? {
            kind: "picks",
            picks: classroom.suggestedTopics,
            countdown: autoAdvanceEligible ? countdown : null,
            busyTopic: queueingTopic,
            onPick: (pick: string) => {
              setAutoAdvanceCancelled(true);
              void queueLesson(pick);
            },
            onCancel: () => setAutoAdvanceCancelled(true),
          }
        : null;

  return (
    <main className={`classroom-experience ${experienceActive ? "classroom-experience-active" : "classroom-experience-lobby"}`}>
      <ClassroomSet active={experienceActive}>
        <LessonDeck
          intent={classroom.playback}
          music={music}
          onEvent={classroom.actions.reportPlayback}
          phase={phase}
          signoff={signoff}
          topic={snapshot?.topic ?? null}
          warning={snapshot?.warning ?? null}
        />
      </ClassroomSet>

      <div className="experience-notices">
        {snapshot?.fixture && (
          <div className="notice notice-fixture" role="status">
            Modo de verificación: solo medios locales. En este modo no se puede llamar a fal.
          </div>
        )}
        {classroom.connectionError && (
          <div className="notice notice-error" role="alert">{classroom.connectionError}</div>
        )}
      </div>

      {!experienceActive && (
        <section className="chat-overlay lobby-overlay">
          <div className="lobby-host">
            <span aria-hidden="true" className="teacher-avatar teacher-avatar-host" />
            <div className="lobby-prompt">
              <h1>¿Qué quieres aprender hoy de marketing?</h1>
            </div>
          </div>
          <div className="lobby-composer">
            <label className="sr-only" htmlFor="lesson-topic">Tema de la clase</label>
            <textarea
              disabled={topicLocked}
              id="lesson-topic"
              maxLength={500}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                startLesson();
              }}
              placeholder="Enséñame a…"
              rows={2}
              value={topic}
            />
            <button
              className="composer-circle send-circle"
              disabled={!classroom.actions.canStart || topic.trim().length < 8}
              onClick={startLesson}
              type="button"
            >
              →
            </button>
          </div>
          {!topicLocked && (
            <div className="lobby-picks">
              {LOBBY_TOPIC_PICKS.map((pick) => (
                // Filling the box, never starting: a lesson costs real money, so the → stays deliberate.
                <button key={pick} onClick={() => setTopic(pick)} type="button">{pick}</button>
              ))}
            </div>
          )}
          {snapshot && !snapshot.configured && (
            <p className="setup-note">
              Añade <code>FAL_KEY=tu_clave_de_api</code> a <code>.env.local</code> y reinicia <code>npm run dev</code>. La clave nunca llega al navegador.
            </p>
          )}
        </section>
      )}

      {experienceActive && (
        <aside className={`chat-overlay guide ${guideOpen ? "guide-open" : "guide-collapsed"}`}>
          <header className="guide-header">
            <span aria-hidden="true" className="teacher-avatar teacher-avatar-mini" />
            <div className="guide-identity">
              <strong>Guía del canal</strong>
            </div>
            <div className="guide-actions">
              <button
                aria-controls="guide-body"
                aria-expanded={guideOpen}
                className="guide-toggle"
                onClick={() => setGuideOpen((open) => !open)}
                type="button"
              >
                {guideOpen ? "Cerrar ▾" : "Parrilla ▴"}
              </button>
              <button disabled={!classroom.actions.canClear} onClick={() => void classroom.actions.clear()} type="button">
                Nueva clase
              </button>
            </div>
          </header>

          <div className="guide-body" id="guide-body">
            <section className="guide-now">
              <div className="guide-now-head">
                <strong>{snapshot?.lesson?.title ?? current?.topic ?? snapshot?.topic ?? "Sintonizando"}</strong>
                <span className="guide-label">
                  <i className="presence-dot" /> En emisión
                </span>
              </div>
              {snapshot?.lesson?.title && <small>{current?.topic ?? snapshot?.topic}</small>}
              <div className="guide-progress" aria-label={`${Math.round(progress * 100)} por ciento emitido`}>
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="guide-meta">
                <span>{lineupStatus(current ?? { kind: "preparing" } as PlaylistLesson)}</span>
                <span>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} restantes</span>
              </div>
            </section>

            <section className="guide-section">
              <h2 className="guide-title">A continuación</h2>
              {upcoming.length === 0 ? (
                <p className="guide-empty">Nada en cola: {TEACHER.name} emitirá una sugerencia cuando termine esta clase.</p>
              ) : (
                <ol className="guide-queue">
                  {upcoming.map((lesson, index) => (
                    <li key={lesson.sessionId}>
                      <span>{index + 1}</span>
                      <div>
                        <p>{lesson.topic}</p>
                        <small>{lineupStatus(lesson)}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>


            {aired.length > 0 && (
              <section className="guide-section guide-aired">
                <h2 className="guide-title">Ya emitidas</h2>
                <ul>
                  {aired.map((lesson) => <li key={lesson.sessionId}>{lesson.topic}</li>)}
                </ul>
              </section>
            )}
          </div>

          <div className="guide-add">
            <h2 className="guide-title">Añadir a la cola</h2>
            <div className="guide-add-row">
            <label className="sr-only" htmlFor="custom-topic">Añadir un tema a la cola</label>
            <input
              disabled={!classroom.actions.canQueue || queueingTopic !== null}
              id="custom-topic"
              maxLength={500}
              onChange={(event) => setCustomTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addCustomTopic();
              }}
              placeholder={classroom.actions.canQueue ? "Escribe un tema…" : "La cola está llena"}
              value={customTopic}
            />
            <button
              className="composer-circle send-circle"
              disabled={!classroom.actions.canQueue || customTopic.trim().length < 8 || queueingTopic !== null}
              onClick={addCustomTopic}
              type="button"
            >
              +
            </button>
            </div>
            {classroom.suggestedTopics.length > 0 && (
              <div className="guide-picks">
                {classroom.suggestedTopics.map((pick) => {
                  const queued = queuedTopics.has(pick.toLowerCase());
                  return (
                    <button
                      disabled={!classroom.actions.canQueue || queued || queueingTopic !== null}
                      key={pick}
                      onClick={() => void queueLesson(pick)}
                      type="button"
                    >
                      <span>{queued ? "✓" : queueingTopic === pick ? "…" : "+"}</span>
                      {pick}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
