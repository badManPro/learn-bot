import { NextResponse } from "next/server";

import { ensureCurrentPlanForUser } from "@/lib/ai/plan-generator";
import { getOrCreateGuestUserId } from "@/lib/session";

export async function GET() {
  try {
    const guestUserId = await getOrCreateGuestUserId();
    const snapshot = await ensureCurrentPlanForUser(guestUserId);

    if (!snapshot) {
      return NextResponse.json(
        {
          status: "error",
          message: "No active plan found."
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      plan: {
        id: snapshot.plan.id,
        goalPath: snapshot.plan.goalPath,
        currentMilestoneIndex: snapshot.plan.currentMilestoneIndex
      },
      milestones: snapshot.milestones.map((milestone) => ({
        index: milestone.index,
        title: milestone.title,
        outcome: milestone.outcome
      })),
      currentLessonId: snapshot.currentLessonId
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Plan runtime unavailable."
      },
      { status: 503 }
    );
  }
}
