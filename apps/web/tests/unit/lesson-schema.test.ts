import { lessonPayloadSchema } from "@/lib/ai/lesson-generator";

test("lesson payload has 2 to 4 tasks and one quiz", () => {
  const result = lessonPayloadSchema.safeParse({
    title: "Day 1",
    whyItMatters: "Python is the base for later AI workflows.",
    completionCriteria: "Run hello world",
    tasks: [
      { title: "Task A", instructions: "Do A", estimatedMinutes: 10 },
      { title: "Task B", instructions: "Do B", estimatedMinutes: 15 }
    ],
    quiz: {
      kind: "single_choice",
      question: "Q",
      options: ["A", "B"],
      correctAnswer: "A"
    }
  });

  expect(result.success).toBe(true);
});
