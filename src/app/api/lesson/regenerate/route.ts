import { NextResponse } from "next/server";
import type { ReplanReason } from "@prisma/client";

import { regenerateLesson } from "@/lib/ai/lesson-regenerator";

const REGENERATION_REASONS = new Set<ReplanReason>(["too_hard", "pace_too_fast", "wrong_goal", "inactive"]);

function parsePayload(payload: Record<string, unknown>) {
  return {
    lessonId: typeof payload.lessonId === "string" ? payload.lessonId : "",
    reason: typeof payload.reason === "string" ? payload.reason : "",
    regenerationCount: typeof payload.regenerationCount === "number" ? payload.regenerationCount : 0
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const { lessonId, reason, regenerationCount } = parsePayload(payload);

  if (!lessonId || !REGENERATION_REASONS.has(reason as ReplanReason)) {
    return NextResponse.json(
      {
        status: "error",
        message: "lessonId and a valid reason are required."
      },
      { status: 400 }
    );
  }

  const result = await regenerateLesson({
    lessonId,
    reason: reason as ReplanReason,
    regenerationCount
  });

  if (!result) {
    return NextResponse.json(
      {
        status: "error",
        message: "Lesson not found."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "ok",
    lessonId: result.lessonId,
    milestoneId: result.milestoneId,
    regenerationCount: result.regenerationCount,
    changeSummary: result.changeSummary
  });
}
