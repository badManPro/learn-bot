import type { PaceMode, ReplanReason } from "@prisma/client";

export type ReplanMode = "continue" | "light" | "rearrange";

type DerivePaceModeInput = {
  mbti?: string | null;
  weeklyTimeBudgetMinutes: number;
};

type BuildReplanResultInput = {
  mode: ReplanMode;
  reason: ReplanReason;
};

export type ReplanResult = {
  mode: ReplanMode;
  reason: ReplanReason;
  recommendedMode: ReplanMode;
  insertReviewLesson: boolean;
  extendScheduleDays: number;
  nextPaceMode: PaceMode | null;
  summary: string;
};

export function derivePaceMode({ mbti, weeklyTimeBudgetMinutes }: DerivePaceModeInput): PaceMode {
  if (weeklyTimeBudgetMinutes <= 120) {
    return "slower";
  }

  if (weeklyTimeBudgetMinutes <= 180) {
    return "lighter";
  }

  if (mbti?.startsWith("I")) {
    return "lighter";
  }

  return "default";
}

export function buildReplanResult({ mode, reason }: BuildReplanResultInput): ReplanResult {
  const recommendedMode: ReplanMode = reason === "inactive" ? "rearrange" : mode;

  switch (mode) {
    case "continue":
      return {
        mode,
        reason,
        recommendedMode,
        insertReviewLesson: false,
        extendScheduleDays: 0,
        nextPaceMode: null,
        summary: "保持当前节奏继续推进。"
      };
    case "light":
      return {
        mode,
        reason,
        recommendedMode,
        insertReviewLesson: false,
        extendScheduleDays: 3,
        nextPaceMode: "lighter",
        summary: "减轻这一周负担，先保留主线任务。"
      };
    case "rearrange":
      return {
        mode,
        reason,
        recommendedMode,
        insertReviewLesson: true,
        extendScheduleDays: 7,
        nextPaceMode: "slower",
        summary: "插入一节复习课，并拉长后续周期。"
      };
  }
}
