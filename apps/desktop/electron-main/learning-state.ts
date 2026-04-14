import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { LessonSchema, PlanSchema, ReplanSchema } from "@learn-bot/ai-contracts";

import type { DesktopLearningState } from "./ipc/contracts";
import { createEmptyDesktopLearningState } from "../shared/contracts";

type DesktopLearningStateStoreOptions = {
  filePath: string;
  logger?: Pick<Console, "warn">;
};

function emptyState(): DesktopLearningState {
  return createEmptyDesktopLearningState();
}

function isEmptyState(state: DesktopLearningState) {
  return state.plan === null && state.lesson === null && state.lessonHistory.length === 0 && state.replan === null;
}

function parseNullablePlan(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  const parsed = PlanSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseNullableLesson(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  const parsed = LessonSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseLessonHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => parseNullableLesson(entry))
    .filter((entry): entry is NonNullable<ReturnType<typeof parseNullableLesson>> => entry !== null)
    .slice(-3);
}

function parseNullableReplan(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  const parsed = ReplanSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function normalizeState(input: Partial<DesktopLearningState> | Record<string, unknown>): DesktopLearningState {
  const plan = parseNullablePlan(input.plan);

  if (!plan) {
    return emptyState();
  }

  const lesson = parseNullableLesson(input.lesson);
  const lessonHistory = parseLessonHistory(input.lessonHistory);

  return {
    plan,
    lesson,
    lessonHistory,
    replan: lesson ? parseNullableReplan(input.replan) : null
  };
}

export function createDesktopLearningStateStore(options: DesktopLearningStateStoreOptions) {
  const { filePath, logger = console } = options;

  async function load(): Promise<DesktopLearningState> {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsedJson = JSON.parse(raw) as unknown;

      if (!parsedJson || typeof parsedJson !== "object") {
        logger.warn("[desktop-state] ignoring invalid persisted learning state: expected object envelope");
        return emptyState();
      }

      const envelope = parsedJson as { version?: unknown; snapshot?: unknown };

      if (envelope.version !== 1 || !envelope.snapshot || typeof envelope.snapshot !== "object") {
        logger.warn("[desktop-state] ignoring invalid persisted learning state: malformed envelope");
        return emptyState();
      }

      return normalizeState(envelope.snapshot as Record<string, unknown>);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return emptyState();
      }

      logger.warn("[desktop-state] failed to read persisted learning state", error);
      return emptyState();
    }
  }

  async function save(input: DesktopLearningState): Promise<DesktopLearningState> {
    const snapshot = normalizeState(input);

    if (isEmptyState(snapshot)) {
      await rm(filePath, { force: true });
      return snapshot;
    }

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      `${JSON.stringify(
        {
          version: 1,
          snapshot
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    return snapshot;
  }

  return {
    load,
    save
  };
}
