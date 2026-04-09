import type { PaceMode } from "@prisma/client";

type DerivePaceModeInput = {
  mbti?: string | null;
  weeklyTimeBudgetMinutes: number;
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
