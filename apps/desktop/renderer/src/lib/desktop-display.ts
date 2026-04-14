import type { LessonType } from "@learn-bot/ai-contracts";
import type { PlanGenerationRequest } from "@learn-bot/ai-orchestrator";

import type { DesktopSessionStatus } from "../../../shared/contracts";

export const DEFAULT_PLAN_REQUEST: PlanGenerationRequest = {
  goalText: "我想学 Python 做 AI 自动化工作流",
  currentLevel: "zero",
  weeklyTimeBudgetMinutes: 240,
  targetDeadline: "2026-06-30",
  mbti: null
};

export const PLAN_GENERATION_STEPS = [
  {
    title: "校验目标与节奏",
    description: "整理目标、当前基础、每周预算和截止日期。"
  },
  {
    title: "拆成可执行里程碑",
    description: "把大目标收敛成几个能持续推进的阶段。"
  },
  {
    title: "落到第一课入口",
    description: "给出 active milestone 和今天的 lesson seed。"
  }
] as const;

export const LESSON_GENERATION_STEPS = [
  {
    title: "读取当前路线图上下文",
    description: "锁定 active milestone、lesson type 和已有历史。"
  },
  {
    title: "编排任务链路",
    description: "把课程切成任务、验证方式和完成标准。"
  },
  {
    title: "补齐卡住时的恢复动作",
    description: "输出 if blocked、quiz checkpoint 和下一步动作。"
  }
] as const;

export type AppTab = "today" | "roadmap" | "settings";
export type ActiveGenerationKind = "lesson" | "plan";

export const TAB_META: Record<
  AppTab,
  {
    description: string;
    eyebrow: string;
    statusLabel: string;
    title: string;
  }
> = {
  today: {
    eyebrow: "Today",
    title: "把今天这一课走成一个完整闭环",
    description: "这里聚焦当前课程、任务链路，以及当你卡住时的恢复动作。",
    statusLabel: "今日视图"
  },
  roadmap: {
    eyebrow: "Roadmap",
    title: "先看整体路线，再决定今天做什么",
    description: "把目标拆成稳定的推进段落，明确今天的入口与接下来几周的重心。",
    statusLabel: "整体路线"
  },
  settings: {
    eyebrow: "Settings",
    title: "管理登录状态与生成基线",
    description: "查看 Codex 会话、默认生成参数，以及本地快照是否正常保存。",
    statusLabel: "设置页"
  }
};

export function formatDomainLabel(domainId: string) {
  const labels: Record<string, string> = {
    drawing: "Drawing",
    piano: "Piano",
    python: "Python"
  };

  return labels[domainId] ?? domainId.slice(0, 1).toUpperCase() + domainId.slice(1);
}

export function formatLessonTypeLabel(lessonType: LessonType) {
  const labels: Record<LessonType, string> = {
    setup: "准备",
    practice: "练习",
    project: "项目",
    review: "复盘",
    reflection: "反思"
  };

  return labels[lessonType];
}

export function formatCurrentLevelLabel(level: string) {
  const labels: Record<string, string> = {
    zero: "零基础",
    beginner: "初学",
    intermediate: "有基础",
    advanced: "进阶"
  };

  return labels[level] ?? level;
}

export function formatReasonLabel(reason: "inactive" | "pace_too_fast" | "too_hard") {
  const labels = {
    inactive: "中断太久",
    pace_too_fast: "节奏太快",
    too_hard: "太难了"
  };

  return labels[reason];
}

export function formatSessionStatus(status: DesktopSessionStatus | "loading") {
  switch (status) {
    case "authenticated":
      return "已连接";
    case "pending":
      return "等待浏览器完成";
    case "anonymous":
      return "未登录";
    default:
      return "读取中";
  }
}

export function formatTargetDeadline(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(date);
}

export function supportsInteractiveDomain(domainId: string) {
  return domainId === "python" || domainId === "piano";
}

export function normalizeRuntimeError(message: string) {
  const compactMessage = message.replace(/^Error invoking remote method '[^']+': Error:\s*/u, "");

  if (compactMessage.includes("当前没有可用的 OpenAI 桌面会话")) {
    return compactMessage;
  }

  if (compactMessage.includes("当前未检测到可复用的 `codex login` 登录态")) {
    return compactMessage;
  }

  if (compactMessage.includes("未检测到可复用的 `codex login` 登录态")) {
    return compactMessage;
  }

  if (compactMessage.includes("OPENAI_API_KEY is not set")) {
    return "当前未检测到可复用的 `codex login` 登录态，也未设置 OPENAI_API_KEY。请先完成 Codex 浏览器登录，或在开发环境中配置 API key。";
  }

  return compactMessage;
}

export function statusTone(status: DesktopSessionStatus | "loading") {
  switch (status) {
    case "authenticated":
      return "status-pill status-pill--authenticated";
    case "pending":
      return "status-pill status-pill--pending";
    case "anonymous":
      return "status-pill status-pill--anonymous";
    default:
      return "status-pill status-pill--loading";
  }
}
