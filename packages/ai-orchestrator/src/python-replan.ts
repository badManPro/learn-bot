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
import { domainPacks } from "@learn-bot/domain-packs";
import { z } from "zod";

import type { StructuredTextModel } from "./openai-client";
import { buildLearnerStateSummary, PlanGenerationRequestSchema } from "./plan";

export const ReplanGenerationRequestSchema = PlanGenerationRequestSchema.extend({
  plan: PlanSchema,
  currentLesson: LessonSchema,
  reason: ReplanReasonSchema,
  lessonHistory: z.array(LessonSchema).max(5).default([])
});

export type ReplanGenerationRequest = z.infer<typeof ReplanGenerationRequestSchema>;

const pythonPack = domainPacks.python;

const REASON_GUIDANCE: Record<ReplanReason, string> = {
  too_hard: "The learner feels the work is too hard. Lower activation energy and reduce scope.",
  pace_too_fast: "The learner cannot sustain the current pace. Reduce weekly pressure without losing the milestone.",
  wrong_goal: "The learner may be heading toward the wrong near-term outcome. Adjust the milestone emphasis if needed.",
  inactive: "The learner has stalled. Restart momentum with the easiest useful next action."
};

function summarizePlan(plan: PlanContract) {
  return plan.milestones
    .map((milestone) => `${milestone.index}. ${milestone.title} [${milestone.status}] -> ${milestone.outcome}`)
    .join("\n");
}

function summarizeHistory(history: ReplanGenerationRequest["lessonHistory"]) {
  if (history.length === 0) {
    return "No earlier lessons recorded in this thread.";
  }

  return history
    .slice(-3)
    .map((lesson, index) => `${index + 1}. ${lesson.title} -> ${lesson.nextDefaultAction.label}`)
    .join("\n");
}

function resolveActiveMilestoneId(plan: PlanContract) {
  return plan.milestones.find((milestone) => milestone.status === "active")?.id ?? plan.todayLessonSeed.milestoneId;
}

export function buildPythonReplanPrompts(input: ReplanGenerationRequest) {
  const normalized = ReplanGenerationRequestSchema.parse(input);
  const critiqueChecks = pythonPack.critiqueRubric.checks.map((check) => `- ${check}`).join("\n");

  return {
    systemPrompt: [
      "You generate structured replanning decisions for a desktop learning product.",
      "Return only content that fits the provided schema. Do not include markdown fences or commentary.",
      "The output must preserve forward momentum while lowering ambiguity and decision cost.",
      `Domain pack: ${pythonPack.domain.label} (${pythonPack.domain.family}).`,
      `Reason guidance: ${REASON_GUIDANCE[normalized.reason]}`,
      `Current roadmap:\n${summarizePlan(normalized.plan)}`,
      `Current lesson title: ${normalized.currentLesson.title}.`,
      `Current lesson next action: ${normalized.currentLesson.nextDefaultAction.label}.`,
      `Critique rubric:\n${critiqueChecks}`,
      "Unless the goal is clearly wrong, keep the replacement lesson on the active milestone.",
      "The replacement lesson seed must contain a concrete objective that can be sent directly into lesson generation."
    ].join("\n\n"),
    userPrompt: [
      "Generate a replan decision for the learner profile below.",
      buildLearnerStateSummary(normalized),
      `Replan reason: ${normalized.reason}`,
      `Goal summary: ${normalized.plan.goalSummary}`,
      `Current strategy: ${normalized.plan.currentStrategy}`,
      `Current lesson summary: ${normalized.currentLesson.whyThisNow}`,
      `Current lesson tasks: ${normalized.currentLesson.tasks.map((task) => task.title).join(", ")}`,
      `Prior lesson history:\n${summarizeHistory(normalized.lessonHistory)}`,
      "Return a replacement lesson summary and a structured replacement lesson seed."
    ].join("\n\n")
  };
}

function normalizeReplacementSeed(args: {
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

function normalizePythonReplan(args: {
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

export async function generatePythonReplan(args: {
  client: StructuredTextModel;
  input: ReplanGenerationRequest;
  model: string;
}): Promise<ReplanContract> {
  const input = ReplanGenerationRequestSchema.parse(args.input);
  const prompts = buildPythonReplanPrompts(input);
  const rawReplan = await args.client.parse({
    model: args.model,
    schema: ReplanSchema,
    schemaName: "learn_bot_python_replan",
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt
  });
  const parsed = ReplanSchema.parse(rawReplan);

  return normalizePythonReplan({
    plan: input.plan,
    reason: input.reason,
    result: parsed
  });
}
