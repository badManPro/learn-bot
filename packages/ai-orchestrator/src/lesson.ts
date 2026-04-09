import {
  LessonSchema,
  PlanSchema,
  TodayLessonSeedSchema,
  type LessonContract,
  type PlanContract,
  type RoadmapMilestone,
  type TodayLessonSeed
} from "@learn-bot/ai-contracts";
import { z } from "zod";

import { PlanGenerationRequestSchema } from "./plan";

export const LessonGenerationModeSchema = z.enum(["initial", "follow_up", "replacement"]);

export const LessonGenerationRequestSchema = PlanGenerationRequestSchema.extend({
  plan: PlanSchema,
  lessonSeed: TodayLessonSeedSchema.optional(),
  generationMode: LessonGenerationModeSchema.default("initial"),
  lessonHistory: z.array(LessonSchema).max(5).default([])
});

export type LessonGenerationRequest = z.infer<typeof LessonGenerationRequestSchema>;
export type LessonGenerationMode = z.infer<typeof LessonGenerationModeSchema>;

export function unique(items: string[]) {
  return [...new Set(items)];
}

export function resolveLessonSeed(input: LessonGenerationRequest): TodayLessonSeed {
  return TodayLessonSeedSchema.parse(input.lessonSeed ?? input.plan.todayLessonSeed);
}

export function resolveLessonMilestone(plan: PlanContract, seed: TodayLessonSeed): RoadmapMilestone {
  const milestone =
    plan.milestones.find((item) => item.id === seed.milestoneId) ??
    plan.milestones.find((item) => item.status === "active") ??
    plan.milestones[0];

  if (!milestone) {
    throw new Error("Cannot generate a lesson without at least one roadmap milestone.");
  }

  return milestone;
}

export function buildLessonId(domainId: string, seed: TodayLessonSeed) {
  return `${domainId}-${seed.milestoneId}-${seed.lessonType}`;
}

export function summarizeLessonHistory(history: LessonContract[]) {
  if (history.length === 0) {
    return "No prior lessons in this thread.";
  }

  return history
    .slice(-3)
    .map(
      (lesson, index) =>
        `${index + 1}. ${lesson.title}\nNext action: ${lesson.nextDefaultAction.label}\nTasks: ${lesson.tasks
          .map((task) => task.title)
          .join(", ")}`
    )
    .join("\n\n");
}

export function normalizeLesson(args: {
  domainId: string;
  lesson: LessonContract;
  seed: TodayLessonSeed;
  generationMode: LessonGenerationMode;
  historyLength: number;
  materialsNeeded: string[];
}): LessonContract {
  const estimatedTotalMinutes = args.lesson.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
  const idSuffix =
    args.generationMode === "initial" ? "" : `-${args.generationMode}-${Math.max(1, args.historyLength + 1)}`;

  return LessonSchema.parse({
    ...args.lesson,
    lessonId: `${buildLessonId(args.domainId, args.seed)}${idSuffix}`,
    estimatedTotalMinutes: Math.max(args.lesson.estimatedTotalMinutes, estimatedTotalMinutes),
    materialsNeeded: unique([...args.materialsNeeded, ...args.lesson.materialsNeeded])
  });
}
