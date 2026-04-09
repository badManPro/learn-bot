import {
  LessonSchema,
  PlanSchema,
  ReplanReasonSchema,
  ReplanSchema,
  type PlanContract,
  type ReplanContract,
  type ReplanReason,
  type TodayLessonSeed
} from "@learn-bot/ai-contracts";
import { z } from "zod";

import { PlanGenerationRequestSchema } from "./plan";

export const ReplanGenerationRequestSchema = PlanGenerationRequestSchema.extend({
  plan: PlanSchema,
  currentLesson: LessonSchema,
  reason: ReplanReasonSchema,
  lessonHistory: z.array(LessonSchema).max(5).default([])
});

export type ReplanGenerationRequest = z.infer<typeof ReplanGenerationRequestSchema>;

export const REASON_GUIDANCE: Record<ReplanReason, string> = {
  too_hard: "The learner feels the work is too hard. Lower activation energy and reduce scope.",
  pace_too_fast: "The learner cannot sustain the current pace. Reduce weekly pressure without losing the milestone.",
  wrong_goal: "The learner may be heading toward the wrong near-term outcome. Adjust the milestone emphasis if needed.",
  inactive: "The learner has stalled. Restart momentum with the easiest useful next action."
};

export function summarizePlan(plan: PlanContract) {
  return plan.milestones
    .map((milestone) => `${milestone.index}. ${milestone.title} [${milestone.status}] -> ${milestone.outcome}`)
    .join("\n");
}

export function summarizeHistory(history: ReplanGenerationRequest["lessonHistory"]) {
  if (history.length === 0) {
    return "No earlier lessons recorded in this thread.";
  }

  return history
    .slice(-3)
    .map((lesson, index) => `${index + 1}. ${lesson.title} -> ${lesson.nextDefaultAction.label}`)
    .join("\n");
}

export function resolveActiveMilestoneId(plan: PlanContract) {
  return plan.milestones.find((milestone) => milestone.status === "active")?.id ?? plan.todayLessonSeed.milestoneId;
}

export function normalizeReplacementSeed(args: {
  reason: ReplanReason;
  plan: PlanContract;
  seed: TodayLessonSeed;
  fallbackObjective: string;
}): TodayLessonSeed {
  const activeMilestoneId = resolveActiveMilestoneId(args.plan);

  return {
    milestoneId: args.reason === "wrong_goal" ? args.seed.milestoneId : activeMilestoneId,
    lessonType:
      args.reason === "too_hard" || args.reason === "inactive"
        ? "review"
        : args.reason === "pace_too_fast"
          ? "practice"
          : args.seed.lessonType,
    objective: args.seed.objective || args.fallbackObjective
  };
}

export function normalizeReplan(args: {
  plan: PlanContract;
  reason: ReplanReason;
  result: ReplanContract;
}): ReplanContract {
  const replacementLessonSeed = normalizeReplacementSeed({
    reason: args.reason,
    plan: args.plan,
    seed: args.result.replacementLessonSeed,
    fallbackObjective: args.result.replacementLesson.focus
  });

  return ReplanSchema.parse({
    ...args.result,
    replanReason: args.reason,
    replacementLessonTitle: args.result.replacementLesson.title,
    replacementLessonSeed
  });
}
