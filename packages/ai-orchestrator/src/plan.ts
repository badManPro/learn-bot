import { PlanSchema, type PlanContract } from "@learn-bot/ai-contracts";
import { domainPackIds, getDomainPack, type DomainPack, type DomainPackId } from "@learn-bot/domain-packs";
import { z } from "zod";

import type { StructuredTextModel } from "./openai-client";

const DomainPackIdSchema = z.custom<DomainPackId>(
  (value) => typeof value === "string" && domainPackIds.includes(value as DomainPackId),
  { message: "Unsupported domain pack." }
);

export const PlanGenerationRequestSchema = z.object({
  goalText: z.string().trim().min(3),
  currentLevel: z.enum(["zero", "some_programming"]),
  weeklyTimeBudgetMinutes: z.number().int().min(30).max(1200),
  targetDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mbti: z.string().trim().min(1).nullable().optional(),
  preferredDomain: DomainPackIdSchema.nullable().optional()
});

export type PlanGenerationRequest = z.infer<typeof PlanGenerationRequestSchema>;

const DOMAIN_PATTERNS: Record<DomainPackId, RegExp> = {
  python: /python|ai|llm|agent|chatbot|automation|workflow|script|编程|代码|自动化|工作流|脚本/i,
  piano: /piano|钢琴|练琴|和弦|节拍|节奏|音阶|乐理|左手|右手|伴奏|琴键/i,
  drawing: /drawing|draw|sketch|illustration|素描|绘画|画画|透视|构图|线稿|明暗|速写/i
};

function unique(items: string[]) {
  return [...new Set(items)];
}

function formatList(items: readonly string[], bullet = "- ") {
  return items.map((item) => `${bullet}${item}`).join("\n");
}

function formatSkillGraph(pack: DomainPack) {
  return pack.skills.map((skill) => `- ${skill.id} (requires: ${skill.prerequisites.join(", ") || "none"})`).join("\n");
}

function formatMilestoneArchetypes(pack: DomainPack) {
  return pack.milestoneArchetypes.map((item) => `- ${item.id}: ${item.label} -> ${item.description}`).join("\n");
}

export function inferGoalDomain(goalText: string): DomainPackId | null {
  const normalized = goalText.trim();

  for (const domainId of domainPackIds) {
    if (DOMAIN_PATTERNS[domainId].test(normalized)) {
      return domainId;
    }
  }

  return null;
}

export function resolveRequestedDomain(input: PlanGenerationRequest): DomainPackId {
  const normalized = PlanGenerationRequestSchema.parse(input);

  if (normalized.preferredDomain) {
    return normalized.preferredDomain;
  }

  const inferredDomain = inferGoalDomain(normalized.goalText);

  if (!inferredDomain) {
    throw new Error("No supported domain pack could be inferred from the goal text.");
  }

  return inferredDomain;
}

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

export function buildPlanPrompts(input: PlanGenerationRequest) {
  const normalized = PlanGenerationRequestSchema.parse(input);
  const domainId = resolveRequestedDomain(normalized);
  const pack = getDomainPack(domainId);
  const critiqueChecks = formatList(pack.critiqueRubric.checks);
  const milestoneArchetypes = formatMilestoneArchetypes(pack);
  const skillGraph = formatSkillGraph(pack);

  return {
    domainId,
    systemPrompt: [
      "You generate structured learning roadmaps for a desktop learning product.",
      "Return only content that fits the provided schema. Do not include markdown fences or commentary.",
      "The roadmap must reduce decision cost: one active milestone, explicit success criteria, and realistic weekly pacing.",
      `Domain pack: ${pack.domain.label} (${pack.domain.family}).`,
      `Default tags: ${pack.domain.defaultTags.join(", ")}.`,
      `Subdomain tags: ${pack.domain.subdomainTags.join(", ")}.`,
      `Supported modalities: ${pack.domain.supportedModalities.join(", ")}.`,
      `Environment assumptions: ${pack.domain.environmentAssumptions.join(", ")}.`,
      `Milestone archetypes:\n${milestoneArchetypes}`,
      `Skill graph:\n${skillGraph}`,
      `Acceptable lesson formats: ${pack.lessonRules.acceptableLessonFormats.join(", ")}.`,
      `Allowed task types: ${pack.lessonRules.allowedTaskTypes.join(", ")}.`,
      `Lesson rules: tasks ${pack.lessonRules.defaultTaskCountRange.join(" to ")} per lesson, minutes ${
        pack.lessonRules.defaultTaskMinutesRange.join(" to ")
      }, must include ${pack.lessonRules.mustInclude.join(", ")}, forbid ${pack.lessonRules.forbiddenPatterns.join(", ")}.`,
      `Equipment or environment: ${pack.lessonRules.equipmentOrEnvironment.join(", ")}.`,
      `Pedagogy constraints:\n${formatList(pack.lessonRules.pedagogyConstraints)}`,
      `Critique rubric:\n${critiqueChecks}`,
      `The first milestone must be approachable for the stated learner level in ${pack.domain.label}.`,
      "Use concise, concrete wording. Avoid vague outcomes like 'get familiar' or 'understand more'."
    ].join("\n\n"),
    userPrompt: [
      `Generate a ${pack.domain.label}-first roadmap for the learner profile below.`,
      buildLearnerStateSummary(normalized),
      `The roadmap must stay inside the ${pack.domain.label} domain family.`,
      `Prefer tags from this domain family: ${pack.domain.defaultTags.concat(pack.domain.subdomainTags).join(", ")}.`,
      "Set exactly one milestone to active and make it the first milestone.",
      "todayLessonSeed must point at the active milestone and define the first lesson objective."
    ].join("\n\n")
  };
}

function normalizePlanForDomain(plan: PlanContract, domainId: DomainPackId): PlanContract {
  const pack = getDomainPack(domainId);
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
    domainId: pack.domain.id,
    tags: unique([...pack.domain.defaultTags, ...plan.tags]),
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

export async function generatePlan(args: {
  client: StructuredTextModel;
  input: PlanGenerationRequest;
  model: string;
}): Promise<PlanContract> {
  const input = PlanGenerationRequestSchema.parse(args.input);
  const prompts = buildPlanPrompts(input);
  const rawPlan = await args.client.parse({
    model: args.model,
    schema: PlanSchema,
    schemaName: `learn_bot_${prompts.domainId}_plan`,
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt
  });
  const parsed = PlanSchema.parse(rawPlan);

  return normalizePlanForDomain(parsed, prompts.domainId);
}
