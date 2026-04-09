import type { LessonContract, ReplanContract } from "@learn-bot/ai-contracts";

import { generatePianoLesson } from "./piano-lesson";
import { generatePianoReplan } from "./piano-replan";
import { generatePythonLesson } from "./python-lesson";
import { generatePythonReplan } from "./python-replan";
import type { StructuredTextModel } from "./openai-client";
import type { LessonGenerationRequest } from "./lesson";
import type { ReplanGenerationRequest } from "./replan";

export const interactiveDomainIds = ["python", "piano"] as const;

export type InteractiveDomainId = (typeof interactiveDomainIds)[number];

export function supportsInteractiveDomain(domainId: string): domainId is InteractiveDomainId {
  return interactiveDomainIds.includes(domainId as InteractiveDomainId);
}

function unsupportedDomainError(kind: "lesson" | "replan", domainId: string) {
  return new Error(
    `${kind === "lesson" ? "Lesson generation" : "Replanning"} is currently implemented only for ${interactiveDomainIds.join(
      " and "
    )} plans. Received domain: ${domainId}.`
  );
}

export async function generateLessonForDomain(args: {
  client: StructuredTextModel;
  input: LessonGenerationRequest;
  model: string;
}): Promise<LessonContract> {
  switch (args.input.plan.domainId) {
    case "python":
      return generatePythonLesson(args);
    case "piano":
      return generatePianoLesson(args);
    default:
      throw unsupportedDomainError("lesson", args.input.plan.domainId);
  }
}

export async function generateReplanForDomain(args: {
  client: StructuredTextModel;
  input: ReplanGenerationRequest;
  model: string;
}): Promise<ReplanContract> {
  switch (args.input.plan.domainId) {
    case "python":
      return generatePythonReplan(args);
    case "piano":
      return generatePianoReplan(args);
    default:
      throw unsupportedDomainError("replan", args.input.plan.domainId);
  }
}
