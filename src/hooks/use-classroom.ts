"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseClassroomApiResponse,
  toClassroomSessionId,
  toCommandId,
} from "@/lib/classroom-boundaries";
import { CLASSROOM_CONFIG } from "@/lib/classroom-config";
import type {
  ClassroomSessionId,
  ClassroomSnapshot,
  ClientPlaybackSegment,
  CommandId,
  CommandOutcome,
  LessonDurationSeconds,
  PlaybackReport,
  PlayableSegment,
} from "@/lib/classroom-types";

const SESSION_STORAGE_KEY = "tung-classroom-session-v1";

function newSafeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function initialSessionId(): ClassroomSessionId {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        return toClassroomSessionId(stored);
      } catch {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }
  const created = toClassroomSessionId(newSafeId("classroom"));
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
  }
  return created;
}

function toClientSegment(segment: PlayableSegment): ClientPlaybackSegment {
  if (segment.kind === "skipped") {
    return segment;
  }
  return {
    kind: "generated",
    id: segment.id,
    number: segment.number,
    durationSeconds: segment.durationSeconds,
    purpose: segment.purpose,
    prompt: segment.prompt,
    summary: segment.summary,
    captions: segment.captions,
    videoUrl: segment.videoUrl,
    expandedPrompt: segment.expandedPrompt,
    timings: segment.timings,
  };
}

export function useClassroom() {
  const [sessionId, setSessionId] = useState<ClassroomSessionId>(initialSessionId);
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const snapshotRef = useRef<ClassroomSnapshot | null>(null);

  const acceptSnapshot = useCallback((next: ClassroomSnapshot) => {
    const current = snapshotRef.current;
    if (current?.id === next.id && current.version > next.version) return;
    snapshotRef.current = next;
    setSnapshot(next);
    setConnectionError(null);
  }, []);

  const readResponse = useCallback(async (response: Response): Promise<CommandOutcome> => {
    const raw: unknown = await response.json();
    const parsed = parseClassroomApiResponse(raw);
    if (!parsed.ok) throw new Error(parsed.error.message);
    acceptSnapshot(parsed.outcome.snapshot);
    return parsed.outcome;
  }, [acceptSnapshot]);

  const createSession = useCallback(async (id: ClassroomSessionId) => {
    const response = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    await readResponse(response);
  }, [readResponse]);

  useEffect(() => {
    let cancelled = false;
    void createSession(sessionId).catch((error) => {
      if (!cancelled) {
        setConnectionError(error instanceof Error ? error.message : "The classroom could not be created.");
      }
    });
    return () => { cancelled = true; };
  }, [createSession, sessionId]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    const poll = async () => {
      try {
        const response = await fetch(`/api/classroom/${sessionId}`, { cache: "no-store" });
        if (!cancelled) await readResponse(response);
      } catch (error) {
        if (!cancelled) {
          setConnectionError(error instanceof Error ? error.message : "The classroom stopped responding.");
        }
      } finally {
        const current = snapshotRef.current;
        const startingUp =
          current !== null && !current.hasPlaybackBegun && current.production.kind !== "idle";
        if (!cancelled) {
          timer = window.setTimeout(
            poll,
            startingUp ? CLASSROOM_CONFIG.startupPollIntervalMs : CLASSROOM_CONFIG.pollIntervalMs,
          );
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [readResponse, sessionId]);

  const postCommand = useCallback(async (
    command: Record<string, unknown>,
    commandId = toCommandId(newSafeId("command")),
  ): Promise<CommandOutcome> => {
    const response = await fetch(`/api/classroom/${sessionId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: commandId, ...command }),
    });
    return readResponse(response);
  }, [readResponse, sessionId]);

  const send = useCallback(async (command: Record<string, unknown>): Promise<CommandOutcome | null> => {
    try {
      return await postCommand(command);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "The classroom command failed.");
      return null;
    }
  }, [postCommand]);

  const clientReady = useMemo(() => snapshot?.ready.map(toClientSegment) ?? [], [snapshot]);
  const playing = useMemo(
    () => (snapshot?.playing ? toClientSegment(snapshot.playing) : null),
    [snapshot],
  );
  const playlist = snapshot?.playlist ?? [];
  const activePlaylistIndex = Math.max(
    0,
    playlist.findIndex(
      (lesson) => lesson.kind !== "complete" && lesson.kind !== "failed",
    ),
  );
  const queuedLessonCount = playlist
    .slice(activePlaylistIndex + 1)
    .filter((lesson) => lesson.kind !== "complete" && lesson.kind !== "failed")
    .length;

  const start = useCallback(async (input: {
    topic: string;
    durationSeconds: LessonDurationSeconds;
  }) => {
    await send({ kind: "start", ...input, atMs: Date.now() });
  }, [send]);

  const stop = useCallback(async () => {
    await send({ kind: "stop-after-committed", atMs: Date.now() });
  }, [send]);

  const queueLesson = useCallback(async (topic: string) => {
    await send({ kind: "queue-lesson", topic, atMs: Date.now() });
  }, [send]);

  const reportPlayback = useCallback((report: PlaybackReport) => {
    const commandId: CommandId = toCommandId(newSafeId("playback"));
    const command = { kind: "report-playback", report };
    void postCommand(command, commandId).catch(() => {
      window.setTimeout(() => {
        void postCommand(command, commandId).catch((error) => {
          setConnectionError(error instanceof Error ? error.message : "Playback state could not be reported.");
        });
      }, 500);
    });
  }, [postCommand]);

  const clear = useCallback(async () => {
    try {
      await fetch(`/api/classroom/${sessionId}`, { method: "DELETE" });
    } catch {
      // The stale session keeps draining server-side; the client still rotates to a fresh one.
    }
    const nextId = toClassroomSessionId(newSafeId("classroom"));
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextId);
    snapshotRef.current = null;
    setSnapshot(null);
    setSessionId(nextId);
    try {
      await createSession(nextId);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "The classroom could not be reset.");
    }
  }, [createSession, sessionId]);

  const nominalRunway = snapshot?.hasPlaybackBegun
    ? 0
    : snapshot?.policy.startupRunwayScenes ?? CLASSROOM_CONFIG.startupRunwayScenes;
  const remainingPositions = snapshot?.scenes.filter(
    (scene) => scene.kind === "generating" || scene.kind === "ready",
  ).length ?? nominalRunway;
  const requiredRunway = snapshot?.production.kind === "draining"
    ? Math.min(nominalRunway, remainingPositions)
    : nominalRunway;

  return {
    snapshot,
    connectionError,
    playlist,
    queuedLessonCount,
    suggestedTopics: snapshot?.lesson?.suggestedTopics ?? [],
    providerReadyScenes: clientReady.length,
    playback: {
      epoch: snapshot?.epoch ?? 0,
      running: snapshot !== null && snapshot.production.kind !== "idle" && snapshot.production.kind !== "closed",
      status: snapshot?.playback.kind ?? "idle",
      playing,
      ready: clientReady,
      requiredRunway,
    },
    actions: {
      start,
      queueLesson,
      stop,
      clear,
      reportPlayback,
      canStart: snapshot?.production.kind === "idle" && snapshot.configured,
      canQueue:
        snapshot?.lesson != null &&
        queuedLessonCount < CLASSROOM_CONFIG.maxQueuedLessons,
      canStop: snapshot?.production.kind === "preparing" || snapshot?.production.kind === "teaching",
      canClear: snapshot !== null,
    },
  } as const;
}
