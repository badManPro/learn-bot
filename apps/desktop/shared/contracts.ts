import type { LessonContract, PlanContract, ReplanContract } from "@learn-bot/ai-contracts";
import type { LessonGenerationRequest, PlanGenerationRequest, ReplanGenerationRequest } from "@learn-bot/ai-orchestrator";

export const ipcChannels = {
  authLogin: "auth:login",
  authSessionGet: "auth:session:get",
  planGenerate: "plan:generate",
  planReplan: "plan:replan",
  lessonGenerate: "lesson:generate",
  stateLoad: "state:load",
  stateSave: "state:save"
} as const;

export type DesktopSessionStatus = "anonymous" | "pending" | "authenticated";

export type DesktopSession = {
  status: DesktopSessionStatus;
  workspaceId: string | null;
  accountLabel: string | null;
  loginHint: string;
};

export type DesktopLearningState = {
  plan: PlanContract | null;
  lesson: LessonContract | null;
  lessonHistory: LessonContract[];
  replan: ReplanContract | null;
};

export function createEmptyDesktopLearningState(): DesktopLearningState {
  return {
    plan: null,
    lesson: null,
    lessonHistory: [],
    replan: null
  };
}

export type DesktopApi = {
  auth: {
    login: () => Promise<DesktopSession>;
    session: {
      get: () => Promise<DesktopSession>;
    };
  };
  plan: {
    generate: (input: PlanGenerationRequest) => Promise<PlanContract>;
    replan: (input: ReplanGenerationRequest) => Promise<ReplanContract>;
  };
  lesson: {
    generate: (input: LessonGenerationRequest) => Promise<LessonContract>;
  };
  state: {
    load: () => Promise<DesktopLearningState>;
    save: (input: DesktopLearningState) => Promise<DesktopLearningState>;
  };
};
