import type { LessonContract, PlanContract } from "@learn-bot/ai-contracts";

export const ipcChannels = {
  authLogin: "auth:login",
  authSessionGet: "auth:session:get",
  planGenerate: "plan:generate",
  lessonGenerate: "lesson:generate"
} as const;

export type DesktopSessionStatus = "anonymous" | "pending" | "authenticated";

export type DesktopSession = {
  status: DesktopSessionStatus;
  workspaceId: string | null;
  accountLabel: string | null;
  loginHint: string;
};

export type DesktopApi = {
  auth: {
    login: () => Promise<DesktopSession>;
    session: {
      get: () => Promise<DesktopSession>;
    };
  };
  plan: {
    generate: () => Promise<PlanContract>;
  };
  lesson: {
    generate: () => Promise<LessonContract>;
  };
};
