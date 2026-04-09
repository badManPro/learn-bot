import { LessonSchema, type LessonContract } from "@learn-bot/ai-contracts";
import { domainPacks } from "@learn-bot/domain-packs";

import type { StructuredTextModel } from "./openai-client";
import {
  LessonGenerationRequestSchema,
  normalizeLesson,
  resolveLessonMilestone,
  resolveLessonSeed,
  summarizeLessonHistory,
  type LessonGenerationRequest
} from "./lesson";
import { buildLearnerStateSummary } from "./plan";

const pianoPack = domainPacks.piano;

export function buildPianoLessonPrompts(input: LessonGenerationRequest) {
  const normalized = LessonGenerationRequestSchema.parse(input);
  const lessonRules = pianoPack.lessonRules;
  const seed = resolveLessonSeed(normalized);
  const milestone = resolveLessonMilestone(normalized.plan, seed);
  const critiqueChecks = pianoPack.critiqueRubric.checks.map((check) => `- ${check}`).join("\n");

  return {
    systemPrompt: [
      "You generate one structured lesson for a desktop learning product.",
      "Return only content that fits the provided schema. Do not include markdown fences or commentary.",
      "The lesson must reduce decision cost: concrete atomic tasks, explicit completion criteria, and clear blocked-state recovery.",
      `Domain pack: ${pianoPack.domain.label} (${pianoPack.domain.family}).`,
      `Plan title: ${normalized.plan.planTitle}.`,
      `Generation mode: ${normalized.generationMode}.`,
      `Lesson type: ${seed.lessonType}.`,
      `Lesson objective: ${seed.objective}.`,
      `Milestone: ${milestone.title} -> ${milestone.purpose}.`,
      `Milestone outcome: ${milestone.outcome}.`,
      `Milestone success criteria:\n- ${milestone.successCriteria.join("\n- ")}`,
      `Supported modalities: ${pianoPack.domain.supportedModalities.join(", ")}.`,
      `Lesson rules: ${lessonRules.defaultTaskCountRange.join(" to ")} tasks, ${
        lessonRules.defaultTaskMinutesRange.join(" to ")
      } minutes per task, acceptable formats ${lessonRules.acceptableLessonFormats.join(", ")}, allowed task families ${
        lessonRules.allowedTaskTypes.join(", ")
      }, must include ${lessonRules.mustInclude.join(", ")}, forbid ${lessonRules.forbiddenPatterns.join(", ")}.`,
      `Equipment or environment: ${lessonRules.equipmentOrEnvironment.join(", ")}.`,
      `Pedagogy constraints:\n- ${lessonRules.pedagogyConstraints.join("\n- ")}`,
      `Critique rubric:\n${critiqueChecks}`,
      "Use shared task.type values from the schema only. For piano lessons, prefer setup, practice, verification, and reflection.",
      "Keep success criteria audible, countable, or otherwise directly observable to the learner.",
      "Keep the first task easy to start in under five minutes of mental overhead."
    ].join("\n\n"),
    userPrompt: [
      "Generate the next piano lesson for the learner profile below.",
      buildLearnerStateSummary(normalized),
      `Goal summary: ${normalized.plan.goalSummary}`,
      `Current strategy: ${normalized.plan.currentStrategy}`,
      `Plan tags: ${normalized.plan.tags.join(", ")}`,
      `Milestone lesson types: ${milestone.lessonTypes.join(", ")}`,
      `Today's lesson seed objective: ${seed.objective}`,
      `Prior lesson history:\n${summarizeLessonHistory(normalized.lessonHistory)}`,
      "The lesson must stay inside the piano domain family and directly advance the active milestone.",
      normalized.generationMode === "follow_up"
        ? "This lesson is a follow-up. Avoid repeating the same drill sequence and move one concrete step forward."
        : "",
      normalized.generationMode === "replacement"
        ? "This lesson is a replacement after friction. Keep the scope smaller, lower the tempo or coordination load, and make the first step easier than the prior lesson."
        : "",
      "Prefer self-checks the learner can hear, count, or observe immediately with a keyboard and metronome."
    ]
      .filter(Boolean)
      .join("\n\n")
  };
}

export async function generatePianoLesson(args: {
  client: StructuredTextModel;
  input: LessonGenerationRequest;
  model: string;
}): Promise<LessonContract> {
  const input = LessonGenerationRequestSchema.parse(args.input);
  const prompts = buildPianoLessonPrompts(input);
  const seed = resolveLessonSeed(input);
  const rawLesson = await args.client.parse({
    model: args.model,
    schema: LessonSchema,
    schemaName: "learn_bot_piano_lesson",
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt
  });
  const parsed = LessonSchema.parse(rawLesson);

  return normalizeLesson({
    domainId: "piano",
    lesson: parsed,
    seed,
    generationMode: input.generationMode,
    historyLength: input.lessonHistory.length,
    materialsNeeded: [...pianoPack.lessonRules.equipmentOrEnvironment]
  });
}
