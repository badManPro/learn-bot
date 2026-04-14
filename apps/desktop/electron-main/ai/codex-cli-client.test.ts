import { expect, test } from "vitest";

import { LessonSchema } from "../../../../packages/ai-contracts/src/lesson.ts";

import { normalizeLessonPayload } from "./codex-cli-client.ts";

test("normalizeLessonPayload coerces loose lesson JSON into the shared lesson schema", () => {
  const normalized = normalizeLessonPayload({
    title: "Build one tiny automation loop",
    whyThisNow: "It turns the current milestone into one runnable workflow.",
    whyItMatters: "This creates the first reusable automation result.",
    completionContract: "Run one tiny input-output automation script.",
    completionCriteria: [
      "Script runs from input to output once.",
      "You can explain what the script changes."
    ],
    tasks: [
      {
        title: "Create a starter script",
        type: "build",
        instructions: ["Open the editor", "Write one tiny script"],
        verificationMethod: "run",
        skipPolicy: "never"
      },
      {
        title: "Run and inspect output",
        type: "verify",
        instructions: ["Execute the script once", "Compare output with expectation"]
      }
    ],
    ifBlocked: [
      "If the script fails, reduce it to one input and one print statement.",
      "If you get stuck, compare the real output with the expected output."
    ],
    nextDefaultAction: "Expand the script to a second input case.",
    reflectionPrompt: "Which step created the most clarity?",
    quiz: {
      question: "Which result proves the automation loop works?",
      options: [
        "The script runs from input to output and you can inspect the result.",
        "You have three ideas but no runnable output."
      ],
      correctAnswer: "The script runs from input to output and you can inspect the result."
    }
  });

  const parsed = LessonSchema.parse(normalized);

  expect(parsed.completionContract.summary).toBe("Run one tiny input-output automation script.");
  expect(parsed.completionCriteria).toBe("Script runs from input to output once.；You can explain what the script changes.");
  expect(parsed.tasks[0].instructions).toBe("Open the editor\nWrite one tiny script");
  expect(parsed.tasks[0].expectedOutput).toBe("Evidence that create a starter script is complete.");
  expect(parsed.tasks[0].estimatedMinutes).toBe(10);
  expect(parsed.ifBlocked[0].trigger).toBe("遇到阻碍 1");
  expect(parsed.nextDefaultAction.label).toBe("Expand the script to a second input case.");
  expect(parsed.quiz.kind).toBe("single_choice");
});
