import { NextResponse } from "next/server";
import type { ReplanReason } from "@prisma/client";

import { regenerateLesson } from "@/lib/ai/lesson-regenerator";
import { loadCurrentReplanContext } from "@/lib/ai/replan-runtime";
import { ROUTES } from "@/lib/routes";
import { getOrCreateGuestUserId } from "@/lib/session";

const REPLAN_REASONS = new Set<ReplanReason>(["too_hard", "pace_too_fast", "wrong_goal", "inactive"]);

function parsePayload(payload: Record<string, unknown>) {
  return {
    reason: typeof payload.reason === "string" ? payload.reason : "inactive"
  };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const expectsJson = contentType.includes("application/json");
  const payload = expectsJson
    ? ((await request.json()) as Record<string, unknown>)
    : Object.fromEntries(await request.formData());
  const { reason } = parsePayload(payload);

  if (!REPLAN_REASONS.has(reason as ReplanReason)) {
    return NextResponse.json(
      {
        status: "error",
        message: "A valid replan reason is required."
      },
      { status: 400 }
    );
  }

  try {
    const guestUserId = await getOrCreateGuestUserId();
    const context = await loadCurrentReplanContext(guestUserId);

    if (!context) {
      return NextResponse.json(
        {
          status: "error",
          message: "No active plan and lesson found."
        },
        { status: 404 }
      );
    }

    const result = await regenerateLesson({
      lessonId: context.currentLessonId,
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
        message: error instanceof Error ? error.message : "Replan failed."
      },
      { status: 503 }
    );
  }
}
