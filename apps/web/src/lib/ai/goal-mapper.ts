import { inferGoalDomain } from "@learn-bot/ai-orchestrator";

import { domainPackIdToGoalPath, type SupportedGoalPath } from "./goal-paths";

export type GoalMappingResult = {
  supportStatus: "supported" | "unsupported";
  mappedPath: SupportedGoalPath | null;
  normalizedGoal: string | null;
  unsupportedReason: string | null;
};

export async function mapGoal(rawGoal: string): Promise<GoalMappingResult> {
  const normalized = rawGoal.trim();

  const inferredDomain = inferGoalDomain(normalized);

  if (!inferredDomain) {
    return {
      supportStatus: "unsupported",
      mappedPath: null,
      normalizedGoal: null,
      unsupportedReason: "current_goal_unsupported"
    };
  }

  return {
    supportStatus: "supported",
    mappedPath: domainPackIdToGoalPath(inferredDomain),
    normalizedGoal: normalized,
    unsupportedReason: null
  };
}
