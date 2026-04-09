import type { LessonContract, PlanContract } from "@learn-bot/ai-contracts";
import { buildPianoLessonPrompts, generatePianoLesson, type StructuredTextModel } from "@learn-bot/ai-orchestrator";

const samplePlan: PlanContract = {
  planTitle: "Piano Foundations Roadmap",
  domainId: "piano",
  tags: ["piano", "beginner", "rhythm"],
  goalSummary: "Build stable beginner piano timing and coordination.",
  totalEstimatedWeeks: 4,
  milestones: [
    {
      id: "m2",
      index: 1,
      title: "Keep a steady pulse",
      purpose: "Build rhythm control before bigger repertoire.",
      outcome: "Simple patterns stay in time with a metronome.",
      prerequisites: [],
      successCriteria: ["A short drill stays aligned with the click", "The learner can count aloud while playing"],
      recommendedWeeks: 2,
      lessonTypes: ["practice"],
      status: "active"
    }
  ],
  currentStrategy: "Keep the drills short and audible.",
  todayLessonSeed: {
    milestoneId: "m2",
    lessonType: "practice",
    objective: "Clap and play one steady quarter-note pattern"
  },
  warnings: []
};

const sampleLesson: LessonContract = {
  lessonId: "raw-output-id",
  title: "Quarter-note pulse with both hands",
  whyThisNow: "The learner needs one stable rhythmic loop before adding more notes.",
  whyItMatters: "Steady pulse is the base for every later coordination task.",
  estimatedTotalMinutes: 20,
  completionContract: {
    summary: "Play one short pattern in time with a metronome.",
    passCriteria: ["The pattern stays with the click for eight bars"],
    failCriteria: ["The learner loses the pulse after a few beats"]
  },
  completionCriteria: "Play one short pattern in time with a metronome.",
  materialsNeeded: ["Printed rhythm note"],
  tasks: [
    {
      id: "task_1",
      title: "Set the metronome and count aloud",
      type: "setup",
      instructions: "Set the metronome to a slow tempo and count four beats aloud.",
      expectedOutput: "A stable spoken count with the click.",
      estimatedMinutes: 8,
      verificationMethod: "self_check",
      skipPolicy: "never_skip"
    },
    {
      id: "task_2",
      title: "Play the pattern slowly",
      type: "practice",
      instructions: "Play one repeated quarter-note pattern with both hands for eight bars.",
      expectedOutput: "One clean slow run.",
      estimatedMinutes: 12,
      verificationMethod: "manual_review",
      skipPolicy: "never_skip"
    },
    {
      id: "task_3",
      title: "Check the pulse",
      type: "verification",
      instructions: "Repeat the pattern once more and confirm every beat lands with the metronome.",
      expectedOutput: "A second run with no obvious drift.",
      estimatedMinutes: 10,
      verificationMethod: "self_check",
      skipPolicy: "never_skip"
    }
  ],
  ifBlocked: [
    {
      trigger: "The learner rushes the pattern",
      response: "Lower the tempo and clap the rhythm once before playing again."
    }
  ],
  reflectionPrompt: "Which beat felt least stable, and what changed when you slowed down?",
  nextDefaultAction: {
    label: "Repeat the same pulse with one simple variation",
    rationale: "Keep the same milestone while slightly extending control."
  },
  quiz: {
    kind: "single_choice",
    question: "What should you change first if the rhythm keeps rushing?",
    options: ["Lower the tempo", "Add more notes", "Stop using the metronome"],
    correctAnswer: "Lower the tempo"
  }
};

test("piano lesson prompts include domain rules and learner context", () => {
  const prompts = buildPianoLessonPrompts({
    goalText: "我想学钢琴基础节奏",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 150,
    targetDeadline: "2026-06-30",
    mbti: "INFP",
    plan: samplePlan
  });

  expect(prompts.systemPrompt).toContain("Domain pack: Piano");
  expect(prompts.systemPrompt).toContain("Supported modalities");
  expect(prompts.userPrompt).toContain("Today's lesson seed objective: Clap and play one steady quarter-note pattern");
  expect(prompts.userPrompt).toContain("Derived pace signal: lighter");
});

test("piano lesson generation normalizes lesson ids, materials, and total minutes", async () => {
  const fakeClient: StructuredTextModel = {
    parse: async () => sampleLesson
  };

  const result = await generatePianoLesson({
    client: fakeClient,
    input: {
      goalText: "I want to learn beginner piano rhythm",
      currentLevel: "zero",
      weeklyTimeBudgetMinutes: 180,
      targetDeadline: "2026-06-30",
      mbti: null,
      plan: samplePlan
    },
    model: "gpt-5-mini"
  });

  expect(result.lessonId).toBe("piano-m2-practice");
  expect(result.estimatedTotalMinutes).toBe(30);
  expect(result.materialsNeeded).toEqual(
    expect.arrayContaining(["Keyboard or piano", "Metronome", "Stable bench or seat", "Printed rhythm note"])
  );
});
