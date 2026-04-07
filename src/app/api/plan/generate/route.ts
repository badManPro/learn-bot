import { NextResponse } from "next/server";

import { ensureCurrentPlanForUser } from "@/lib/ai/plan-generator";
import { getOrCreateGuestUserId } from "@/lib/session";

export async function POST() {
  const guestUserId = await getOrCreateGuestUserId();
  const snapshot = await ensureCurrentPlanForUser(guestUserId);

  if (!snapshot) {
    return NextResponse.json(
      {
        status: "error",
        message: "No supported learning profile found."
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    status: "ok",
    planId: snapshot.plan.id,
    currentLessonId: snapshot.currentLessonId
  });
}
