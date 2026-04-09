import { ReplanSchema, type ReplanContract } from "@learn-bot/ai-contracts";
import { domainPacks } from "@learn-bot/domain-packs";

import type { StructuredTextModel } from "./openai-client";
import { buildLearnerStateSummary } from "./plan";
import {
  REASON_GUIDANCE,
  ReplanGenerationRequestSchema,
  normalizeReplan,
  summarizeHistory,
  summarizePlan,
  type ReplanGenerationRequest
} from "./replan";

const pianoPack = domainPacks.piano;

export function buildPianoReplanPrompts(input: ReplanGenerationRequest) {
  const normalized = ReplanGenerationRequestSchema.parse(input);
  const critiqueChecks = pianoPack.critiqueRubric.checks.map((check) => `- ${check}`).join("\n");

  return {
    systemPrompt: [
      "You generate structured replanning decisions for a desktop learning product.",
      "Return only content that fits the provided schema. Do not include markdown fences or commentary.",
      "The output must preserve forward momentum while lowering ambiguity and decision cost.",
      `Domain pack: ${pianoPack.domain.label} (${pianoPack.domain.family}).`,
      `Reason guidance: ${REASON_GUIDANCE[normalized.reason]}`,
      `Current roadmap:\n${summarizePlan(normalized.plan)}`,
      `Current lesson title: ${normalized.currentLesson.title}.`,
      `Current lesson next action: ${normalized.currentLesson.nextDefaultAction.label}.`,
      `Pedagogy constraints: ${pianoPack.lessonRules.pedagogyConstraints.join(" / ")}.`,
      `Critique rubric:\n${critiqueChecks}`,
      "Unless the goal is clearly wrong, keep the replacement lesson on the active milestone.",
      "For piano, reduce physical and coordination load before changing the milestone.",
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
      "Return a replacement lesson summary and a structured replacement lesson seed.",
      "Prefer replans that lower tempo, isolate one coordination problem, or simplify the drill before changing the milestone."
    ].join("\n\n")
  };
}

export async function generatePianoReplan(args: {
  client: StructuredTextModel;
  input: ReplanGenerationRequest;
  model: string;
}): Promise<ReplanContract> {
  const input = ReplanGenerationRequestSchema.parse(args.input);
  const prompts = buildPianoReplanPrompts(input);
  const rawReplan = await args.client.parse({
    model: args.model,
    schema: ReplanSchema,
    schemaName: "learn_bot_piano_replan",
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt
  });
  const parsed = ReplanSchema.parse(rawReplan);

  return normalizeReplan({
    plan: input.plan,
    reason: input.reason,
    result: parsed
  });
}
