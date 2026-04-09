import { PlanSchema, type PlanContract } from "@learn-bot/ai-contracts";
import { domainPacks } from "@learn-bot/domain-packs";
import { z } from "zod";

import type { StructuredTextModel } from "./openai-client";

export const PlanGenerationRequestSchema = z.object({
  goalText: z.string().trim().min(3),
  currentLevel: z.enum(["zero", "some_programming"]),
  weeklyTimeBudgetMinutes: z.number().int().min(30).max(1200),
  targetDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mbti: z.string().trim().min(1).nullable().optional()
});

export type PlanGenerationRequest = z.infer<typeof PlanGenerationRequestSchema>;

const pythonPack = domainPacks.python;

export function derivePaceSignal(input: PlanGenerationRequest) {
  if (input.weeklyTimeBudgetMinutes <= 120) {
    return "slower";
  }

  if (input.weeklyTimeBudgetMinutes <= 180) {
    return "lighter";
  }

  if (input.mbti?.startsWith("I")) {
    return "lighter";
  }

  return "default";
}

export function buildLearnerStateSummary(input: PlanGenerationRequest) {
  return [
    `Goal: ${input.goalText}`,
    `Current level: ${input.currentLevel}`,
    `Weekly budget: ${input.weeklyTimeBudgetMinutes} minutes`,
    `Target deadline: ${input.targetDeadline}`,
    `MBTI: ${input.mbti ?? "not provided"}`,
    `Derived pace signal: ${derivePaceSignal(input)}`
  ].join("\n");
}

export function buildPythonPlanPrompts(input: PlanGenerationRequest) {
  const normalized = PlanGenerationRequestSchema.parse(input);
  const lessonRules = pythonPack.lessonRules;
  const critiqueChecks = pythonPack.critiqueRubric.checks.map((check) => `- ${check}`).join("\n");
  const milestoneArchetypes = pythonPack.milestoneArchetypes
    .map((item) => `- ${item.id}: ${item.label} -> ${item.description}`)
    .join("\n");
  const skillGraph = pythonPack.skills.map((skill) => `- ${skill.id} (requires: ${skill.prerequisites.join(", ") || "none"})`).join("\n");

  return {
    systemPrompt: [
      "You generate structured learning roadmaps for a desktop learning product.",
      "Return only content that fits the provided schema. Do not include markdown fences or commentary.",
      "The roadmap must reduce decision cost: one active milestone, explicit success criteria, and realistic weekly pacing.",
      `Domain pack: ${pythonPack.domain.label} (${pythonPack.domain.family}).`,
      `Default tags: ${pythonPack.domain.defaultTags.join(", ")}.`,
      `Supported modalities: ${pythonPack.domain.supportedModalities.join(", ")}.`,
      `Milestone archetypes:\n${milestoneArchetypes}`,
      `Skill graph:\n${skillGraph}`,
      `Lesson rules: tasks ${lessonRules.defaultTaskCountRange.join(" to ")} per lesson, minutes ${
        lessonRules.defaultTaskMinutesRange.join(" to ")
      }, must include ${lessonRules.mustInclude.join(", ")}, forbid ${lessonRules.forbiddenPatterns.join(", ")}.`,
      `Critique rubric:\n${critiqueChecks}`,
      "The first milestone must be approachable for a learner new to Python automation.",
      "Use concise, concrete wording. Avoid vague outcomes like 'get familiar' or 'understand more'."
    ].join("\n\n"),
    userPrompt: [
      "Generate a Python-first roadmap for the learner profile below.",
      buildLearnerStateSummary(normalized),
      "The roadmap must stay in the Python / AI / automation domain family.",
      "Set exactly one milestone to active and make it the first milestone.",
      "todayLessonSeed must point at the active milestone and define the first lesson objective."
    ].join("\n\n")
  };
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function normalizePythonPlan(plan: PlanContract): PlanContract {
  const milestones: PlanContract["milestones"] = plan.milestones.map((milestone, index) => ({
    id: milestone.id,
    index: index + 1,
    title: milestone.title,
    purpose: milestone.purpose,
    outcome: milestone.outcome,
    prerequisites: index === 0 ? [] : (milestone.prerequisites ?? []),
    successCriteria: milestone.successCriteria,
    recommendedWeeks: Math.max(1, milestone.recommendedWeeks),
    lessonTypes: milestone.lessonTypes.length > 0 ? milestone.lessonTypes : ["practice"],
    status: index === 0 ? "active" : "pending"
  }));

  const totalEstimatedWeeks = Math.max(
    plan.totalEstimatedWeeks,
    milestones.reduce((sum, milestone) => sum + milestone.recommendedWeeks, 0)
  );

  return PlanSchema.parse({
    ...plan,
    domainId: pythonPack.domain.id,
    tags: unique([...pythonPack.domain.defaultTags, ...plan.tags]),
    totalEstimatedWeeks,
    milestones,
    warnings: plan.warnings ?? [],
    todayLessonSeed: {
      milestoneId: milestones[0]?.id ?? plan.todayLessonSeed.milestoneId,
      lessonType: milestones[0]?.lessonTypes[0] ?? plan.todayLessonSeed.lessonType,
      objective: plan.todayLessonSeed.objective
    }
  });
}

export async function generatePythonPlan(args: {
  client: StructuredTextModel;
  input: PlanGenerationRequest;
  model: string;
}): Promise<PlanContract> {
  const input = PlanGenerationRequestSchema.parse(args.input);
  const prompts = buildPythonPlanPrompts(input);
  const rawPlan = await args.client.parse({
    model: args.model,
    schema: PlanSchema,
    schemaName: "learn_bot_python_plan",
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt
  });
  const parsed = PlanSchema.parse(rawPlan);

  return normalizePythonPlan(parsed);
}
