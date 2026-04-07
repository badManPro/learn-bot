import { NextResponse } from "next/server";
import type { ReplanReason } from "@prisma/client";

import { db } from "@/lib/db";
import { buildReplanResult, type ReplanMode } from "@/lib/domain/replan";
import { getOrCreateGuestUserId } from "@/lib/session";

const REPLAN_MODES = new Set<ReplanMode>(["continue", "light", "rearrange"]);
const REPLAN_REASONS = new Set<ReplanReason>(["too_hard", "pace_too_fast", "wrong_goal", "inactive"]);

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parsePayload(payload: Record<string, unknown>) {
  return {
    mode: typeof payload.mode === "string" ? payload.mode : "",
    reason: typeof payload.reason === "string" ? payload.reason : "inactive"
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const { mode, reason } = parsePayload(payload);

  if (!REPLAN_MODES.has(mode as ReplanMode) || !REPLAN_REASONS.has(reason as ReplanReason)) {
    return NextResponse.json(
      {
        status: "error",
        message: "mode and reason are required."
      },
      { status: 400 }
    );
  }

  const guestUserId = await getOrCreateGuestUserId();

  const [profile, plan] = await Promise.all([
    db.learningProfile.findUnique({
      where: { userId: guestUserId }
    }),
    db.plan.findFirst({
      where: {
        userId: guestUserId,
        status: "active"
      }
    })
  ]);

  if (!profile || !plan) {
    return NextResponse.json(
      {
        status: "error",
        message: "No active plan found."
      },
      { status: 404 }
    );
  }

  const result = buildReplanResult({
    mode: mode as ReplanMode,
    reason: reason as ReplanReason
  });

  const nextTargetEndDate = addDays(plan.targetEndDate, result.extendScheduleDays);

  await db.$transaction(async (tx) => {
    await tx.plan.update({
      where: { id: plan.id },
      data: {
        targetEndDate: nextTargetEndDate,
        daysInactiveCount: 0
      }
    });

    if (result.nextPaceMode) {
      await tx.learningProfile.update({
        where: { userId: guestUserId },
        data: {
          paceMode: result.nextPaceMode
        }
      });
    }
  });

  return NextResponse.json({
    status: "ok",
    recommendation: result.recommendedMode,
    insertReviewLesson: result.insertReviewLesson,
    extendScheduleDays: result.extendScheduleDays,
    nextPaceMode: result.nextPaceMode,
    summary: result.summary,
    targetEndDate: nextTargetEndDate.toISOString()
  });
}
