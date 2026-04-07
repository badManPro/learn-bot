import { NextResponse } from "next/server";

import { mapGoal } from "@/lib/ai/goal-mapper";
import { db } from "@/lib/db";
import { ROUTES } from "@/lib/routes";
import { getOrCreateGuestUserId } from "@/lib/session";
import { onboardingSchema } from "@/lib/validations/onboarding";

function normalizePayload(payload: Record<string, FormDataEntryValue | unknown>) {
  return {
    goalText: typeof payload.goalText === "string" ? payload.goalText : "",
    currentLevel: typeof payload.currentLevel === "string" ? payload.currentLevel : "",
    weeklyTimeBudgetMinutes:
      typeof payload.weeklyTimeBudgetMinutes === "string" || typeof payload.weeklyTimeBudgetMinutes === "number"
        ? payload.weeklyTimeBudgetMinutes
        : "",
    targetDeadline: typeof payload.targetDeadline === "string" ? payload.targetDeadline : "",
    mbti: typeof payload.mbti === "string" && payload.mbti.trim().length > 0 ? payload.mbti.trim() : null
  };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  const rawPayload = contentType.includes("application/json")
    ? ((await request.json()) as Record<string, unknown>)
    : Object.fromEntries(await request.formData());

  const parsed = onboardingSchema.safeParse(normalizePayload(rawPayload));

  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error",
        errors: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const guestUserId = await getOrCreateGuestUserId();
  const goalMapping = await mapGoal(parsed.data.goalText);

  await db.user.upsert({
    where: { id: guestUserId },
    create: { id: guestUserId },
    update: {}
  });

  await db.learningProfile.upsert({
    where: { userId: guestUserId },
    create: {
      userId: guestUserId,
      currentLevel: parsed.data.currentLevel,
      weeklyTimeBudgetMinutes: parsed.data.weeklyTimeBudgetMinutes,
      targetDeadline: new Date(parsed.data.targetDeadline),
      mbti: parsed.data.mbti ?? null,
      paceMode: "default",
      goalText: parsed.data.goalText,
      goalPath: goalMapping.mappedPath
    },
    update: {
      currentLevel: parsed.data.currentLevel,
      weeklyTimeBudgetMinutes: parsed.data.weeklyTimeBudgetMinutes,
      targetDeadline: new Date(parsed.data.targetDeadline),
      mbti: parsed.data.mbti ?? null,
      paceMode: "default",
      goalText: parsed.data.goalText,
      goalPath: goalMapping.mappedPath
    }
  });

  return NextResponse.json({
    status: "ok",
    redirectTo: goalMapping.supportStatus === "supported" ? ROUTES.roadmap : ROUTES.unsupported
  });
}
