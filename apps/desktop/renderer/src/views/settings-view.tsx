import type { PlanGenerationRequest } from "@learn-bot/ai-orchestrator";

import type { DesktopSession } from "../../../shared/contracts";
import { formatCurrentLevelLabel, formatSessionStatus, formatTargetDeadline, statusTone } from "../lib/desktop-display";

type SettingsViewProps = {
  bridgeHealthy: boolean;
  hasLesson: boolean;
  hasPlan: boolean;
  hasReplan: boolean;
  isOpeningLogin: boolean;
  lessonHistoryCount: number;
  loginButtonLabel: string;
  loginFinePrint: string;
  onLogin: () => void;
  onPlanRequestChange: (patch: Partial<PlanGenerationRequest>) => void;
  onResetPlanRequest: () => void;
  persistenceHealthy: boolean;
  planRequest: PlanGenerationRequest;
  session: DesktopSession | null;
  sessionState: "anonymous" | "authenticated" | "loading" | "pending";
};

export function SettingsView({
  bridgeHealthy,
  hasLesson,
  hasPlan,
  hasReplan,
  isOpeningLogin,
  lessonHistoryCount,
  loginButtonLabel,
  loginFinePrint,
  onLogin,
  onPlanRequestChange,
  onResetPlanRequest,
  persistenceHealthy,
  planRequest,
  session,
  sessionState
}: SettingsViewProps) {
  return (
    <div className="content-stack">
      <section className="summary-grid">
        <article className="surface-card summary-tile">
          <span className="summary-tile__label">登录状态</span>
          <strong className="summary-tile__value">{formatSessionStatus(sessionState)}</strong>
          <p className="summary-tile__meta">桌面端优先复用本机的 `codex login` 会话。</p>
        </article>

        <article className="surface-card summary-tile">
          <span className="summary-tile__label">桌面桥接</span>
          <strong className="summary-tile__value">{bridgeHealthy ? "正常" : "异常"}</strong>
          <p className="summary-tile__meta">Renderer 到主进程的 IPC 通路状态。</p>
        </article>

        <article className="surface-card summary-tile">
          <span className="summary-tile__label">本地快照</span>
          <strong className="summary-tile__value">{persistenceHealthy ? "可保存" : "异常"}</strong>
          <p className="summary-tile__meta">当前路线、课程和 replan 会自动落盘。</p>
        </article>

        <article className="surface-card summary-tile">
          <span className="summary-tile__label">当前缓存</span>
          <strong className="summary-tile__value">{lessonHistoryCount} 条历史课</strong>
          <p className="summary-tile__meta">用于生成 follow-up 与 replacement lesson。</p>
        </article>
      </section>

      <section className="settings-grid">
        <article className="surface-card settings-card">
          <div className="settings-card__head">
            <div>
              <p className="section-label">Access</p>
              <h3>OpenAI / Codex 登录</h3>
            </div>
            <span className={statusTone(sessionState)}>{formatSessionStatus(sessionState)}</span>
          </div>

          <div className="detail-list">
            <div className="detail-list__item">
              <span>本地会话</span>
              <strong>{session?.accountLabel ?? "尚未建立桌面会话"}</strong>
            </div>
            <div className="detail-list__item">
              <span>Workspace</span>
              <strong>{session?.workspaceId ?? "回调完成后再写入"}</strong>
            </div>
            <div className="detail-list__item">
              <span>登录提示</span>
              <strong>{session?.loginHint ?? "点击按钮后会通过 Codex CLI 拉起浏览器授权。"}</strong>
            </div>
          </div>

          <button className="button button--primary" disabled={isOpeningLogin} onClick={onLogin} type="button">
            {loginButtonLabel}
          </button>
          <p className="settings-note">{loginFinePrint}</p>
        </article>

        <article className="surface-card settings-card">
          <div className="settings-card__head">
            <div>
              <p className="section-label">Defaults</p>
              <h3>默认生成参数</h3>
            </div>
            <div className="button-group">
              <span className="metric-pill">session 内生效</span>
              <button className="button button--ghost" onClick={onResetPlanRequest} type="button">
                恢复默认
              </button>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span className="form-field__label">学习目标</span>
              <textarea
                className="input-control input-control--multiline"
                onChange={(event) => onPlanRequestChange({ goalText: event.target.value })}
                rows={4}
                value={planRequest.goalText}
              />
            </label>

            <div className="form-row">
              <label className="form-field">
                <span className="form-field__label">当前水平</span>
                <select
                  className="input-control"
                  onChange={(event) => onPlanRequestChange({ currentLevel: event.target.value as PlanGenerationRequest["currentLevel"] })}
                  value={planRequest.currentLevel}
                >
                  <option value="zero">零基础</option>
                  <option value="beginner">初学</option>
                  <option value="intermediate">有基础</option>
                  <option value="advanced">进阶</option>
                </select>
              </label>

              <label className="form-field">
                <span className="form-field__label">每周投入</span>
                <input
                  className="input-control"
                  min={30}
                  onChange={(event) =>
                    onPlanRequestChange({
                      weeklyTimeBudgetMinutes: Math.max(30, Number.parseInt(event.target.value || "0", 10) || 30)
                    })
                  }
                  step={30}
                  type="number"
                  value={planRequest.weeklyTimeBudgetMinutes}
                />
              </label>
            </div>

            <label className="form-field">
              <span className="form-field__label">目标日期</span>
              <input
                className="input-control"
                onChange={(event) => onPlanRequestChange({ targetDeadline: event.target.value })}
                type="date"
                value={planRequest.targetDeadline}
              />
            </label>
          </div>

          <p className="settings-note">
            当前基线会被“整体路线”“今日课程”和 replan 共同使用。下一次点击生成时，会直接读取这里的配置。
          </p>
          <div className="detail-list">
            <div className="detail-list__item">
              <span>当前摘要</span>
              <strong>{formatCurrentLevelLabel(planRequest.currentLevel)} / 每周 {planRequest.weeklyTimeBudgetMinutes} 分钟</strong>
            </div>
            <div className="detail-list__item">
              <span>目标日期</span>
              <strong>{formatTargetDeadline(planRequest.targetDeadline)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="settings-grid settings-grid--three">
        <article className="surface-card settings-card">
          <div className="settings-card__head">
            <div>
              <p className="section-label">Runtime</p>
              <h3>桌面运行状态</h3>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-list__item">
              <span>IPC bridge</span>
              <strong>{bridgeHealthy ? "Renderer 与 main 正常通信" : "桥接异常，请检查 preload"}</strong>
            </div>
            <div className="detail-list__item">
              <span>Persistence</span>
              <strong>{persistenceHealthy ? "本地状态可读写" : "本地状态读写出现异常"}</strong>
            </div>
          </div>
        </article>

        <article className="surface-card settings-card">
          <div className="settings-card__head">
            <div>
              <p className="section-label">Snapshot</p>
              <h3>当前本地内容</h3>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-list__item">
              <span>路线图</span>
              <strong>{hasPlan ? "已缓存" : "未缓存"}</strong>
            </div>
            <div className="detail-list__item">
              <span>今日课程</span>
              <strong>{hasLesson ? "已缓存" : "未缓存"}</strong>
            </div>
            <div className="detail-list__item">
              <span>Replan</span>
              <strong>{hasReplan ? "已缓存" : "未缓存"}</strong>
            </div>
          </div>
        </article>

        <article className="surface-card settings-card">
          <div className="settings-card__head">
            <div>
              <p className="section-label">Notes</p>
              <h3>当前桌面端规则</h3>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-list__item">
              <span>交互课程</span>
              <strong>当前只支持 Python 与 Piano</strong>
            </div>
            <div className="detail-list__item">
              <span>生成来源</span>
              <strong>优先走 `codex login`，开发环境可回退 `OPENAI_API_KEY`</strong>
            </div>
            <div className="detail-list__item">
              <span>替代课程</span>
              <strong>由 replan 输出 replacement seed 后再生成</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
