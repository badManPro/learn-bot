import type { GoalPath, LearningProfile } from "@prisma/client";
import { LessonSchema, PlanSchema, type LessonContract, type PlanContract } from "@learn-bot/ai-contracts";
import { createOpenAIStructuredModel, type PlanGenerationRequest } from "@learn-bot/ai-orchestrator";

import { env } from "@/lib/env";

export function isSupportedGoalPath(goalPath: GoalPath | null | undefined): goalPath is "python_for_ai_workflows" {
  return goalPath === "python_for_ai_workflows";
}

export function requireOpenAIApiKey() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for the web AI runtime.");
  }

  return env.OPENAI_API_KEY;
}

export function createWebStructuredModel() {
  return createOpenAIStructuredModel(requireOpenAIApiKey());
}

export function resolvePlanModel() {
  return process.env.LEARN_BOT_PLAN_MODEL ?? "gpt-5-mini";
}

export function resolveLessonModel() {
  return process.env.LEARN_BOT_LESSON_MODEL ?? process.env.LEARN_BOT_PLAN_MODEL ?? "gpt-5-mini";
}

export function resolveReplanModel() {
  return process.env.LEARN_BOT_REPLAN_MODEL ?? process.env.LEARN_BOT_PLAN_MODEL ?? "gpt-5-mini";
}

export function buildPlanGenerationRequest(
  profile: Pick<LearningProfile, "goalText" | "currentLevel" | "weeklyTimeBudgetMinutes" | "targetDeadline" | "mbti">
): PlanGenerationRequest {
  return {
    goalText: profile.goalText,
    currentLevel: profile.currentLevel,
    weeklyTimeBudgetMinutes: profile.weeklyTimeBudgetMinutes,
    targetDeadline: profile.targetDeadline.toISOString().slice(0, 10),
    mbti: profile.mbti
  };
}

export function parseStoredPlanContract(contractJson: string | null | undefined): PlanContract | null {
  if (!contractJson) {
    return null;
  }

  return PlanSchema.parse(JSON.parse(contractJson));
}

export function parseStoredLessonContract(contractJson: string | null | undefined): LessonContract | null {
  if (!contractJson) {
    return null;
  }

  return LessonSchema.parse(JSON.parse(contractJson));
}

export function stringifyContract(contract: PlanContract | LessonContract) {
  return JSON.stringify(contract);
}
