import type { GoalPath } from "@prisma/client";
import type { DomainPackId } from "@learn-bot/domain-packs";

export const GOAL_PATH_DOMAIN_MAP = {
  python_for_ai_workflows: "python",
  piano_foundations: "piano",
  drawing_foundations: "drawing"
} as const satisfies Record<string, DomainPackId>;

export type SupportedGoalPath = keyof typeof GOAL_PATH_DOMAIN_MAP;

export const supportedGoalPaths = Object.keys(GOAL_PATH_DOMAIN_MAP) as SupportedGoalPath[];

export const DOMAIN_GOAL_PATH_MAP = {
  python: "python_for_ai_workflows",
  piano: "piano_foundations",
  drawing: "drawing_foundations"
} as const satisfies Record<DomainPackId, SupportedGoalPath>;

export function isSupportedGoalPath(goalPath: GoalPath | null | undefined): goalPath is SupportedGoalPath {
  return typeof goalPath === "string" && goalPath in GOAL_PATH_DOMAIN_MAP;
}

export function goalPathToDomainPackId(goalPath: SupportedGoalPath): DomainPackId {
  return GOAL_PATH_DOMAIN_MAP[goalPath];
}

export function domainPackIdToGoalPath(domainId: DomainPackId): SupportedGoalPath {
  return DOMAIN_GOAL_PATH_MAP[domainId];
}
