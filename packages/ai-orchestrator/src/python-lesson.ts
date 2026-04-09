import {
  LessonSchema,
  PlanSchema,
  TodayLessonSeedSchema,
  type LessonContract,
  type PlanContract,
  type RoadmapMilestone,
  type TodayLessonSeed
} from "@learn-bot/ai-contracts";
import { domainPacks } from "@learn-bot/domain-packs";
import { z } from "zod";

import type { StructuredTextModel } from "./openai-client";
import { buildLearnerStateSummary, PlanGenerationRequestSchema } from "./python-plan";

export const LessonGenerationRequestSchema = PlanGenerationRequestSchema.extend({
  plan: PlanSchema,
  lessonSeed: TodayLessonSeedSchema.optional()
});

export type LessonGenerationRequest = z.infer<typeof LessonGenerationRequestSchema>;

const pythonPack = domainPacks.python;
const automationOverlay = pythonPack.overlays.automation;

function unique(items: string[]) {
  return [...new Set(items)];
}

function resolveLessonSeed(input: LessonGenerationRequest): TodayLessonSeed {
  return TodayLessonSeedSchema.parse(input.lessonSeed ?? input.plan.todayLessonSeed);
}

function resolveLessonMilestone(plan: PlanContract, seed: TodayLessonSeed): RoadmapMilestone {
  const milestone =
    plan.milestones.find((item) => item.id === seed.milestoneId) ??
    plan.milestones.find((item) => item.status === "active") ??
    plan.milestones[0];

  if (!milestone) {
    throw new Error("Cannot generate a lesson without at least one roadmap milestone.");
  }

  return milestone;
}

function buildLessonId(seed: TodayLessonSeed) {
  return `python-${seed.milestoneId}-${seed.lessonType}`;
}

export function buildPythonLessonPrompts(input: LessonGenerationRequest) {
  const normalized = LessonGenerationRequestSchema.parse(input);
  const lessonRules = pythonPack.lessonRules;
  const seed = resolveLessonSeed(normalized);
  const milestone = resolveLessonMilestone(normalized.plan, seed);
  const critiqueChecks = pythonPack.critiqueRubric.checks.map((check) => `- ${check}`).join("\n");
  const hasAutomationContext =
    normalized.plan.tags.some((tag) => automationOverlay.tags.includes(tag)) ||
    normalized.goalText.toLowerCase().includes("automation");

  return {
    systemPrompt: [
      "You generate one structured lesson for a desktop learning product.",
      "Return only content that fits the provided schema. Do not include markdown fences or commentary.",
      "The lesson must reduce decision cost: concrete atomic tasks, explicit completion criteria, and clear blocked-state recovery.",
      `Domain pack: ${pythonPack.domain.label} (${pythonPack.domain.family}).`,
      `Plan title: ${normalized.plan.planTitle}.`,
      `Lesson type: ${seed.lessonType}.`,
      `Lesson objective: ${seed.objective}.`,
      `Milestone: ${milestone.title} -> ${milestone.purpose}.`,
      `Milestone outcome: ${milestone.outcome}.`,
      `Milestone success criteria:\n- ${milestone.successCriteria.join("\n- ")}`,
      `Lesson rules: ${lessonRules.defaultTaskCountRange.join(" to ")} tasks, ${
        lessonRules.defaultTaskMinutesRange.join(" to ")
      } minutes per task, include at least one runnable step and one verification step, forbid ${
        lessonRules.forbiddenPatterns.join(", ")
      }.`,
      hasAutomationContext ? `Automation overlay lesson bias: ${automationOverlay.lessonBias.join(", ")}.` : "",
      `Critique rubric:\n${critiqueChecks}`,
      "Keep the first task easy to start in under five minutes of mental overhead.",
      "Use concise, concrete wording. Avoid vague tasks like 'explore' or 'understand more'."
    ]
      .filter(Boolean)
      .join("\n\n"),
    userPrompt: [
      "Generate the next Python lesson for the learner profile below.",
      buildLearnerStateSummary(normalized),
      `Goal summary: ${normalized.plan.goalSummary}`,
      `Current strategy: ${normalized.plan.currentStrategy}`,
      `Plan tags: ${normalized.plan.tags.join(", ")}`,
      `Milestone lesson types: ${milestone.lessonTypes.join(", ")}`,
      `Today's lesson seed objective: ${seed.objective}`,
      "The lesson must stay inside the Python / AI / automation domain family and directly advance the active milestone.",
      "Make the quiz check the key concept needed to continue the next lesson."
    ].join("\n\n")
  };
}

function normalizePythonLesson(args: {
  lesson: LessonContract;
  seed: TodayLessonSeed;
}): LessonContract {
  const estimatedTotalMinutes = args.lesson.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

  return LessonSchema.parse({
    ...args.lesson,
    lessonId: buildLessonId(args.seed),
    estimatedTotalMinutes: Math.max(args.lesson.estimatedTotalMinutes, estimatedTotalMinutes),
    materialsNeeded: unique(["Python 3", "Terminal", ...args.lesson.materialsNeeded])
  });
}

export async function generatePythonLesson(args: {
  client: StructuredTextModel;
  input: LessonGenerationRequest;
  model: string;
}): Promise<LessonContract> {
  const input = LessonGenerationRequestSchema.parse(args.input);
  const prompts = buildPythonLessonPrompts(input);
  const seed = resolveLessonSeed(input);
  const rawLesson = await args.client.parse({
    model: args.model,
    schema: LessonSchema,
    schemaName: "learn_bot_python_lesson",
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt
  });
  const parsed = LessonSchema.parse(rawLesson);

  return normalizePythonLesson({
    lesson: parsed,
    seed
  });
}
