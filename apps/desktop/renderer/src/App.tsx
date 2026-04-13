import { useEffect, useState } from "react";

import type { LessonContract, PlanContract, ReplanContract, ReplanReason, TodayLessonSeed } from "@learn-bot/ai-contracts";
import type { LessonGenerationRequest, PlanGenerationRequest, ReplanGenerationRequest } from "@learn-bot/ai-orchestrator";

import type { DesktopSession, DesktopSessionStatus } from "../../shared/contracts";

const DEFAULT_PLAN_REQUEST: PlanGenerationRequest = {
  goalText: "我想学 Python 做 AI 自动化工作流",
  currentLevel: "zero",
  weeklyTimeBudgetMinutes: 240,
  targetDeadline: "2026-06-30",
  mbti: null
};

function formatDomainLabel(domainId: string) {
  const labels: Record<string, string> = {
    drawing: "Drawing",
    piano: "Piano",
    python: "Python"
  };

  return labels[domainId] ?? domainId.slice(0, 1).toUpperCase() + domainId.slice(1);
}

function formatSessionStatus(status: DesktopSessionStatus | "loading") {
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

function supportsInteractiveDomain(domainId: string) {
  return domainId === "python" || domainId === "piano";
}

function normalizeRuntimeError(message: string) {
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

function statusTone(status: DesktopSessionStatus | "loading") {
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

export default function App() {
  const hasDesktopApi = typeof window !== "undefined" && typeof window.desktopApi !== "undefined";
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanContract | null>(null);
  const [lessonPreview, setLessonPreview] = useState<LessonContract | null>(null);
  const [lessonHistory, setLessonHistory] = useState<LessonContract[]>([]);
  const [replanPreview, setReplanPreview] = useState<ReplanContract | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [replanError, setReplanError] = useState<string | null>(null);
  const [isOpeningLogin, setIsOpeningLogin] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [isGeneratingReplan, setIsGeneratingReplan] = useState(false);

  useEffect(() => {
    if (!hasDesktopApi) {
      setBridgeError("desktopApi preload bridge is unavailable. Check the Electron preload path and DevTools console.");
      return;
    }

    let disposed = false;

    void window.desktopApi.auth.session
      .get()
      .then((nextSession) => {
        if (!disposed) {
          setSession(nextSession);
        }
      })
      .catch((error) => {
        if (!disposed) {
          const message = error instanceof Error ? error.message : "Failed to read desktop session.";
          setBridgeError(normalizeRuntimeError(message));
        }
      });

    return () => {
      disposed = true;
    };
  }, [hasDesktopApi]);

  function buildLessonRequest(
    plan: PlanContract,
    overrides?: Partial<Pick<LessonGenerationRequest, "generationMode" | "lessonHistory" | "lessonSeed">>
  ): LessonGenerationRequest {
    return {
      ...DEFAULT_PLAN_REQUEST,
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
      ...DEFAULT_PLAN_REQUEST,
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

    try {
      const nextPlan = await window.desktopApi.plan.generate(DEFAULT_PLAN_REQUEST);
      setPlanPreview(nextPlan);
      setLessonPreview(null);
      setLessonHistory([]);
      setReplanPreview(null);
      setLessonError(null);
      setReplanError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Plan generation failed.";
      setPlanError(normalizeRuntimeError(message));
      setPlanPreview(null);
    } finally {
      setIsGeneratingPlan(false);
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lesson generation failed.";
      setLessonError(normalizeRuntimeError(message));
      setLessonPreview(null);
    } finally {
      setIsGeneratingLesson(false);
    }
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Replan failed.";
      setReplanError(normalizeRuntimeError(message));
      setReplanPreview(null);
    } finally {
      setIsGeneratingReplan(false);
    }
  }

  const sessionState = session?.status ?? "loading";
  const activeMilestone = planPreview?.milestones.find((item) => item.status === "active") ?? null;
  const planSupportsInteractiveLesson = Boolean(planPreview && supportsInteractiveDomain(planPreview.domainId));
  const canGenerateFollowUpLesson = Boolean(lessonPreview && planSupportsInteractiveLesson);
  const canRunReplan = Boolean(lessonPreview && planSupportsInteractiveLesson);
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

  return (
    <main className="app-shell">
      <div className="app-shell__glow app-shell__glow--violet" />
      <div className="app-shell__glow app-shell__glow--amber" />

      <div className="app-layout">
        <section className="hero-panel">
          <div className="hero-panel__copy">
            <p className="eyebrow">Learn Bot Desktop</p>
            <h1>让桌面学习面板看起来像产品，而不是日志窗口。</h1>
            <p className="hero-panel__text">
              当前桌面端聚焦三件事：浏览器登录入口、学习路线图生成，以及基于当前里程碑的课程与恢复路径生成。
            </p>
          </div>

          <div className="hero-panel__metrics">
            <div className="mini-metric">
              <span>当前目标</span>
              <strong>{DEFAULT_PLAN_REQUEST.goalText}</strong>
            </div>
            <div className="mini-metric">
              <span>每周投入</span>
              <strong>{DEFAULT_PLAN_REQUEST.weeklyTimeBudgetMinutes} 分钟</strong>
            </div>
            <div className="mini-metric">
              <span>桌面桥接</span>
              <strong>{bridgeError ? "异常" : "在线"}</strong>
            </div>
          </div>
        </section>

        {bridgeError ? (
          <section className="error-banner" role="alert">
            <p className="error-banner__title">桌面桥接异常</p>
            <p>{bridgeError}</p>
          </section>
        ) : null}

        {authError ? (
          <section className="error-banner" role="alert">
            <p className="error-banner__title">无法打开登录页</p>
            <p>{authError}</p>
          </section>
        ) : null}

        <section className="panel-grid">
          <article className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Access</p>
                <h2>OpenAI / Codex 登录</h2>
              </div>
              <span className={statusTone(sessionState)}>{formatSessionStatus(sessionState)}</span>
            </div>

            <div className="info-stack">
              <div className="info-row">
                <span className="info-row__label">本地会话</span>
                <strong className="info-row__value">{session?.accountLabel ?? "尚未建立桌面会话"}</strong>
              </div>
              <div className="info-row">
                <span className="info-row__label">Workspace</span>
                <strong className="info-row__value">{session?.workspaceId ?? "回调完成后再写入"}</strong>
              </div>
              <div className="info-note">
                {session?.loginHint ?? "点击按钮后会在系统浏览器中发起 OpenAI 授权，并等待 localhost 回调完成。"}
              </div>
            </div>

            <div className="panel__actions">
              <button className="button button--primary" disabled={isOpeningLogin} onClick={() => void handleLogin()} type="button">
                {loginButtonLabel}
              </button>
              <p className="fine-print">{loginFinePrint}</p>
            </div>
          </article>

          <article className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Plan Setup</p>
                <h2>本次生成配置</h2>
              </div>
              <button
                className="button button--accent"
                disabled={isGeneratingPlan}
                onClick={() => void handleGeneratePlan()}
                type="button"
              >
                {isGeneratingPlan ? "生成中..." : "生成学习路线图"}
              </button>
            </div>

            <div className="summary-card">
              <div className="summary-card__item">
                <span>学习目标</span>
                <strong>{DEFAULT_PLAN_REQUEST.goalText}</strong>
              </div>
              <div className="summary-card__item">
                <span>起点水平</span>
                <strong>{DEFAULT_PLAN_REQUEST.currentLevel}</strong>
              </div>
              <div className="summary-card__item">
                <span>每周预算</span>
                <strong>{DEFAULT_PLAN_REQUEST.weeklyTimeBudgetMinutes} 分钟</strong>
              </div>
              <div className="summary-card__item">
                <span>目标日期</span>
                <strong>{DEFAULT_PLAN_REQUEST.targetDeadline}</strong>
              </div>
            </div>

            {planError ? (
              <div className="inline-alert" role="alert">
                {planError}
              </div>
            ) : (
              <p className="fine-print">
                计划生成已走 Electron main process + 结构化输出校验；默认复用本机 `codex login` 会话请求模型，开发环境下也可回退到
                `OPENAI_API_KEY`。
              </p>
            )}
          </article>
        </section>

        <section className="workspace-grid">
          <article className="panel panel--stretch">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Plan.generate</p>
                <h2>路线图预览</h2>
              </div>
              {planPreview ? (
                <div className="meta-chip-group">
                  <span className="meta-chip">{formatDomainLabel(planPreview.domainId)}</span>
                  <span className="meta-chip">{planPreview.totalEstimatedWeeks} 周</span>
                </div>
              ) : null}
            </div>

            {planPreview ? (
              <>
                <div className="headline-card">
                  <h3>{planPreview.planTitle}</h3>
                  <p>{planPreview.goalSummary}</p>
                </div>

                <div className="tag-list">
                  {planPreview.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                  {planPreview.warnings.map((warning) => (
                    <span className="tag tag--warning" key={warning}>
                      {warning}
                    </span>
                  ))}
                </div>

                <div className="milestone-list">
                  {planPreview.milestones.map((milestone) => (
                    <article className="milestone-card" key={milestone.id}>
                      <div className="milestone-card__header">
                        <span className="milestone-card__index">{milestone.index}</span>
                        <div>
                          <h4>{milestone.title}</h4>
                          <p>{milestone.purpose}</p>
                        </div>
                      </div>
                      <div className="milestone-card__footer">
                        <span className="meta-chip">{milestone.status}</span>
                        <span className="fine-print">Success criteria: {milestone.successCriteria.join(" / ")}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h3>先生成一份路线图</h3>
                <p>生成结果会在这里展示目标摘要、里程碑、标签和风险提示，方便你继续生成今日课程。</p>
              </div>
            )}
          </article>

          <article className="panel panel--stretch">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Lesson.generate</p>
                <h2>今日课程</h2>
              </div>
              <div className="button-group">
                <button
                  className="button button--secondary"
                  disabled={!planSupportsInteractiveLesson || isGeneratingLesson}
                  onClick={() => void handleGenerateLesson()}
                  type="button"
                >
                  {isGeneratingLesson
                    ? "生成中..."
                    : `生成${planPreview ? formatDomainLabel(planPreview.domainId) : ""}课程`}
                </button>
                <button
                  className="button button--ghost"
                  disabled={!canGenerateFollowUpLesson || isGeneratingLesson}
                  onClick={() => void handleGenerateFollowUpLesson()}
                  type="button"
                >
                  生成后续课程
                </button>
              </div>
            </div>

            {planPreview ? (
              <div className="summary-card summary-card--compact">
                <div className="summary-card__item">
                  <span>当前领域</span>
                  <strong>{formatDomainLabel(planPreview.domainId)}</strong>
                </div>
                <div className="summary-card__item">
                  <span>激活里程碑</span>
                  <strong>{activeMilestone?.title ?? "尚未确定"}</strong>
                </div>
                <div className="summary-card__item">
                  <span>课程类型</span>
                  <strong>{planPreview.todayLessonSeed.lessonType}</strong>
                </div>
                <div className="summary-card__item">
                  <span>历史课程</span>
                  <strong>{lessonHistory.length}</strong>
                </div>
              </div>
            ) : null}

            {planPreview && !planSupportsInteractiveLesson ? (
              <div className="inline-alert inline-alert--neutral">
                当前桌面壳只支持 Python 和 Piano 的课程生成与 replan。{formatDomainLabel(planPreview.domainId)} 目前仍是路线图-only。
              </div>
            ) : null}

            {lessonError ? (
              <div className="inline-alert" role="alert">
                {lessonError}
              </div>
            ) : null}

            {lessonPreview ? (
              <>
                <div className="headline-card">
                  <h3>{lessonPreview.title}</h3>
                  <p>{lessonPreview.whyThisNow}</p>
                </div>

                <div className="split-grid">
                  <div className="detail-card">
                    <p className="detail-card__title">需要准备</p>
                    <p>{lessonPreview.materialsNeeded.join(" · ") || "无需额外材料"}</p>
                  </div>
                  <div className="detail-card">
                    <p className="detail-card__title">默认下一步</p>
                    <p>{lessonPreview.nextDefaultAction.label}</p>
                    <span className="fine-print">{lessonPreview.nextDefaultAction.rationale}</span>
                  </div>
                </div>

                <div className="lesson-task-list">
                  {lessonPreview.tasks.map((task) => (
                    <article className="lesson-task" key={task.id}>
                      <div className="lesson-task__header">
                        <h4>{task.title}</h4>
                        <span className="meta-chip">{task.estimatedMinutes} 分钟</span>
                      </div>
                      <p>{task.instructions}</p>
                      <span className="fine-print">
                        {task.type} / {task.verificationMethod}
                      </span>
                    </article>
                  ))}
                </div>

                <div className="split-grid">
                  <div className="detail-card">
                    <p className="detail-card__title">完成标准</p>
                    <p>{lessonPreview.completionContract.summary}</p>
                  </div>
                  <div className="detail-card">
                    <p className="detail-card__title">Quiz checkpoint</p>
                    <p>{lessonPreview.quiz.question}</p>
                  </div>
                </div>

                <div className="detail-card">
                  <p className="detail-card__title">卡住时怎么处理</p>
                  <div className="blocked-list">
                    {lessonPreview.ifBlocked.map((item) => (
                      <div className="blocked-list__item" key={item.trigger}>
                        <strong>{item.trigger}</strong>
                        <span>{item.response}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h3>路线图之后，再生成今天这一课</h3>
                <p>这里会展示课程标题、任务清单、完成标准、卡住时的恢复动作，以及下一步推荐。</p>
              </div>
            )}
          </article>
        </section>

        <section className="panel panel--stretch">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Plan.replan</p>
              <h2>卡住后的恢复路径</h2>
            </div>
            <div className="button-group">
              <button
                className="button button--ghost"
                disabled={!canRunReplan || isGeneratingReplan}
                onClick={() => void handleReplan("too_hard")}
                type="button"
              >
                太难了
              </button>
              <button
                className="button button--ghost"
                disabled={!canRunReplan || isGeneratingReplan}
                onClick={() => void handleReplan("pace_too_fast")}
                type="button"
              >
                节奏太快
              </button>
              <button
                className="button button--ghost"
                disabled={!canRunReplan || isGeneratingReplan}
                onClick={() => void handleReplan("inactive")}
                type="button"
              >
                中断太久
              </button>
            </div>
          </div>

          {replanError ? (
            <div className="inline-alert" role="alert">
              {replanError}
            </div>
          ) : null}

          {replanPreview ? (
            <div className="split-grid split-grid--wide">
              <div className="detail-card">
                <p className="detail-card__title">诊断结果</p>
                <p>{replanPreview.diagnosis}</p>
                <div className="detail-card__stack">
                  <div>
                    <strong>给用户的话</strong>
                    <p>{replanPreview.userMessage}</p>
                  </div>
                  <div>
                    <strong>节奏调整</strong>
                    <p>{replanPreview.paceChange}</p>
                  </div>
                  <div>
                    <strong>里程碑修正</strong>
                    <p>{replanPreview.milestoneAdjustment}</p>
                  </div>
                </div>
              </div>

              <div className="detail-card">
                <p className="detail-card__title">{replanPreview.replacementLessonTitle}</p>
                <p>{replanPreview.replacementLesson.reason}</p>
                <div className="detail-card__stack">
                  <div>
                    <strong>Focus</strong>
                    <p>{replanPreview.replacementLesson.focus}</p>
                  </div>
                  <div>
                    <strong>第一步</strong>
                    <p>{replanPreview.replacementLesson.firstStep}</p>
                  </div>
                  <div>
                    <strong>替代 lesson seed</strong>
                    <p>
                      {replanPreview.replacementLessonSeed.lessonType} / {replanPreview.replacementLessonSeed.objective}
                    </p>
                  </div>
                </div>
                <button
                  className="button button--accent button--wide"
                  disabled={isGeneratingLesson}
                  onClick={() =>
                    void handleGenerateLesson({
                      generationMode: "replacement",
                      lessonSeed: replanPreview.replacementLessonSeed,
                      lessonHistory: lessonPreview ? [...lessonHistory, lessonPreview].slice(-3) : lessonHistory
                    })
                  }
                  type="button"
                >
                  生成替代课程
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state empty-state--compact">
              <h3>先有课程，replan 才有上下文</h3>
              <p>当用户觉得太难、节奏过快或中断太久时，这里会生成诊断、节奏建议和新的 lesson seed。</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
