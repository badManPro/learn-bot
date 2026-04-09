import type { CurrentLevel, PaceMode } from "@prisma/client";
import { LessonSchema, type LessonContract as LessonPayload } from "@learn-bot/ai-contracts";

export const lessonPayloadSchema = LessonSchema;
export type { LessonPayload };

type FirstLessonInput = {
  currentLevel: CurrentLevel;
  goalText: string;
  paceMode?: PaceMode;
};

function buildTaskId(orderIndex: number) {
  return `task_${orderIndex}`;
}

function buildTaskDefinition(task: {
  orderIndex: number;
  title: string;
  instructions: string;
  estimatedMinutes: number;
  type: LessonPayload["tasks"][number]["type"];
  expectedOutput: string;
  verificationMethod: LessonPayload["tasks"][number]["verificationMethod"];
}): LessonPayload["tasks"][number] {
  return {
    id: buildTaskId(task.orderIndex),
    title: task.title,
    type: task.type,
    instructions: task.instructions,
    expectedOutput: task.expectedOutput,
    estimatedMinutes: task.estimatedMinutes,
    verificationMethod: task.verificationMethod,
    skipPolicy: "never_skip"
  };
}

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
      buildTaskDefinition({
        orderIndex: 1,
        title: "确认 Python 环境并运行 hello world",
        instructions: `${setupInstructions} 然后创建 \`hello.py\`，打印 \`Hello, AI workflows!\` 并运行它。`,
        estimatedMinutes: 10,
        type: "setup",
        expectedOutput: "终端能显示 Python 版本，并成功打印 Hello, AI workflows!",
        verificationMethod: "run_command"
      }),
      buildTaskDefinition({
        orderIndex: 2,
        title: "从模板跑通假 AI CLI",
        instructions: `从最小模板开始，创建一个读取用户输入并返回固定回复的脚本，主题围绕「${goalText.trim()}」展开。`,
        estimatedMinutes: 10,
        type: "coding",
        expectedOutput: "一个可在终端接收输入并返回固定文本的脚本。",
        verificationMethod: "compare_output"
      })
    ];
  }

  if (paceMode === "slower") {
    return [
      buildTaskDefinition({
        orderIndex: 1,
        title: "确认 Python 环境",
        instructions: setupInstructions,
        estimatedMinutes: 10,
        type: "setup",
        expectedOutput: "终端中可以看到 Python 版本号。",
        verificationMethod: "run_command"
      }),
      buildTaskDefinition({
        orderIndex: 2,
        title: "准备练习目录",
        instructions: "新建一个练习文件夹，并创建 `hello.py` 与 `fake_ai.py` 两个空文件。",
        estimatedMinutes: 10,
        type: "setup",
        expectedOutput: "练习目录中出现 hello.py 和 fake_ai.py 两个文件。",
        verificationMethod: "self_check"
      }),
      buildTaskDefinition({
        orderIndex: 3,
        title: "运行 hello world",
        instructions: "先只在 `hello.py` 里打印 `Hello, AI workflows!`，确保脚本能独立运行。",
        estimatedMinutes: 10,
        type: "coding",
        expectedOutput: "终端成功输出 Hello, AI workflows!",
        verificationMethod: "run_command"
      }),
      buildTaskDefinition({
        orderIndex: 4,
        title: "从模板改出假 AI CLI",
        instructions: `让 \`fake_ai.py\` 读取用户输入并返回固定回复，主题仍围绕「${goalText.trim()}」展开。`,
        estimatedMinutes: 10,
        type: "coding",
        expectedOutput: "假 AI CLI 能在终端中读取输入并输出固定回复。",
        verificationMethod: "compare_output"
      })
    ];
  }

  return [
    buildTaskDefinition({
      orderIndex: 1,
      title: "确认 Python 环境",
      instructions: setupInstructions,
      estimatedMinutes: 10,
      type: "setup",
      expectedOutput: "终端中显示 Python 版本号。",
      verificationMethod: "run_command"
    }),
    buildTaskDefinition({
      orderIndex: 2,
      title: "运行 hello world",
      instructions: "创建 `hello.py`，打印 `Hello, AI workflows!`，并在终端运行它。",
      estimatedMinutes: 10,
      type: "coding",
      expectedOutput: "终端成功输出 Hello, AI workflows!",
      verificationMethod: "run_command"
    }),
    buildTaskDefinition({
      orderIndex: 3,
      title: "做一个假 AI CLI",
      instructions: `创建一个脚本读取用户输入，并返回固定回复，主题围绕「${goalText.trim()}」展开。`,
      estimatedMinutes: 15,
      type: "coding",
      expectedOutput: "脚本接收一段输入后，输出一段稳定的固定回答。",
      verificationMethod: "compare_output"
    })
  ];
}

export function generateFirstLessonPayload({ currentLevel, goalText, paceMode = "default" }: FirstLessonInput): LessonPayload {
  const tasks = buildLessonTasks({ currentLevel, goalText, paceMode });
  const estimatedTotalMinutes = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

  return LessonSchema.parse({
    lessonId: "day-1-python-ai-workflows",
    title: "Day 1: 跑通你的第一个 Python for AI 工作流练习",
    whyThisNow: "先把环境和最小脚本闭环跑通，后面的自动化与 AI 练习才不会卡在基础问题上。",
    whyItMatters: "先把环境和最小可运行脚本跑通，后面的 AI 工作流练习才不会卡在基础问题上。",
    estimatedTotalMinutes,
    completionContract: {
      summary: "你能在本地成功运行 hello world 和一个假 AI 命令行脚本。",
      passCriteria: ["hello.py 可以独立运行", "fake_ai.py 能读取输入并输出固定回复"],
      failCriteria: ["Python 环境仍无法运行", "脚本无法读取输入或没有稳定输出"]
    },
    completionCriteria: "你能在本地成功运行 hello world 和一个假 AI 命令行脚本。",
    materialsNeeded: ["Python 3", "终端", "一个新的练习目录"],
    tasks,
    ifBlocked: [
      {
        trigger: "找不到 python3 命令或运行脚本报环境错误",
        response: "先只完成 `python3 --version` 和一个最小 hello.py，再继续后续任务。"
      }
    ],
    reflectionPrompt: "今天卡住你最多的是环境、命令行，还是代码本身？",
    nextDefaultAction: {
      label: "进入下一节并继续保留终端练习",
      rationale: "只要今天的最小闭环跑通，就应该保持同样的执行环境继续推进。"
    },
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
