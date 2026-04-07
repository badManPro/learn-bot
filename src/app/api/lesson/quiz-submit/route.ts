import { NextResponse } from "next/server";

import { submitQuizAnswer } from "@/lib/domain/progress";

function parseQuizPayload(payload: Record<string, unknown>) {
  return {
    lessonId: typeof payload.lessonId === "string" ? payload.lessonId : "",
    answer: typeof payload.answer === "string" ? payload.answer : ""
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const { lessonId, answer } = parseQuizPayload(payload);

  if (!lessonId || !answer) {
    return NextResponse.json(
      {
        status: "error",
        message: "lessonId and answer are required."
      },
      { status: 400 }
    );
  }

  const result = await submitQuizAnswer({ lessonId, answer });

  if (result.status === "missing_quiz") {
    return NextResponse.json(
      {
        status: "error",
        message: "Quiz not found."
      },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
