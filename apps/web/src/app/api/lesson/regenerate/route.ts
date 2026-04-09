import { NextResponse } from "next/server";
import type { ReplanReason } from "@prisma/client";

import { regenerateLesson } from "@/lib/ai/lesson-regenerator";
import { ROUTES } from "@/lib/routes";

const REGENERATION_REASONS = new Set<ReplanReason>(["too_hard", "pace_too_fast", "wrong_goal", "inactive"]);

function parsePayload(payload: Record<string, unknown>) {
  return {
    lessonId: typeof payload.lessonId === "string" ? payload.lessonId : "",
    reason: typeof payload.reason === "string" ? payload.reason : ""
  };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const expectsJson = contentType.includes("application/json");
  const payload = expectsJson
    ? ((await request.json()) as Record<string, unknown>)
    : Object.fromEntries(await request.formData());
  const { lessonId, reason } = parsePayload(payload);

  if (!lessonId || !REGENERATION_REASONS.has(reason as ReplanReason)) {
    return NextResponse.json(
      {
        status: "error",
        message: "lessonId and a valid reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const result = await regenerateLesson({
      lessonId,
      reason: reason as ReplanReason
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

    if (!expectsJson) {
      const response = NextResponse.redirect(request.url, 303);
      response.headers.set("location", ROUTES.lesson(result.lessonId));
      return response;
    }

    return NextResponse.json({
      status: "ok",
      lessonId: result.lessonId,
      milestoneId: result.milestoneId,
      regenerationCount: result.regenerationCount,
      changeSummary: result.changeSummary
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Lesson regeneration failed."
      },
      { status: 503 }
    );
  }
}
