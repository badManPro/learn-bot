import type { CurrentLevel, PaceMode } from "@prisma/client";
import { z } from "zod";

export const lessonPayloadSchema = z.object({
  title: z.string(),
  whyItMatters: z.string(),
  completionCriteria: z.string(),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        instructions: z.string(),
        estimatedMinutes: z.number().int().min(10).max(15)
      })
    )
    .min(2)
    .max(4),
  quiz: z.object({
    kind: z.enum(["single_choice", "true_false"]),
    question: z.string(),
    options: z.array(z.string()).min(2),
    correctAnswer: z.string()
  })
});

export type LessonPayload = z.infer<typeof lessonPayloadSchema>;

type FirstLessonInput = {
  currentLevel: CurrentLevel;
  goalText: string;
  paceMode?: PaceMode;
};

function buildLessonTasks({
  currentLevel,
  goalText,
  paceMode
}: Required<Pick<FirstLessonInput, "currentLevel" | "goalText">> & { paceMode: PaceMode }): LessonPayload["tasks"] {
  const setupInstructions =
    currentLevel === "zero"
      ? "安装 Python 3，打开终端，运行 `python3 --version` 确认环境可用。"
      : "在终端确认 Python 环境可用，并准备一个新的练习目录。";

  if (paceMode === "lighter") {
    return [
      {
        title: "确认 Python 环境并运行 hello world",
        instructions: `${setupInstructions} 然后创建 \`hello.py\`，打印 \`Hello, AI workflows!\` 并运行它。`,
        estimatedMinutes: 10
      },
      {
        title: "从模板跑通假 AI CLI",
        instructions: `从最小模板开始，创建一个读取用户输入并返回固定回复的脚本，主题围绕「${goalText.trim()}」展开。`,
        estimatedMinutes: 10
      }
    ];
  }

  if (paceMode === "slower") {
    return [
      {
        title: "确认 Python 环境",
        instructions: setupInstructions,
        estimatedMinutes: 10
      },
      {
        title: "准备练习目录",
        instructions: "新建一个练习文件夹，并创建 `hello.py` 与 `fake_ai.py` 两个空文件。",
        estimatedMinutes: 10
      },
      {
        title: "运行 hello world",
        instructions: "先只在 `hello.py` 里打印 `Hello, AI workflows!`，确保脚本能独立运行。",
        estimatedMinutes: 10
      },
      {
        title: "从模板改出假 AI CLI",
        instructions: `让 \`fake_ai.py\` 读取用户输入并返回固定回复，主题仍围绕「${goalText.trim()}」展开。`,
        estimatedMinutes: 10
      }
    ];
  }

  return [
    {
      title: "确认 Python 环境",
      instructions: setupInstructions,
      estimatedMinutes: 10
    },
    {
      title: "运行 hello world",
      instructions: "创建 `hello.py`，打印 `Hello, AI workflows!`，并在终端运行它。",
      estimatedMinutes: 10
    },
    {
      title: "做一个假 AI CLI",
      instructions: `创建一个脚本读取用户输入，并返回固定回复，主题围绕「${goalText.trim()}」展开。`,
      estimatedMinutes: 15
    }
  ];
}

export function generateFirstLessonPayload({ currentLevel, goalText, paceMode = "default" }: FirstLessonInput): LessonPayload {
  const tasks = buildLessonTasks({ currentLevel, goalText, paceMode });

  return lessonPayloadSchema.parse({
    title: "Day 1: 跑通你的第一个 Python for AI 工作流练习",
    whyItMatters: "先把环境和最小可运行脚本跑通，后面的 AI 工作流练习才不会卡在基础问题上。",
    completionCriteria: "你能在本地成功运行 hello world 和一个假 AI 命令行脚本。",
    tasks,
    quiz: {
      kind: "single_choice",
      question: "今天这一课最重要的结果是什么？",
      options: ["先把本地 Python 脚本跑通", "立刻接入真实 API", "开始做复杂多文件项目"],
      correctAnswer: "先把本地 Python 脚本跑通"
    }
  });
}

export function getLessonPreview(): LessonPayload {
  return generateFirstLessonPayload({
    currentLevel: "zero",
    goalText: "Python for AI workflows",
    paceMode: "default"
  });
}
