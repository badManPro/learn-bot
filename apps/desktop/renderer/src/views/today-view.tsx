import type { LessonContract, PlanContract, ReplanContract, ReplanReason, RoadmapMilestone } from "@learn-bot/ai-contracts";

import { formatDomainLabel, formatLessonTypeLabel, formatReasonLabel } from "../lib/desktop-display";

type TodayViewProps = {
  activeMilestone: RoadmapMilestone | null;
  isGeneratingLesson: boolean;
  isGeneratingReplan: boolean;
  lessonError: string | null;
  lessonHistory: LessonContract[];
  lessonPreview: LessonContract | null;
  onGenerateFollowUpLesson: () => void;
  onGenerateReplacement: () => void;
  onOpenRoadmap: () => void;
  onPrimaryLessonClick: () => void;
  onRunReplan: (reason: ReplanReason) => void;
  planPreview: PlanContract | null;
  planSupportsInteractiveLesson: boolean;
  replanError: string | null;
  replanPreview: ReplanContract | null;
};

const REPLAN_REASONS: ReplanReason[] = ["too_hard", "pace_too_fast", "inactive"];

export function TodayView({
  activeMilestone,
  isGeneratingLesson,
  isGeneratingReplan,
  lessonError,
  lessonHistory,
  lessonPreview,
  onGenerateFollowUpLesson,
  onGenerateReplacement,
  onOpenRoadmap,
  onPrimaryLessonClick,
  onRunReplan,
  planPreview,
  planSupportsInteractiveLesson,
  replanError,
  replanPreview
}: TodayViewProps) {
  return (
    <div className="content-stack">
      <section className="surface-card hero-card hero-card--today">
        <div className="hero-card__content">
          <p className="hero-card__eyebrow">Lesson.generate</p>
          <h2>{lessonPreview ? lessonPreview.title : "先把今天这一课生成出来"}</h2>
          <p>
            {lessonPreview
              ? lessonPreview.whyThisNow
              : planPreview
                ? `当前激活里程碑是「${activeMilestone?.title ?? "待确定"}」，系统会围绕 ${planPreview.todayLessonSeed.objective} 展开今天的任务。`
                : "今日视图只处理当前 lesson、本次任务拆解，以及卡住后的恢复路径。"}
          </p>

          {planPreview ? (
            <div className="token-row">
              <span className="token">{formatDomainLabel(planPreview.domainId)}</span>
              <span className="token token--soft">{formatLessonTypeLabel(planPreview.todayLessonSeed.lessonType)}</span>
              <span className="token token--soft">{activeMilestone?.title ?? "未激活里程碑"}</span>
            </div>
          ) : null}
        </div>

        <div className="hero-card__actions">
          <button className="button button--primary" disabled={isGeneratingLesson} onClick={onPrimaryLessonClick} type="button">
            {isGeneratingLesson
              ? "生成中..."
              : !planPreview
                ? "先去生成路线图"
                : !planSupportsInteractiveLesson
                  ? "当前领域只支持路线图"
                  : lessonPreview
                    ? "重新生成今日课程"
                    : "生成今日课程"}
          </button>
          <button
            className="button button--ghost"
            disabled={!lessonPreview || !planSupportsInteractiveLesson || isGeneratingLesson}
            onClick={onGenerateFollowUpLesson}
            type="button"
          >
            生成后续课程
          </button>
        </div>
      </section>

      {lessonError ? <div className="inline-note inline-note--warning">{lessonError}</div> : null}

      {!planPreview ? (
        <section className="surface-card empty-panel">
          <h3 className="empty-panel__title">还没有整体路线</h3>
          <p className="empty-panel__copy">先在“整体路线”页生成路径，今日课程才会知道当前里程碑和 lesson seed。</p>
          <button className="button button--secondary" onClick={onOpenRoadmap} type="button">
            前往整体路线
          </button>
        </section>
      ) : null}

      {planPreview && !planSupportsInteractiveLesson ? (
        <section className="surface-card empty-panel">
          <h3 className="empty-panel__title">{formatDomainLabel(planPreview.domainId)} 当前仍是路线图模式</h3>
          <p className="empty-panel__copy">
            这个 domain 目前只支持整体路线预览，暂时不会生成可执行课程。你仍然可以在路线页查看目标分段和里程碑顺序。
          </p>
          <button className="button button--secondary" onClick={onOpenRoadmap} type="button">
            查看整体路线
          </button>
        </section>
      ) : null}

      {planPreview && planSupportsInteractiveLesson && !lessonPreview ? (
        <section className="surface-card empty-panel">
          <h3 className="empty-panel__title">路线已经有了，接下来生成今日课</h3>
          <p className="empty-panel__copy">{planPreview.todayLessonSeed.objective}</p>
          <button className="button button--secondary" disabled={isGeneratingLesson} onClick={onPrimaryLessonClick} type="button">
            {isGeneratingLesson ? "生成中..." : "生成今日课程"}
          </button>
        </section>
      ) : null}

      {lessonPreview ? (
        <>
          <section className="summary-grid">
            <article className="surface-card summary-tile">
              <span className="summary-tile__label">预计时长</span>
              <strong className="summary-tile__value">{lessonPreview.estimatedTotalMinutes} 分钟</strong>
              <p className="summary-tile__meta">{lessonPreview.whyItMatters}</p>
            </article>

            <article className="surface-card summary-tile">
              <span className="summary-tile__label">默认下一步</span>
              <strong className="summary-tile__value">{lessonPreview.nextDefaultAction.label}</strong>
              <p className="summary-tile__meta">{lessonPreview.nextDefaultAction.rationale}</p>
            </article>

            <article className="surface-card summary-tile">
              <span className="summary-tile__label">任务数量</span>
              <strong className="summary-tile__value">{lessonPreview.tasks.length} 个</strong>
              <p className="summary-tile__meta">每个任务都带预计时间与验证方式。</p>
            </article>

            <article className="surface-card summary-tile">
              <span className="summary-tile__label">历史课程</span>
              <strong className="summary-tile__value">{lessonHistory.length} 条</strong>
              <p className="summary-tile__meta">会在生成后续课和替代课时参与上下文。</p>
            </article>
          </section>

          <section className="lesson-layout">
            <div className="task-stack">
              {lessonPreview.tasks.map((task) => (
                <article className="surface-card task-card" key={task.id}>
                  <div className="task-card__head">
                    <div>
                      <p className="section-label">{task.type}</p>
                      <h3>{task.title}</h3>
                    </div>
                    <span className="metric-pill">{task.estimatedMinutes} 分钟</span>
                  </div>
                  <p className="task-card__copy">{task.instructions}</p>
                  <div className="detail-list">
                    <div className="detail-list__item">
                      <span>Expected output</span>
                      <strong>{task.expectedOutput}</strong>
                    </div>
                    <div className="detail-list__item">
                      <span>Verification</span>
                      <strong>{task.verificationMethod}</strong>
                    </div>
                    <div className="detail-list__item">
                      <span>Skip policy</span>
                      <strong>{task.skipPolicy}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="content-stack">
              <article className="surface-card detail-panel">
                <p className="section-label">Completion</p>
                <h3>完成标准</h3>
                <p className="detail-panel__copy">{lessonPreview.completionContract.summary}</p>
                <div className="detail-list">
                  <div className="detail-list__item">
                    <span>通过条件</span>
                    <strong>{lessonPreview.completionContract.passCriteria.join(" / ")}</strong>
                  </div>
                  <div className="detail-list__item">
                    <span>失败信号</span>
                    <strong>{lessonPreview.completionContract.failCriteria.join(" / ")}</strong>
                  </div>
                  <div className="detail-list__item">
                    <span>简版标准</span>
                    <strong>{lessonPreview.completionCriteria}</strong>
                  </div>
                </div>
              </article>

              <article className="surface-card detail-panel">
                <p className="section-label">Materials</p>
                <h3>开始前要准备什么</h3>
                <div className="token-row">
                  {(lessonPreview.materialsNeeded.length > 0 ? lessonPreview.materialsNeeded : ["无需额外材料"]).map((item) => (
                    <span className="token token--soft" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
                <div className="detail-list">
                  <div className="detail-list__item">
                    <span>Quiz checkpoint</span>
                    <strong>{lessonPreview.quiz.question}</strong>
                  </div>
                  <div className="detail-list__item">
                    <span>Reflection</span>
                    <strong>{lessonPreview.reflectionPrompt}</strong>
                  </div>
                </div>
              </article>

              <article className="surface-card detail-panel">
                <p className="section-label">If blocked</p>
                <h3>卡住时如何恢复</h3>
                <div className="recovery-list">
                  {lessonPreview.ifBlocked.map((item) => (
                    <div className="recovery-item" key={item.trigger}>
                      <strong>{item.trigger}</strong>
                      <span>{item.response}</span>
                    </div>
                  ))}
                </div>
              </article>

              {lessonHistory.length > 0 ? (
                <article className="surface-card detail-panel">
                  <p className="section-label">Recent lessons</p>
                  <h3>最近几节课</h3>
                  <div className="history-list">
                    {lessonHistory.map((item) => (
                      <div className="history-list__item" key={item.lessonId}>
                        <strong>{item.title}</strong>
                        <span>{item.nextDefaultAction.label}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>
          </section>

          <section className="surface-card replan-card">
            <div className="replan-card__head">
              <div>
                <p className="section-label">Plan.replan</p>
                <h3>如果今天卡住，就在这里重排路径</h3>
              </div>
              <div className="button-group">
                {REPLAN_REASONS.map((reason) => (
                  <button
                    className="button button--ghost"
                    disabled={isGeneratingReplan}
                    key={reason}
                    onClick={() => onRunReplan(reason)}
                    type="button"
                  >
                    {formatReasonLabel(reason)}
                  </button>
                ))}
              </div>
            </div>

            {replanError ? <div className="inline-note inline-note--warning">{replanError}</div> : null}

            {replanPreview ? (
              <div className="split-section split-section--narrow">
                <article className="surface-card detail-panel detail-panel--subtle">
                  <p className="section-label">Diagnosis</p>
                  <h3>{formatReasonLabel(replanPreview.replanReason)}</h3>
                  <p className="detail-panel__copy">{replanPreview.diagnosis}</p>
                  <div className="detail-list">
                    <div className="detail-list__item">
                      <span>给用户的话</span>
                      <strong>{replanPreview.userMessage}</strong>
                    </div>
                    <div className="detail-list__item">
                      <span>节奏调整</span>
                      <strong>{replanPreview.paceChange}</strong>
                    </div>
                    <div className="detail-list__item">
                      <span>里程碑修正</span>
                      <strong>{replanPreview.milestoneAdjustment}</strong>
                    </div>
                  </div>
                </article>

                <article className="surface-card detail-panel detail-panel--subtle">
                  <p className="section-label">Replacement</p>
                  <h3>{replanPreview.replacementLessonTitle}</h3>
                  <p className="detail-panel__copy">{replanPreview.replacementLesson.reason}</p>
                  <div className="detail-list">
                    <div className="detail-list__item">
                      <span>Focus</span>
                      <strong>{replanPreview.replacementLesson.focus}</strong>
                    </div>
                    <div className="detail-list__item">
                      <span>第一步</span>
                      <strong>{replanPreview.replacementLesson.firstStep}</strong>
                    </div>
                    <div className="detail-list__item">
                      <span>替代 seed</span>
                      <strong>
                        {formatLessonTypeLabel(replanPreview.replacementLessonSeed.lessonType)} /{" "}
                        {replanPreview.replacementLessonSeed.objective}
                      </strong>
                    </div>
                  </div>
                  <button className="button button--secondary" disabled={isGeneratingLesson} onClick={onGenerateReplacement} type="button">
                    {isGeneratingLesson ? "生成中..." : "生成替代课程"}
                  </button>
                </article>
              </div>
            ) : (
              <p className="replan-card__placeholder">当你觉得太难、节奏过快或中断太久时，这里会给出诊断和替代课程。</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
