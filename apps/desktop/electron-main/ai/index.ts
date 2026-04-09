import type { LessonContract, PlanContract } from "@learn-bot/ai-contracts";
import {
  createOpenAIStructuredModel,
  generatePythonLesson,
  generatePythonPlan,
  type LessonGenerationRequest,
  type PlanGenerationRequest
} from "@learn-bot/ai-orchestrator";

function resolvePlanModel() {
  return process.env.LEARN_BOT_PLAN_MODEL ?? "gpt-5-mini";
}

function resolveLessonModel() {
  return process.env.LEARN_BOT_LESSON_MODEL ?? process.env.LEARN_BOT_PLAN_MODEL ?? "gpt-5-mini";
}

function requireOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. The desktop plan generation path is wired, but it cannot run without an API key.");
  }

  return apiKey;
}

function createStructuredClient() {
  return createOpenAIStructuredModel(requireOpenAIApiKey());
}

export async function generateDesktopPlan(input: PlanGenerationRequest): Promise<PlanContract> {
  return generatePythonPlan({
    client: createStructuredClient(),
    input,
    model: resolvePlanModel()
  });
}

export async function generateDesktopLesson(input: LessonGenerationRequest): Promise<LessonContract> {
  return generatePythonLesson({
    client: createStructuredClient(),
    input,
    model: resolveLessonModel()
  });
}
