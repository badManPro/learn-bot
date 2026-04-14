import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { StructuredTextModel } from "@learn-bot/ai-orchestrator";

import { buildCodexCliEnv, resolveCodexCliCommand } from "../codex-cli";

const execFileAsync = promisify(execFile);

type JsonRecord = Record<string, unknown>;

const LESSON_TYPE_ALIASES: Record<string, "setup" | "practice" | "project" | "review" | "reflection"> = {
  setup: "setup",
  onboarding: "setup",
  bootstrap: "setup",
  install: "setup",
  practice: "practice",
  drill: "practice",
  exercise: "practice",
  project: "project",
  build: "project",
  implementation: "project",
  review: "review",
  recap: "review",
  reflection: "reflection",
  reflect: "reflection"
};

const TASK_TYPE_ALIASES: Record<
  string,
  "setup" | "observation" | "reading" | "practice" | "production" | "coding" | "verification" | "reflection"
> = {
  setup: "setup",
  onboarding: "setup",
  bootstrap: "setup",
  install: "setup",
  observation: "observation",
  observe: "observation",
  listening: "observation",
  reading: "reading",
  read: "reading",
  practice: "practice",
  drill: "practice",
  exercise: "practice",
  rehearsal: "practice",
  production: "production",
  perform: "production",
  output: "production",
  coding: "coding",
  code: "coding",
  implementation: "coding",
  build: "coding",
  verification: "verification",
  verify: "verification",
  check: "verification",
  test: "verification",
  reflection: "reflection",
  reflect: "reflection",
  review: "reflection"
};

const VERIFICATION_METHOD_ALIASES: Record<
  string,
  "run_command" | "self_check" | "compare_output" | "answer_quiz" | "manual_review"
> = {
  run_command: "run_command",
  "run-command": "run_command",
  run: "run_command",
  execute: "run_command",
  self_check: "self_check",
  "self-check": "self_check",
  selfcheck: "self_check",
  listen: "self_check",
  compare_output: "compare_output",
  "compare-output": "compare_output",
  compare: "compare_output",
  diff: "compare_output",
  answer_quiz: "answer_quiz",
  "answer-quiz": "answer_quiz",
  quiz: "answer_quiz",
  manual_review: "manual_review",
  "manual-review": "manual_review",
  manual: "manual_review",
  review: "manual_review"
};

const SKIP_POLICY_ALIASES: Record<string, "never_skip" | "skip_if_already_done" | "skip_with_note"> = {
  never_skip: "never_skip",
  "never-skip": "never_skip",
  never: "never_skip",
  skip_if_already_done: "skip_if_already_done",
  "skip-if-already-done": "skip_if_already_done",
  already_done: "skip_if_already_done",
  "already-done": "skip_if_already_done",
  skip_with_note: "skip_with_note",
  "skip-with-note": "skip_with_note",
  optional: "skip_with_note"
};

const QUIZ_KIND_ALIASES: Record<string, "single_choice" | "true_false"> = {
  single_choice: "single_choice",
  "single-choice": "single_choice",
  multiple_choice: "single_choice",
  "multiple-choice": "single_choice",
  mcq: "single_choice",
  choice: "single_choice",
  true_false: "true_false",
  "true-false": "true_false",
  boolean: "true_false",
  tf: "true_false"
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function firstPositiveInt(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value.trim(), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

function flattenText(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return [String(value)];
  }

  if (typeof value === "boolean") {
    return [value ? "true" : "false"];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenText(item));
  }

  if (isRecord(value)) {
    return [
      value.text,
      value.content,
      value.label,
      value.title,
      value.description,
      value.summary,
      value.value,
      value.name
    ].flatMap((item) => flattenText(item));
  }

  return [];
}

function textValue(value: unknown, joiner = "\n") {
  const parts = flattenText(value);
  return parts.length > 0 ? parts.join(joiner) : null;
}

function firstText(values: unknown[], joiner = "\n") {
  for (const value of values) {
    const normalized = textValue(value, joiner);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function splitTextList(value: unknown) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitTextList(item));
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = value
      .replace(/\r\n/g, "\n")
      .split(/\n+|;\s*|•\s*|·\s*|▪\s*|◦\s*/u)
      .map((item) => item.trim())
      .filter(Boolean);

    return normalized.length > 0 ? normalized : [value.trim()];
  }

  if (isRecord(value)) {
    const text = firstText([value.items, value.points, value.options, value.text, value.content, value.summary], "\n");
    return text ? splitTextList(text) : [];
  }

  return [];
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => flattenText(item))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [] as string[];
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = firstPositiveInt(value);
  if (!parsed) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeLessonType(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "-");
  return LESSON_TYPE_ALIASES[normalized] ?? null;
}

function normalizeTaskType(value: unknown, title: string, instructions: string, index: number) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "_");
    if (TASK_TYPE_ALIASES[normalized]) {
      return TASK_TYPE_ALIASES[normalized];
    }
  }

  const hint = `${title} ${instructions}`.toLowerCase();
  if (/read|article|doc|watch notes|sheet/i.test(hint)) {
    return "reading";
  }
  if (/observe|listen|watch|notice/i.test(hint)) {
    return "observation";
  }
  if (/reflect|journal|retro|recap/i.test(hint)) {
    return "reflection";
  }
  if (/verify|check|test|quiz|compare/i.test(hint)) {
    return "verification";
  }
  if (/code|script|implement|build|write/i.test(hint)) {
    return "coding";
  }
  if (/perform|record|ship|publish/i.test(hint)) {
    return "production";
  }

  return index === 0 ? "setup" : "practice";
}

function normalizeVerificationMethod(value: unknown, taskType: string, title: string, instructions: string) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "_");
    if (VERIFICATION_METHOD_ALIASES[normalized]) {
      return VERIFICATION_METHOD_ALIASES[normalized];
    }
  }

  const hint = `${title} ${instructions}`.toLowerCase();
  if (/quiz/i.test(hint)) {
    return "answer_quiz";
  }
  if (/compare|match|expected/i.test(hint)) {
    return "compare_output";
  }
  if (/run|execute|terminal|command/i.test(hint) || taskType === "coding") {
    return "run_command";
  }
  if (/listen|hear|count|check yourself|self-check/i.test(hint)) {
    return "self_check";
  }

  return taskType === "verification" ? "manual_review" : "self_check";
}

function normalizeSkipPolicy(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "_");
    if (SKIP_POLICY_ALIASES[normalized]) {
      return SKIP_POLICY_ALIASES[normalized];
    }
  }

  return "never_skip";
}

function normalizeQuizKind(value: unknown, options: string[]) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "_");
    if (QUIZ_KIND_ALIASES[normalized]) {
      return QUIZ_KIND_ALIASES[normalized];
    }
  }

  if (
    options.length === 2 &&
    options.every((option) => /^(true|false|yes|no|是|否)$/iu.test(option.trim()))
  ) {
    return "true_false";
  }

  return "single_choice";
}

function inferLessonTypes(source: JsonRecord, index: number) {
  const fromArray = Array.isArray(source.lessonTypes)
    ? source.lessonTypes.map((item) => normalizeLessonType(item)).filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];
  const fromSingle = [source.lessonType, source.type, source.format, source.recommendedLessonType]
    .map((item) => normalizeLessonType(item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const combined = [...new Set([...fromArray, ...fromSingle])];
  if (combined.length > 0) {
    return combined;
  }

  const hint = `${firstString(source.title, source.purpose, source.outcome, source.description, source.focus) ?? ""}`.toLowerCase();
  if (/setup|install|environment|bootstrap|tooling/.test(hint)) {
    return ["setup"];
  }

  if (/project|build|workflow|automation|cli|tool/.test(hint)) {
    return ["project"];
  }

  if (/review|recap|reflection/.test(hint)) {
    return ["review"];
  }

  return [index === 0 ? "setup" : "practice"];
}

function normalizeMilestoneStatus(value: unknown, index: number) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "planned") {
      return "pending";
    }
    if (normalized === "pending" || normalized === "active" || normalized === "completed") {
      return normalized;
    }
    if (normalized === "current" || normalized === "in_progress" || normalized === "in-progress") {
      return "active";
    }
    if (normalized === "done" || normalized === "complete") {
      return "completed";
    }
  }

  return index === 0 ? "active" : "pending";
}

function normalizeMilestone(value: unknown, index: number) {
  const source = isRecord(value) ? value : {};
  const title = firstString(source.title, source.name, source.label, source.milestone) ?? `Milestone ${index + 1}`;
  const purpose =
    firstString(source.purpose, source.focus, source.description, source.why, source.objective, source.goal) ?? title;
  const outcome =
    firstString(source.outcome, source.deliverable, source.result, source.target, source.successOutcome, source.summary) ?? purpose;

  return {
    id: firstString(source.id, source.slug, source.key) ?? `milestone-${index + 1}`,
    index: firstPositiveInt(source.index, source.order, source.position) ?? index + 1,
    title,
    purpose,
    outcome,
    prerequisites: asStringArray(source.prerequisites),
    successCriteria:
      asStringArray(source.successCriteria).length > 0 ? asStringArray(source.successCriteria) : [`Complete ${title}.`],
    recommendedWeeks: firstPositiveInt(source.recommendedWeeks, source.weeks, source.durationWeeks, source.estimatedWeeks) ?? 1,
    lessonTypes: inferLessonTypes(source, index),
    status: normalizeMilestoneStatus(source.status, index)
  };
}

function normalizePlanPayload(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  const milestoneSource =
    (Array.isArray(value.milestones) && value.milestones) ||
    (Array.isArray(value.phases) && value.phases) ||
    (Array.isArray(value.steps) && value.steps) ||
    [];
  const milestones = milestoneSource.map((item, index) => normalizeMilestone(item, index));
  const activeMilestone = milestones.find((item) => item.status === "active") ?? milestones[0];
  const todayLessonSeedSource = isRecord(value.todayLessonSeed)
    ? value.todayLessonSeed
    : isRecord(value.firstLessonSeed)
      ? value.firstLessonSeed
      : isRecord(value.nextLesson)
        ? value.nextLesson
        : {};

  return {
    ...value,
    planTitle: firstString(value.planTitle, value.title, value.roadmapTitle, value.name) ?? "Learning Roadmap",
    domainId: firstString(value.domainId, value.domain, value.domainName) ?? "generic",
    tags: asStringArray(value.tags).length > 0 ? asStringArray(value.tags) : ["generated"],
    goalSummary: firstString(value.goalSummary, value.summary, value.goal, value.goalText, value.objective) ?? "Advance toward the learner's stated goal.",
    totalEstimatedWeeks:
      firstPositiveInt(
        value.totalEstimatedWeeks,
        value.totalWeeks,
        value.estimatedWeeks,
        value.durationWeeks
      ) ??
      (milestones.reduce((sum, item) => sum + item.recommendedWeeks, 0) || 1),
    milestones,
    currentStrategy:
      firstString(value.currentStrategy, value.strategy, value.approach, value.guidance) ?? "Keep the path concrete and momentum-first.",
    todayLessonSeed: {
      milestoneId:
        firstString(todayLessonSeedSource.milestoneId, todayLessonSeedSource.milestone, activeMilestone?.id) ??
        "milestone-1",
      lessonType:
        normalizeLessonType(todayLessonSeedSource.lessonType) ??
        normalizeLessonType(todayLessonSeedSource.type) ??
        activeMilestone?.lessonTypes[0] ??
        "practice",
      objective:
        firstString(todayLessonSeedSource.objective, todayLessonSeedSource.title, todayLessonSeedSource.focus, activeMilestone?.title) ??
        "Complete the first milestone task."
    },
    warnings: asStringArray(value.warnings)
  };
}

function normalizeCompletionContract(value: unknown, completionCriteria: string[]) {
  if (isRecord(value)) {
    const summary =
      firstText([value.summary, value.contract, value.description, value.content, value.text]) ??
      completionCriteria[0] ??
      "Complete the lesson's core task and verify the result.";
    const passCriteria =
      splitTextList(value.passCriteria).length > 0
        ? splitTextList(value.passCriteria)
        : splitTextList(value.doneWhen).length > 0
          ? splitTextList(value.doneWhen)
          : completionCriteria.length > 0
            ? completionCriteria
            : [summary];
    const failCriteria =
      splitTextList(value.failCriteria).length > 0
        ? splitTextList(value.failCriteria)
        : ["The learner cannot complete the core task or verify the expected result."];

    return {
      summary,
      passCriteria,
      failCriteria
    };
  }

  const summary =
    textValue(value, "\n") ?? completionCriteria[0] ?? "Complete the lesson's core task and verify the result.";

  return {
    summary,
    passCriteria: completionCriteria.length > 0 ? completionCriteria : [summary],
    failCriteria: ["The learner cannot complete the core task or verify the expected result."]
  };
}

function normalizeTask(value: unknown, index: number) {
  const source = isRecord(value) ? value : {};
  const rawTitle = firstText([source.title, source.name, source.label, source.task, value], " ");
  const instructions =
    firstText([source.instructions, source.instruction, source.steps, source.action, source.prompt, source.details, value]) ??
    "Complete the task and verify the result before moving on.";
  const title = rawTitle ?? `Task ${index + 1}`;
  const taskType = normalizeTaskType(source.type, title, instructions, index);
  const expectedOutput =
    firstText([source.expectedOutput, source.output, source.deliverable, source.result, source.checkpoint], " ") ??
    `Evidence that ${title.toLowerCase()} is complete.`;

  return {
    id: firstText([source.id, source.key, source.slug], " ") ?? `task-${index + 1}`,
    title,
    type: taskType,
    instructions,
    expectedOutput,
    estimatedMinutes: clampInt(
      firstPositiveInt(source.estimatedMinutes, source.minutes, source.durationMinutes, source.timeboxMinutes) ?? source.timebox,
      10,
      5,
      30
    ),
    verificationMethod: normalizeVerificationMethod(source.verificationMethod, taskType, title, instructions),
    skipPolicy: normalizeSkipPolicy(source.skipPolicy)
  };
}

function normalizeBlockedAction(value: unknown, index: number) {
  const source = isRecord(value) ? value : {};
  const response =
    firstText([source.response, source.fix, source.action, source.nextStep, source.recovery, value], " ") ??
    "Reduce scope, verify one smaller step, then continue.";
  const trigger =
    firstText([source.trigger, source.when, source.blocker, source.problem, source.issue], " ") ?? `遇到阻碍 ${index + 1}`;

  return {
    trigger,
    response
  };
}

function normalizeNextDefaultAction(value: unknown) {
  const source = isRecord(value) ? value : {};
  const label = firstText([source.label, source.title, source.action, value], " ") ?? "继续完成下一步最小动作";

  return {
    label,
    rationale:
      firstText([source.rationale, source.reason, source.why, source.description], " ") ??
      "这是完成本课后最自然的下一步。"
  };
}

function normalizeQuiz(value: unknown, title: string) {
  const source = isRecord(value) ? value : {};
  const rawOptions = splitTextList(source.options);
  const preliminaryKind = normalizeQuizKind(source.kind, rawOptions);
  const options =
    rawOptions.length >= 2
      ? rawOptions
      : preliminaryKind === "true_false"
        ? ["True", "False"]
        : ["完成了核心任务并验证结果", "还需要补做一个关键验证步骤"];
  const kind = normalizeQuizKind(source.kind, options);
  const correctAnswer =
    firstText([source.correctAnswer, source.answer, source.correct], " ") ??
    (kind === "true_false" ? options[0] : options[0]);

  return {
    kind,
    question:
      firstText([source.question, source.prompt, source.check, source.quiz], " ") ??
      `哪个选项最能说明你完成了「${title}」？`,
    options,
    correctAnswer: options.includes(correctAnswer) ? correctAnswer : options[0]
  };
}

export function normalizeLessonPayload(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  const taskSource =
    (Array.isArray(value.tasks) && value.tasks) ||
    (Array.isArray(value.steps) && value.steps) ||
    (Array.isArray(value.activities) && value.activities) ||
    [];
  const tasks = taskSource.map((item, index) => normalizeTask(item, index)).slice(0, 6);
  const paddedTasks =
    tasks.length >= 2
      ? tasks
      : [
          ...tasks,
          ...Array.from({ length: Math.max(0, 2 - tasks.length) }, (_item, index) =>
            normalizeTask(
              {
                title: index === 0 ? "完成一个最小起步动作" : "做一次结果验证",
                type: index === 0 ? "setup" : "verification",
                instructions:
                  index === 0
                    ? "按最小可执行范围完成一次起步动作。"
                    : "检查前一步输出是否符合预期，并记录一个发现。",
                expectedOutput:
                  index === 0 ? "得到一个可继续推进的最小结果。" : "确认结果是否符合预期，并留下一条验证结论。",
                estimatedMinutes: index === 0 ? 10 : 10,
                verificationMethod: index === 0 ? "self_check" : "manual_review",
                skipPolicy: "never_skip"
              },
              tasks.length + index
            )
          )
        ];
  const completionCriteriaList = splitTextList(value.completionCriteria);
  const completionContract = normalizeCompletionContract(value.completionContract, completionCriteriaList);
  const ifBlockedSource =
    (Array.isArray(value.ifBlocked) && value.ifBlocked) ||
    (Array.isArray(value.blockedActions) && value.blockedActions) ||
    (Array.isArray(value.recoveryActions) && value.recoveryActions) ||
    [];
  const ifBlocked =
    ifBlockedSource.length > 0
      ? ifBlockedSource.map((item, index) => normalizeBlockedAction(item, index))
      : [normalizeBlockedAction("把范围缩小到一个能立刻验证的小步骤。", 0)];
  const title = firstText([value.title, value.name, value.lessonTitle], " ") ?? "Today's Lesson";

  return {
    ...value,
    lessonId: firstText([value.lessonId, value.id, value.slug], " ") ?? "lesson-draft",
    title,
    whyThisNow:
      firstText([value.whyThisNow, value.why_now, value.reasonNow, value.summary], " ") ??
      "这是当前里程碑下最小且可执行的一步。",
    whyItMatters:
      firstText([value.whyItMatters, value.why_matters, value.reasonWhy, value.value], " ") ??
      "完成这一课会直接推动当前里程碑。",
    estimatedTotalMinutes: Math.min(
      120,
      Math.max(
        10,
        firstPositiveInt(value.estimatedTotalMinutes, value.totalMinutes, value.durationMinutes) ??
          paddedTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)
      )
    ),
    completionContract,
    completionCriteria:
      firstText([value.completionCriteria], "；") ??
      completionContract.passCriteria.join("；") ??
      "完成核心任务并验证结果。",
    materialsNeeded:
      asStringArray(value.materialsNeeded).length > 0 ? asStringArray(value.materialsNeeded) : asStringArray(value.materials),
    tasks: paddedTasks,
    ifBlocked,
    reflectionPrompt:
      firstText([value.reflectionPrompt, value.reflection, value.reviewPrompt], " ") ??
      "这节课结束时，哪一步比开始时更容易了？",
    nextDefaultAction: normalizeNextDefaultAction(value.nextDefaultAction),
    quiz: normalizeQuiz(value.quiz, title)
  };
}

function buildContractInstructions(schemaName: string) {
  if (schemaName.endsWith("_plan")) {
    return [
      "Output contract:",
      '- Return one JSON object with exactly these top-level keys: "planTitle", "domainId", "tags", "goalSummary", "totalEstimatedWeeks", "milestones", "currentStrategy", "todayLessonSeed", "warnings".',
      '- "milestones" must be an array of objects with keys: "id", "index", "title", "purpose", "outcome", "prerequisites", "successCriteria", "recommendedWeeks", "lessonTypes", "status".',
      '- Allowed "status" values are only: "pending", "active", "completed". Never use "planned".',
      '- Allowed lesson type values are only: "setup", "practice", "project", "review", "reflection".',
      '- "todayLessonSeed" must contain exactly: "milestoneId", "lessonType", "objective".',
      '- Do not omit required keys. Do not rename keys.'
    ].join("\n");
  }

  if (schemaName.endsWith("_lesson")) {
    return [
      "Output contract:",
      '- Return one JSON object with exactly these top-level keys: "lessonId", "title", "whyThisNow", "whyItMatters", "estimatedTotalMinutes", "completionContract", "completionCriteria", "materialsNeeded", "tasks", "ifBlocked", "reflectionPrompt", "nextDefaultAction", "quiz".',
      '- "completionContract" must be an object with exactly: "summary", "passCriteria", "failCriteria".',
      '- Each task in "tasks" must be an object with exactly: "id", "title", "type", "instructions", "expectedOutput", "estimatedMinutes", "verificationMethod", "skipPolicy".',
      '- Each item in "ifBlocked" must be an object with exactly: "trigger", "response".',
      '- "nextDefaultAction" must be an object with exactly: "label", "rationale".',
      '- "quiz" must be an object with exactly: "kind", "question", "options", "correctAnswer".',
      '- Allowed task.type values are only: "setup", "observation", "reading", "practice", "production", "coding", "verification", "reflection".',
      '- Allowed verificationMethod values are only: "run_command", "self_check", "compare_output", "answer_quiz", "manual_review".',
      '- Allowed skipPolicy values are only: "never_skip", "skip_if_already_done", "skip_with_note".',
      '- Allowed quiz.kind values are only: "single_choice", "true_false".',
      '- Do not omit required keys. Do not rename keys.'
    ].join("\n");
  }

  if (schemaName.endsWith("_replan")) {
    return [
      "Output contract:",
      '- Return one JSON object with exactly these top-level keys: "replanReason", "diagnosis", "paceChange", "milestoneAdjustment", "replacementLesson", "replacementLessonSeed", "replacementLessonTitle", "userMessage".',
      '- Allowed replanReason values are only: "too_hard", "pace_too_fast", "wrong_goal", "inactive".',
      '- "replacementLesson" must contain exactly: "title", "focus", "firstStep", "reason".',
      '- "replacementLessonSeed" must contain exactly: "milestoneId", "lessonType", "objective".',
      '- Allowed lessonType values are only: "setup", "practice", "project", "review", "reflection".',
      '- Do not omit required keys. Do not rename keys.'
    ].join("\n");
  }

  return "";
}

function buildCodexPrompt(schemaName: string, systemPrompt: string, userPrompt: string) {
  const contractInstructions = buildContractInstructions(schemaName);

  return [
    "You are generating machine-readable JSON for a desktop learning product.",
    "Return valid JSON only. Do not wrap the answer in markdown fences. Do not add commentary before or after the JSON.",
    "Follow the system instructions exactly.",
    "Do not use tools, inspect the repository, run shell commands, or read files.",
    "Answer using only the instructions provided in this prompt.",
    contractInstructions,
    "<system>",
    systemPrompt,
    "</system>",
    "<user>",
    userPrompt,
    "</user>"
  ].join("\n\n");
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1]?.trim();
  const candidate = fenced ?? trimmed;

  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = Math.min(
      ...["{", "["]
        .map((token) => candidate.indexOf(token))
        .filter((index) => index >= 0)
    );
    const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));

    if (!Number.isFinite(start) || start < 0 || end <= start) {
      throw new Error("Codex CLI 返回了无法解析的 JSON 内容。");
    }

    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

function describeCodexFailure(message: string) {
  if (/codex login|login required|not logged in|sign in/i.test(message)) {
    return "未检测到可复用的 `codex login` 登录态，请先完成 Codex 浏览器登录。";
  }

  if (/spawn .*codex.*ENOENT|spawn ENOENT|codex.*not found/i.test(message)) {
    return "当前机器未安装 Codex CLI，暂无法使用 Codex 登录型桌面运行时。";
  }

  if (/network error|stream disconnected|error sending request|timed out/i.test(message)) {
    return "Codex 登录已找到，但当前无法连接到 Codex 服务，请检查网络后重试。";
  }

  return message.trim() || "Codex CLI 调用失败。";
}

async function invokeWithCodexCli(args: { model: string; prompt: string }) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "learn-bot-codex-"));
  const outputPath = path.join(tempDir, "output.txt");

  try {
    const command = await resolveCodexCliCommand();
    const env = await buildCodexCliEnv();
    const cliArgs = [
      "exec",
      "--skip-git-repo-check",
      "--color",
      "never",
      "--sandbox",
      "read-only",
      "-c",
      'model_provider="openai"',
      "-o",
      outputPath
    ];

    if (args.model.trim()) {
      cliArgs.push("-m", args.model.trim());
    }

    cliArgs.push(args.prompt);

    const result = await execFileAsync(command.executable, [...command.argsPrefix, ...cliArgs], {
      env,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024
    });

    let output = "";
    try {
      output = (await readFile(outputPath, "utf8")).trim();
    } catch (error) {
      const stdoutFallback = result.stdout?.trim() ?? "";
      if (stdoutFallback) {
        output = stdoutFallback;
      } else if (error instanceof Error) {
        const details = [error.message, result.stderr?.trim(), result.stdout?.trim()].filter(Boolean).join("\n");
        throw new Error(`Codex CLI 未生成输出文件。\n${details}`);
      } else {
        throw error;
      }
    }

    if (!output) {
      const details = [result.stderr?.trim(), result.stdout?.trim()].filter(Boolean).join("\n");
      throw new Error(details ? `Codex CLI 返回了空响应。\n${details}` : "Codex CLI 返回了空响应。");
    }

    return output;
  } catch (error) {
    const parts: string[] = [];
    const command = await resolveCodexCliCommand().catch(() => null);

    if (error instanceof Error) {
      parts.push(error.message);
      const withStreams = error as Error & { stdout?: string; stderr?: string };
      if (withStreams.stderr?.trim()) {
        parts.push(withStreams.stderr.trim());
      }
      if (withStreams.stdout?.trim()) {
        parts.push(withStreams.stdout.trim());
      }
    }

    console.error("[desktop-codex] invoke failed", {
      command: command?.displayPath ?? "unresolved",
      details: parts.join("\n")
    });

    throw new Error(describeCodexFailure(parts.join("\n")));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export function createCodexCliStructuredModel() {
  return {
    async parse<Output>({
      model,
      schema,
      schemaName,
      systemPrompt,
      userPrompt
    }: {
      model: string;
      schema: { parse: (input: unknown) => Output };
      schemaName: string;
      systemPrompt: string;
      userPrompt: string;
    }) {
      const output = await invokeWithCodexCli({
        model,
        prompt: buildCodexPrompt(schemaName, systemPrompt, userPrompt)
      });

      const parsed = extractJsonPayload(output);
      const normalized = schemaName.endsWith("_plan")
        ? normalizePlanPayload(parsed)
        : schemaName.endsWith("_lesson")
          ? normalizeLessonPayload(parsed)
          : parsed;

      try {
        return schema.parse(normalized);
      } catch (error) {
        console.error("[desktop-codex] schema parse failed", {
          schemaName,
          payload: JSON.stringify(normalized, null, 2).slice(0, 4000)
        });
        throw error;
      }
    }
  } satisfies StructuredTextModel;
}
