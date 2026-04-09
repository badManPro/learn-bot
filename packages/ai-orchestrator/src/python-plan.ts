import type { PlanContract } from "@learn-bot/ai-contracts";

import type { StructuredTextModel } from "./openai-client";
import {
  buildPlanPrompts,
  generatePlan,
  PlanGenerationRequestSchema,
  type PlanGenerationRequest
} from "./plan";

export function buildPythonPlanPrompts(input: PlanGenerationRequest) {
  return buildPlanPrompts({
    ...input,
    preferredDomain: "python"
  });
}

export async function generatePythonPlan(args: {
  client: StructuredTextModel;
  input: PlanGenerationRequest;
  model: string;
}): Promise<PlanContract> {
  return generatePlan({
    ...args,
    input: PlanGenerationRequestSchema.parse({
      ...args.input,
      preferredDomain: "python"
    })
  });
}
