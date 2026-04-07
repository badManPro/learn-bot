const SUPPORTED_GOAL_PATTERN =
  /python|ai|llm|agent|chatbot|automation|workflow|script|自动化|工作流|ai 应用/i;

export type GoalMappingResult = {
  supportStatus: "supported" | "unsupported";
  mappedPath: "python_for_ai_workflows" | null;
  normalizedGoal: string | null;
  unsupportedReason: string | null;
};

export async function mapGoal(rawGoal: string): Promise<GoalMappingResult> {
  const normalized = rawGoal.trim();

  if (!SUPPORTED_GOAL_PATTERN.test(normalized)) {
    return {
      supportStatus: "unsupported",
      mappedPath: null,
      normalizedGoal: null,
      unsupportedReason: "current_goal_unsupported"
    };
  }

  return {
    supportStatus: "supported",
    mappedPath: "python_for_ai_workflows",
    normalizedGoal: normalized,
    unsupportedReason: null
  };
}
