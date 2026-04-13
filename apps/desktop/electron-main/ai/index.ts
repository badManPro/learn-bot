import type { LessonContract, PlanContract, ReplanContract } from "@learn-bot/ai-contracts";
import {
  createOpenAIStructuredModel,
  generateLessonForDomain,
  generatePlan,
  generateReplanForDomain,
  type LessonGenerationRequest,
  type PlanGenerationRequest,
  type ReplanGenerationRequest,
  type StructuredTextModel
} from "@learn-bot/ai-orchestrator";

import { getSessionSnapshot } from "../auth";
import { createCodexCliStructuredModel } from "./codex-cli-client";

type DesktopAiProvider = "codex-cli" | "openai-api-key";

function defaultModelForProvider(_provider: DesktopAiProvider) {
  return "gpt-5.4";
}

function resolvePlanModel(provider: DesktopAiProvider) {
  return process.env.LEARN_BOT_PLAN_MODEL ?? defaultModelForProvider(provider);
}

function resolveLessonModel(provider: DesktopAiProvider) {
  return process.env.LEARN_BOT_LESSON_MODEL ?? process.env.LEARN_BOT_PLAN_MODEL ?? defaultModelForProvider(provider);
}

function resolveReplanModel(provider: DesktopAiProvider) {
  return process.env.LEARN_BOT_REPLAN_MODEL ?? process.env.LEARN_BOT_PLAN_MODEL ?? defaultModelForProvider(provider);
}

function readFallbackApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey ? apiKey : null;
}

async function createStructuredClient(): Promise<{ client: StructuredTextModel; provider: DesktopAiProvider }> {
  const session = await getSessionSnapshot();
  if (session.status === "authenticated") {
    return {
      client: createCodexCliStructuredModel(),
      provider: "codex-cli"
    };
  }

  const fallbackApiKey = readFallbackApiKey();
  if (fallbackApiKey) {
    return {
      client: createOpenAIStructuredModel(fallbackApiKey),
      provider: "openai-api-key"
    };
  }

  throw new Error("当前未检测到可复用的 `codex login` 登录态，也未设置 OPENAI_API_KEY。请先完成 Codex 浏览器登录，或在开发环境中配置 API key。");
}

export async function generateDesktopPlan(input: PlanGenerationRequest): Promise<PlanContract> {
  const runtime = await createStructuredClient();
  return generatePlan({
    client: runtime.client,
    input,
    model: resolvePlanModel(runtime.provider)
  });
}

export async function generateDesktopLesson(input: LessonGenerationRequest): Promise<LessonContract> {
  const runtime = await createStructuredClient();
  return generateLessonForDomain({
    client: runtime.client,
    input,
    model: resolveLessonModel(runtime.provider)
  });
}

export async function generateDesktopReplan(input: ReplanGenerationRequest): Promise<ReplanContract> {
  const runtime = await createStructuredClient();
  return generateReplanForDomain({
    client: runtime.client,
    input,
    model: resolveReplanModel(runtime.provider)
  });
}
