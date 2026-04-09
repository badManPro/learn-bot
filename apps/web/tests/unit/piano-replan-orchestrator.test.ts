import type { LessonContract, PlanContract, ReplanContract } from "@learn-bot/ai-contracts";
import { buildPianoReplanPrompts, generatePianoReplan, type StructuredTextModel } from "@learn-bot/ai-orchestrator";

const samplePlan: PlanContract = {
  planTitle: "Piano Foundations Roadmap",
  domainId: "piano",
  tags: ["piano", "beginner", "rhythm"],
  goalSummary: "Build steady timing and simple hand coordination on piano.",
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
      lessonTypes: ["practice", "review"],
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
  lessonId: "piano-m2-practice",
  title: "Quarter-note pulse with both hands",
  whyThisNow: "The learner needs one stable rhythmic loop before adding more notes.",
  whyItMatters: "Steady pulse is the base for every later coordination task.",
  estimatedTotalMinutes: 30,
  completionContract: {
    summary: "Play one short pattern in time with a metronome.",
    passCriteria: ["The pattern stays with the click for eight bars"],
    failCriteria: ["The learner loses the pulse after a few beats"]
  },
  completionCriteria: "Play one short pattern in time with a metronome.",
  materialsNeeded: ["Keyboard or piano", "Metronome"],
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

const sampleReplan: ReplanContract = {
  replanReason: "too_hard",
  diagnosis: "The coordination target is still too large for one sitting.",
  paceChange: "Reduce the pressure and keep the next drill shorter.",
  milestoneAdjustment: "Stay on the same milestone and shrink the drill before adding variation.",
  replacementLesson: {
    title: "One-hand pulse reset",
    focus: "Play the same rhythm with one hand only at a slower tempo.",
    firstStep: "Set the metronome lower and clap the pulse once before playing.",
    reason: "Reducing coordination load restores momentum without changing the goal."
  },
  replacementLessonSeed: {
    milestoneId: "wrong-id",
    lessonType: "practice",
    objective: "Play the same rhythm with one hand only"
  },
  replacementLessonTitle: "Placeholder",
  userMessage: "Keep the milestone, but lower the coordination load for the next practice block."
};

test("piano replan prompts include current lesson and piano-specific guidance", () => {
  const prompts = buildPianoReplanPrompts({
    goalText: "我想学钢琴基础节奏",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 120,
    targetDeadline: "2026-06-30",
    mbti: "ISFJ",
    plan: samplePlan,
    currentLesson: sampleLesson,
    reason: "too_hard",
    lessonHistory: [sampleLesson]
  });

  expect(prompts.systemPrompt).toContain("Domain pack: Piano");
  expect(prompts.systemPrompt).toContain("reduce physical and coordination load");
  expect(prompts.userPrompt).toContain("Replan reason: too_hard");
  expect(prompts.userPrompt).toContain(sampleLesson.title);
});

test("piano replan generation normalizes replacement lesson title and seed", async () => {
  const fakeClient: StructuredTextModel = {
    parse: async () => sampleReplan
  };

  const result = await generatePianoReplan({
    client: fakeClient,
    input: {
      goalText: "I want to learn beginner piano rhythm",
      currentLevel: "zero",
      weeklyTimeBudgetMinutes: 120,
      targetDeadline: "2026-06-30",
      mbti: null,
      plan: samplePlan,
      currentLesson: sampleLesson,
      reason: "too_hard",
      lessonHistory: [sampleLesson]
    },
    model: "gpt-5-mini"
  });

  expect(result.replanReason).toBe("too_hard");
  expect(result.replacementLessonTitle).toBe("One-hand pulse reset");
  expect(result.replacementLessonSeed.milestoneId).toBe("m2");
  expect(result.replacementLessonSeed.lessonType).toBe("review");
});
