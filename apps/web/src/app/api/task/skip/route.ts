import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getNextVisibleTaskIndex } from "@/lib/domain/progress";

function parseTaskId(payload: Record<string, unknown>) {
  return typeof payload.taskId === "string" ? payload.taskId : "";
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const taskId = parseTaskId(payload);

  if (!taskId) {
    return NextResponse.json(
      {
        status: "error",
        message: "taskId is required."
      },
      { status: 400 }
    );
  }

  const updatedTask = await db.atomicTask.update({
    where: { id: taskId },
    data: { status: "skipped" }
  });

  const tasks = await db.atomicTask.findMany({
    where: { lessonId: updatedTask.lessonId },
    orderBy: { orderIndex: "asc" }
  });

  const nextVisibleTaskIndex = getNextVisibleTaskIndex(tasks.map((task) => task.status !== "pending"));

  return NextResponse.json({
    status: "ok",
    nextVisibleTaskIndex
  });
}
