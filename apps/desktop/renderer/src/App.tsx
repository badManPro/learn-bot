import { useEffect, useState } from "react";

import type { LessonContract, PlanContract, ReplanContract, ReplanReason, TodayLessonSeed } from "@learn-bot/ai-contracts";
import type { LessonGenerationRequest, PlanGenerationRequest, ReplanGenerationRequest } from "@learn-bot/ai-orchestrator";

import type { DesktopLearningState, DesktopSession } from "../../shared/contracts";
import { createEmptyDesktopLearningState } from "../../shared/contracts";
import { AppSidebar } from "./components/app-sidebar";
import { GenerationOverlay } from "./generation-overlay";
import {
  DEFAULT_PLAN_REQUEST,
  LESSON_GENERATION_STEPS,
  PLAN_GENERATION_STEPS,
  TAB_META,
  formatDomainLabel,
  normalizeRuntimeError,
  statusTone,
  supportsInteractiveDomain,
  type ActiveGenerationKind,
  type AppTab
} from "./lib/desktop-display";
import { RoadmapView } from "./views/roadmap-view";
import { SettingsView } from "./views/settings-view";
import { TodayView } from "./views/today-view";

function buildGenerationOverlayCards(
  activeGenerationKind: ActiveGenerationKind | null,
  activeMilestoneTitle: string | null,
  lessonTitle: string | null
) {
  if (activeGenerationKind === "lesson") {
    return [
      {
        eyebrow: "Lesson Frame",
        title: lessonTitle ?? activeMilestoneTitle ?? "今日课程骨架",
        bullets: ["生成 why this now", "串起任务节奏和完成标准"]
      },
      {
        eyebrow: "Tasks",
        title: "任务拆解中",
        bullets: ["安排 2-6 个任务块", "附带验证方式与预计时长"]
      },
      {
        eyebrow: "Recovery",
        title: "恢复路径注入",
        bullets: ["补全 if blocked", "生成 quiz 与下一步动作"]
      }
    ];
  }

  return [
    {
      eyebrow: "Milestone 1",
      title: "起步定位",
      bullets: ["锁定起点与依赖", "确保第一周能快速进入状态"]
    },
    {
      eyebrow: "Milestone 2",
      title: "核心突破",
      bullets: ["围绕目标堆叠关键技能", "保持每周推进节奏"]
    },
    {
      eyebrow: "Milestone 3",
      title: "实战收口",
      bullets: ["落成完整闭环", "衔接到今天第一课"]
    }
  ];
}

export default function App() {
  const hasDesktopApi = typeof window !== "undefined" && typeof window.desktopApi !== "undefined";
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [planRequest, setPlanRequest] = useState<PlanGenerationRequest>(DEFAULT_PLAN_REQUEST);
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanContract | null>(null);
  const [lessonPreview, setLessonPreview] = useState<LessonContract | null>(null);
  const [lessonHistory, setLessonHistory] = useState<LessonContract[]>([]);
  const [replanPreview, setReplanPreview] = useState<ReplanContract | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [replanError, setReplanError] = useState<string | null>(null);
  const [isOpeningLogin, setIsOpeningLogin] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [isGeneratingReplan, setIsGeneratingReplan] = useState(false);
  const [activeGenerationKind, setActiveGenerationKind] = useState<ActiveGenerationKind | null>(null);
  const [activeGenerationStep, setActiveGenerationStep] = useState(0);
  const [hasHydratedLearningState, setHasHydratedLearningState] = useState(false);

  function applyLearningState(nextState: DesktopLearningState) {
    setPlanPreview(nextState.plan);
    setLessonPreview(nextState.lesson);
    setLessonHistory(nextState.lessonHistory);
    setReplanPreview(nextState.replan);
  }

  useEffect(() => {
    if (!hasDesktopApi) {
      setBridgeError("desktopApi preload bridge is unavailable. Check the Electron preload path and DevTools console.");
      return;
    }

    let disposed = false;

    void Promise.allSettled([window.desktopApi.auth.session.get(), window.desktopApi.state.load()]).then(([sessionResult, stateResult]) => {
      if (disposed) {
        return;
      }

      if (sessionResult.status === "fulfilled") {
        setSession(sessionResult.value);
      } else {
        const message = sessionResult.reason instanceof Error ? sessionResult.reason.message : "Failed to read desktop session.";
        setBridgeError(normalizeRuntimeError(message));
      }

      if (stateResult.status === "fulfilled") {
        applyLearningState(stateResult.value);
        setStateError(null);
      } else {
        const message = stateResult.reason instanceof Error ? stateResult.reason.message : "Failed to restore saved desktop data.";
        applyLearningState(createEmptyDesktopLearningState());
        setStateError(normalizeRuntimeError(message));
      }

      setHasHydratedLearningState(true);
    });

    return () => {
      disposed = true;
    };
  }, [hasDesktopApi]);

  useEffect(() => {
    if (!activeGenerationKind) {
      return undefined;
    }

    const steps = activeGenerationKind === "plan" ? PLAN_GENERATION_STEPS : LESSON_GENERATION_STEPS;
    const timer = window.setInterval(() => {
      setActiveGenerationStep((current) => (current < steps.length - 1 ? current + 1 : current));
    }, 1100);

    return () => window.clearInterval(timer);
  }, [activeGenerationKind]);

  useEffect(() => {
    if (!hasDesktopApi || !hasHydratedLearningState) {
      return undefined;
    }

    let disposed = false;
    const timer = window.setTimeout(() => {
      void window.desktopApi.state
        .save({
          plan: planPreview,
          lesson: lessonPreview,
          lessonHistory,
          replan: replanPreview
        })
        .then(() => {
          if (!disposed) {
            setStateError(null);
          }
        })
        .catch((error) => {
          if (!disposed) {
            const message = error instanceof Error ? error.message : "Failed to save desktop learning state.";
            setStateError(normalizeRuntimeError(message));
          }
        });
    }, 120);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [hasDesktopApi, hasHydratedLearningState, lessonHistory, lessonPreview, planPreview, replanPreview]);

  function buildLessonRequest(
    plan: PlanContract,
    overrides?: Partial<Pick<LessonGenerationRequest, "generationMode" | "lessonHistory" | "lessonSeed">>
  ): LessonGenerationRequest {
    return {
      ...DEFAULT_PLAN_REQUEST,
      ...planRequest,
      plan,
      generationMode: overrides?.generationMode ?? "initial",
      lessonHistory: overrides?.lessonHistory ?? lessonHistory,
      lessonSeed: overrides?.lessonSeed
    };
  }

  function buildFollowUpLessonSeed(plan: PlanContract, lesson: LessonContract): TodayLessonSeed {
    return {
      milestoneId: plan.milestones.find((item) => item.status === "active")?.id ?? plan.todayLessonSeed.milestoneId,
      lessonType: plan.todayLessonSeed.lessonType === "setup" ? "practice" : plan.todayLessonSeed.lessonType,
      objective: lesson.nextDefaultAction.label
    };
  }

  function buildReplanRequest(plan: PlanContract, lesson: LessonContract, reason: ReplanReason): ReplanGenerationRequest {
    return {
      ...planRequest,
      plan,
      currentLesson: lesson,
      reason,
      lessonHistory
    };
  }

  async function handleLogin() {
    setIsOpeningLogin(true);
    setAuthError(null);

    try {
      const nextSession = await window.desktopApi.auth.login();
      setSession(nextSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open browser sign-in.";
      setAuthError(normalizeRuntimeError(message));
    } finally {
      setIsOpeningLogin(false);
    }
  }

  async function handleGeneratePlan() {
    setIsGeneratingPlan(true);
    setPlanError(null);
    setActiveGenerationKind("plan");
    setActiveGenerationStep(0);

    try {
      const nextPlan = await window.desktopApi.plan.generate(planRequest);
      setPlanPreview(nextPlan);
      setLessonPreview(null);
      setLessonHistory([]);
      setReplanPreview(null);
      setLessonError(null);
      setReplanError(null);
      setActiveTab("roadmap");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Plan generation failed.";
      setPlanError(normalizeRuntimeError(message));
      setPlanPreview(null);
    } finally {
      setIsGeneratingPlan(false);
      setActiveGenerationKind(null);
    }
  }

  async function handleGenerateLesson(
    overrides?: Partial<Pick<LessonGenerationRequest, "generationMode" | "lessonHistory" | "lessonSeed">>
  ) {
    if (!planPreview) {
      return;
    }

    setIsGeneratingLesson(true);
    setLessonError(null);
    setActiveGenerationKind("lesson");
    setActiveGenerationStep(0);
    const previousLesson = lessonPreview;
    const request = buildLessonRequest(planPreview, overrides);

    try {
      const nextLesson = await window.desktopApi.lesson.generate(request);
      if (previousLesson && !lessonHistory.some((item) => item.lessonId === previousLesson.lessonId)) {
        setLessonHistory((current) => [...current, previousLesson].slice(-3));
      }
      if (request.lessonSeed) {
        setPlanPreview((current) => (current ? { ...current, todayLessonSeed: request.lessonSeed as TodayLessonSeed } : current));
      }
      setLessonPreview(nextLesson);
      setReplanPreview(null);
      setActiveTab("today");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lesson generation failed.";
      setLessonError(normalizeRuntimeError(message));
      setLessonPreview(null);
    } finally {
      setIsGeneratingLesson(false);
      setActiveGenerationKind(null);
    }
  }

  function handlePrimaryLessonClick() {
    if (!planPreview) {
      setLessonError("请先生成学习路线图，再生成今日课程。");
      return;
    }

    if (!supportsInteractiveDomain(planPreview.domainId)) {
      setLessonError(`当前 ${formatDomainLabel(planPreview.domainId)} 只支持路线图预览，暂不支持课程生成。`);
      return;
    }

    void handleGenerateLesson();
  }

  async function handleGenerateFollowUpLesson() {
    if (!planPreview || !lessonPreview) {
      return;
    }

    await handleGenerateLesson({
      generationMode: "follow_up",
      lessonSeed: buildFollowUpLessonSeed(planPreview, lessonPreview),
      lessonHistory: [...lessonHistory, lessonPreview].slice(-3)
    });
  }

  async function handleReplan(reason: ReplanReason) {
    if (!planPreview || !lessonPreview) {
      return;
    }

    setIsGeneratingReplan(true);
    setReplanError(null);

    try {
      const nextReplan = await window.desktopApi.plan.replan(buildReplanRequest(planPreview, lessonPreview, reason));
      setReplanPreview(nextReplan);
      setActiveTab("today");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Replan failed.";
      setReplanError(normalizeRuntimeError(message));
      setReplanPreview(null);
    } finally {
      setIsGeneratingReplan(false);
    }
  }

  function handleGenerateReplacementLesson() {
    if (!replanPreview) {
      return;
    }

    void handleGenerateLesson({
      generationMode: "replacement",
      lessonSeed: replanPreview.replacementLessonSeed,
      lessonHistory: lessonPreview ? [...lessonHistory, lessonPreview].slice(-3) : lessonHistory
    });
  }

  const sessionState = session?.status ?? "loading";
  const activeMilestone = planPreview?.milestones.find((item) => item.status === "active") ?? null;
  const planSupportsInteractiveLesson = Boolean(planPreview && supportsInteractiveDomain(planPreview.domainId));
  const generationOverlaySteps = activeGenerationKind === "lesson" ? LESSON_GENERATION_STEPS : PLAN_GENERATION_STEPS;
  const generationOverlayMeta =
    activeGenerationKind === "lesson"
      ? [
          `领域 ${planPreview ? formatDomainLabel(planPreview.domainId) : "待生成路线图"}`,
          `里程碑 ${activeMilestone?.title ?? "等待路线图"}`,
          `课程类型 ${planPreview?.todayLessonSeed.lessonType ?? "未定"}`
        ]
      : [
          planRequest.goalText,
          `每周 ${planRequest.weeklyTimeBudgetMinutes} 分钟`,
          `截止 ${planRequest.targetDeadline}`
        ];
  const generationOverlayTitle =
    activeGenerationKind === "lesson"
      ? `正在生成${planPreview ? formatDomainLabel(planPreview.domainId) : ""}今日课程`
      : "正在生成学习路线图";
  const generationOverlayDescription =
    activeGenerationKind === "lesson"
      ? "系统正在读取当前路线图，拼接任务、完成标准和卡住后的恢复动作。"
      : "系统正在把目标拆成里程碑、周节奏和第一课入口，完成后会立即刷新预览。";
  const loginButtonLabel =
    sessionState === "authenticated"
      ? "检查 Codex 登录状态"
      : isOpeningLogin
        ? "正在打开浏览器..."
        : "启动 Codex 浏览器登录";
  const loginFinePrint =
    sessionState === "authenticated"
      ? "当前已经检测到可复用的 `codex login` 会话，所以这里不会再跳转浏览器。如果要切换账号，请先在终端执行 `codex logout`，再回来重新登录。"
      : "桌面端会优先复用本机 `codex login` 登录态；没有可用会话时，会通过官方 Codex CLI 拉起浏览器登录。登录成功后，主进程直接通过 Codex CLI 请求模型；开发环境下仍可回退到 `OPENAI_API_KEY`。";
  const pageMeta = TAB_META[activeTab];
  const systemNotices = [
    bridgeError ? { title: "桌面桥接异常", message: bridgeError, tone: "critical" as const } : null,
    authError ? { title: "登录入口异常", message: authError, tone: "warning" as const } : null,
    stateError ? { title: "本地存档异常", message: stateError, tone: "warning" as const } : null
  ].filter((item): item is { message: string; title: string; tone: "critical" | "warning" } => Boolean(item));

  return (
    <main className="app-shell">
      <GenerationOverlay
        activeStep={activeGenerationStep}
        cards={buildGenerationOverlayCards(activeGenerationKind, activeMilestone?.title ?? null, lessonPreview?.title ?? null)}
        description={generationOverlayDescription}
        eyebrow={activeGenerationKind === "lesson" ? "Lesson.generate" : "Plan.generate"}
        isOpen={Boolean(activeGenerationKind)}
        meta={generationOverlayMeta}
        steps={generationOverlaySteps}
        title={generationOverlayTitle}
      />

      <div className="app-shell__glow app-shell__glow--mint" />
      <div className="app-shell__glow app-shell__glow--amber" />

      <div className="app-frame">
        <AppSidebar
          activeTab={activeTab}
          lessonHistoryCount={lessonHistory.length}
          lessonPreview={lessonPreview}
          onTabChange={setActiveTab}
          planPreview={planPreview}
          replanPreview={replanPreview}
          sessionState={sessionState}
        />

        <section className="workbench">
          <header className="workbench__topbar">
            <div className="view-heading">
              <p className="view-eyebrow">{pageMeta.eyebrow}</p>
              <h1>{pageMeta.title}</h1>
              <p className="view-description">{pageMeta.description}</p>
            </div>

            <div className="topbar-metrics">
              <span className={statusTone(sessionState)}>{pageMeta.statusLabel}</span>
              <span className="metric-pill">{planPreview ? `${formatDomainLabel(planPreview.domainId)} 路径` : "等待路线图"}</span>
              <span className="metric-pill">{activeMilestone?.title ?? "尚未激活里程碑"}</span>
              <span className="metric-pill metric-pill--accent">
                {lessonPreview ? `${lessonPreview.estimatedTotalMinutes} 分钟今日课` : "今日课未生成"}
              </span>
            </div>
          </header>

          {systemNotices.length > 0 ? (
            <div className="notice-stack">
              {systemNotices.map((notice) => (
                <article className={`notice-banner notice-banner--${notice.tone}`} key={notice.title}>
                  <p className="notice-banner__title">{notice.title}</p>
                  <p className="notice-banner__body">{notice.message}</p>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === "today" ? (
            <TodayView
              activeMilestone={activeMilestone}
              isGeneratingLesson={isGeneratingLesson}
              isGeneratingReplan={isGeneratingReplan}
              lessonError={lessonError}
              lessonHistory={lessonHistory}
              lessonPreview={lessonPreview}
              onGenerateFollowUpLesson={() => void handleGenerateFollowUpLesson()}
              onGenerateReplacement={handleGenerateReplacementLesson}
              onOpenRoadmap={() => setActiveTab("roadmap")}
              onPrimaryLessonClick={handlePrimaryLessonClick}
              onRunReplan={(reason) => void handleReplan(reason)}
              planPreview={planPreview}
              planSupportsInteractiveLesson={planSupportsInteractiveLesson}
              replanError={replanError}
              replanPreview={replanPreview}
            />
          ) : null}

          {activeTab === "roadmap" ? (
            <RoadmapView
              activeMilestone={activeMilestone}
              isGeneratingPlan={isGeneratingPlan}
              onGeneratePlan={() => void handleGeneratePlan()}
              planError={planError}
              planPreview={planPreview}
              targetDeadline={planRequest.targetDeadline}
            />
          ) : null}

          {activeTab === "settings" ? (
            <SettingsView
              bridgeHealthy={!bridgeError}
              onPlanRequestChange={(patch) => setPlanRequest((current) => ({ ...current, ...patch }))}
              onResetPlanRequest={() => setPlanRequest(DEFAULT_PLAN_REQUEST)}
              planRequest={planRequest}
              hasLesson={Boolean(lessonPreview)}
              hasPlan={Boolean(planPreview)}
              hasReplan={Boolean(replanPreview)}
              isOpeningLogin={isOpeningLogin}
              lessonHistoryCount={lessonHistory.length}
              loginButtonLabel={loginButtonLabel}
              loginFinePrint={loginFinePrint}
              onLogin={() => void handleLogin()}
              persistenceHealthy={!stateError}
              session={session}
              sessionState={sessionState}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
