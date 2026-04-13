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

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
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

function normalizeLessonType(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "-");
  return LESSON_TYPE_ALIASES[normalized] ?? null;
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
      '- Allowed task.type values are only: "setup", "observation", "reading", "practice", "production", "coding", "verification", "reflection".',
      '- Allowed verificationMethod values are only: "run_command", "self_check", "compare_output", "answer_quiz", "manual_review".',
      '- Allowed skipPolicy values are only: "never_skip", "skip_if_already_done", "skip_with_note".',
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
      const normalized = schemaName.endsWith("_plan") ? normalizePlanPayload(parsed) : parsed;

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
