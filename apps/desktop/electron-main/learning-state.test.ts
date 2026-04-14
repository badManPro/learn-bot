import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import type { DesktopLearningState } from "../shared/contracts";
import { createEmptyDesktopLearningState } from "../shared/contracts";
import { createDesktopLearningStateStore } from "./learning-state";

const tempDirs: string[] = [];

function createLesson(lessonId: string, title: string) {
  return {
    lessonId,
    title,
    whyThisNow: "It turns the active milestone into one concrete practice block.",
    whyItMatters: "A single completed loop creates momentum and visible progress.",
    estimatedTotalMinutes: 30,
    completionContract: {
      summary: "Run one tiny script from input to output.",
      passCriteria: ["The script runs once.", "You can explain what the output means."],
      failCriteria: ["The script never runs.", "You cannot inspect the result."]
    },
    completionCriteria: "The script runs once and prints the expected output.",
    materialsNeeded: ["Python", "Terminal"],
    tasks: [
      {
        id: `${lessonId}-task-1`,
        title: "Write the starter script",
        type: "coding" as const,
        instructions: "Create a file and write one input-output script.",
        expectedOutput: "A runnable starter script.",
        estimatedMinutes: 15,
        verificationMethod: "run_command" as const,
        skipPolicy: "never_skip" as const
      },
      {
        id: `${lessonId}-task-2`,
        title: "Run and verify output",
        type: "verification" as const,
        instructions: "Execute the script and compare the real output with the expected output.",
        expectedOutput: "The expected output appears in the terminal.",
        estimatedMinutes: 15,
        verificationMethod: "compare_output" as const,
        skipPolicy: "never_skip" as const
      }
    ],
    ifBlocked: [
      {
        trigger: "脚本报错",
        response: "把脚本缩减到一个输入和一个 print，然后重新运行。"
      }
    ],
    reflectionPrompt: "哪个步骤最清楚地暴露了你的理解缺口？",
    nextDefaultAction: {
      label: "Try a second input case.",
      rationale: "A second case confirms the first script was not accidental."
    },
    quiz: {
      kind: "single_choice" as const,
      question: "What proves the script works?",
      options: ["The expected output appears.", "You have a plan for later."],
      correctAnswer: "The expected output appears."
    }
  };
}

function createSampleState(): DesktopLearningState {
  return {
    plan: {
      planTitle: "Python Automation Path",
      domainId: "python",
      tags: ["python", "automation"],
      goalSummary: "Build one useful Python automation workflow.",
      totalEstimatedWeeks: 6,
      milestones: [
        {
          id: "milestone-1",
          index: 1,
          title: "Starter Loop",
          purpose: "Get to one runnable automation quickly.",
          outcome: "One script saves time.",
          prerequisites: [],
          successCriteria: ["Run one script end-to-end."],
          recommendedWeeks: 2,
          lessonTypes: ["setup", "practice"],
          status: "active"
        }
      ],
      currentStrategy: "Keep the workload tiny and focus on one visible win.",
      todayLessonSeed: {
        milestoneId: "milestone-1",
        lessonType: "practice",
        objective: "Write and run one tiny automation script."
      },
      warnings: []
    },
    lesson: createLesson("lesson-1", "Run one tiny automation script"),
    lessonHistory: [createLesson("lesson-0", "Inspect one starter script")],
    replan: {
      replanReason: "too_hard",
      diagnosis: "The current lesson bundles writing and debugging into one jump.",
      paceChange: "Reduce scope to one input and one output.",
      milestoneAdjustment: "Keep the active milestone and shrink the task size.",
      replacementLesson: {
        title: "Shrink to one runnable script",
        focus: "One input, one output, one validation step.",
        firstStep: "Create the file and add one print statement.",
        reason: "A smaller unit restores momentum without changing the goal."
      },
      replacementLessonSeed: {
        milestoneId: "milestone-1",
        lessonType: "practice",
        objective: "Create one tiny runnable script."
      },
      replacementLessonTitle: "Retry with one tiny runnable script",
      userMessage: "先把范围缩到最小，跑通一次，再逐步扩展。"
    }
  };
}

async function createTestStore() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "learn-bot-desktop-state-"));
  const filePath = path.join(dir, "desktop-learning-state.json");
  tempDirs.push(dir);

  return {
    filePath,
    store: createDesktopLearningStateStore({
      filePath,
      logger: {
        warn: () => undefined
      }
    })
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("createDesktopLearningStateStore round-trips the persisted learning snapshot", async () => {
  const { filePath, store } = await createTestStore();
  const sampleState = createSampleState();

  const saved = await store.save(sampleState);
  const restored = await store.load();
  const rawFile = JSON.parse(await readFile(filePath, "utf8")) as { version: number };

  expect(saved).toEqual(sampleState);
  expect(restored).toEqual(sampleState);
  expect(rawFile.version).toBe(1);
});

test("createDesktopLearningStateStore ignores invalid persisted snapshots", async () => {
  const { filePath, store } = await createTestStore();

  await writeFile(filePath, '{"version":1,"snapshot":{"plan":"broken"}}', "utf8");

  await expect(store.load()).resolves.toEqual(createEmptyDesktopLearningState());
});

test("createDesktopLearningStateStore removes the file when the snapshot becomes empty", async () => {
  const { filePath, store } = await createTestStore();

  await store.save(createSampleState());
  await store.save(createEmptyDesktopLearningState());

  await expect(readFile(filePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  await expect(store.load()).resolves.toEqual(createEmptyDesktopLearningState());
});
