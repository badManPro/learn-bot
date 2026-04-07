# AI Learning Assistant MVP Design

Status: Draft
Date: 2026-04-05

## 1. One-line Product Definition

一个面向零基础成年人的 Web AI 学习助手。用户输入最少信息后，系统把自由学习目标映射到当前支持路径，生成 `30 天路线 + 今天一课`，把学习拆成接近 `0 决策` 的 10 到 15 分钟原子任务，帮助用户在 30 天内做出一个带假 AI 返回的命令行小助手，并能改出 2 个小变体。

## 2. Problem Framing

### Target user

- 对外可讲: 想学编程/AI 的成年人自学者
- 首版真实优先用户: 零基础、最好有明确项目目标的人
- 典型动机: 跟上行业变化，怕落后；更强的启动动机来自 30 到 90 天内要做出一个 demo

### Triggering scenario

- 用户决定开始学编程/AI
- 但完全不知道从哪开始
- 常见拖延周期为 1 到 2 周

### Core pain

- 教程和文档太抽象，看完不会用
- 练习容易太难，挫败感高
- 看完仍不知道今天具体做什么
- 不想自己筛路线、拆任务、反复调教 AI

### Current alternatives

- 教程文章和文档自学
- B 站长视频
- 收藏一堆教程但不开始
- 临时问 ChatGPT/Claude

### Why current alternatives fail

- 内容碎，顺序和难度要自己判断
- 缺少连续任务流
- 很少能在用户卡住时把任务改到“做得动”
- AI 计划往往需要多轮调教，无法真正做到低决策成本

### Strongest value hypothesis

- 系统替用户决定“今天学什么、做到什么程度”
- 用户一旦卡住，系统能把今天的任务改到做得动
- 用户因此愿意持续回来，而不是只看一次路线图

## 3. Product Definition

### Core job to be done

帮零基础用户在 30 天内拿到第一个阶段成果，而且每天不用自己决定学什么。

### First moment of value

首日完成以下结果:

- 完成 Python 环境搭建
- 跑通 `hello world`
- 再跑一个假 AI 小例子

### 30-day outcome

- 做出一个带假 AI 返回的命令行小助手
- 自己改出 2 个小变体

### 90-day outcome

- 做出一个自动化工作流 demo

### Validation signal

- 用户在 30 天内完成第 1 阶段
- 跑通命令行小助手
- 在使用前 7 天明确感知到: “每天不用自己决定学什么”

## 4. MVP Scope

### In scope

- Web 形态优先，先不做桌面端
- 首屏收集 4 项信息:
  - 学习目标
  - 当前基础
  - 每周可投入时间
  - 目标截止时间
- MBTI 为可选项，可跳过
- 自由输入目标，但后台只映射到少数已验证路径
- 首版优先支持 `Python for AI / AI 自动化与工作流`
- 生成 `30 天路线 + 今天一课`
- `30 天路线` 只展示 3 个里程碑和每个里程碑成果
- `今天一课` 由一个今日小目标组成，内部含 2 到 4 个原子任务
- 每个原子任务时长约 10 到 15 分钟
- 完成标准为 `跑通 + 1 道超短单选/判断题`
- 用户可跳过当前原子任务，系统直接进入下一步
- 用户点击 `太难/不对` 时，整节 `今天一课` 重生成更简单版本
- 连续两次点击 `太难/不对` 时，先询问极短原因，再重排
- 连续 3 天未学习时，默认推荐 `重新安排`
- `重新安排` 的默认动作:
  - 插入一节复习/补基础
  - 拉长后续周期

### Personalization in v1

- MBTI 可跳过
- v1 只做轻度个性化
- 仅影响:
  - 任务颗粒度
  - 节奏快慢

### Out of scope

- 桌宠、悬浮窗、快捷键呼出
- 真实 API key 接入
- 社区、分享、排行榜
- 深度人格测试
- 广泛支持所有编程/AI 学习方向

### Explicit v1 tradeoff

- v1 暂不做代码/练习自动校验
- 接受内容稳定性存在波动
- 通过用户反馈和受控路径映射降低风险

## 5. User Research Critique

### Why users may ignore it

- 他们的真实问题可能不是“不会学”，而是“动机不够强”
- 如果只有模糊焦虑，没有明确项目目标，产品很容易沦为一次性体验

### When they will actually try it

- 有明确阶段目标时
- 有 30 到 90 天内要交付 demo 的压力时
- 已经意识到自己拖了 1 到 2 周仍没开始时

### What they worry about before trusting it

- 这是不是又一个 AI 瞎编的课程工具
- 我卡住时是不是还是得靠自己
- 第一天之后会不会又失去新鲜感

### What proof they need

- 第一节课就能跑通结果
- 卡住时能明显被“捞回来”
- 路线不是无限开放，而是有清晰里程碑

## 6. Interaction Design

### Shortest end-to-end user path

1. 用户进入产品
2. 输入最少必要信息
3. 选择是否补充 MBTI
4. 系统进入生成态
5. 用户先看到 `30 天路线概览`
6. 点击 `开始今天一课`
7. 完成今日小目标中的 2 到 4 个原子任务
8. 跑通结果并完成 1 道单选/判断题
9. 查看今天完成内容和当前阶段进度
10. 第二天继续进入新的 `今天一课`

### Page map

#### 1) Onboarding

Purpose:

- 获取最少必要信息
- 让用户快速启动，而不是做完整画像

Key actions:

- 输入学习目标
- 选择当前基础
- 输入每周投入时间
- 输入截止时间

#### 2) MBTI Optional

Purpose:

- 提供轻度个性化，不阻塞开始

Key actions:

- 选择 MBTI
- 或跳过

#### 3) Generating

Purpose:

- 建立“系统正在理解、规划、生产”的信任感

Design notes:

- 带角色感，但角色只出现在 loading 阶段
- 文案应说明系统正在基于用户目标、基础和时间进行拆分
- 需要有体验较好的过渡动画

#### 4) Roadmap Overview

Purpose:

- 建立信任和全局感

Shows:

- 3 个里程碑
- 每个里程碑的成果

Key actions:

- 开始今天一课
- 修改每周投入时间或截止时间

#### 5) Today Lesson

Purpose:

- 让用户在最低决策负担下完成今天的学习

Default order:

1. 完成标准
2. 第一个任务
3. 一句“为什么今天学这个”
4. 讲解折叠内容
5. 检查题

Rules:

- 任务为主，讲解为辅
- 用户完成一个原子任务后，直接进入下一步
- 用户觉得太简单时，可跳过当前原子任务

#### 6) Lesson Regeneration State

Purpose:

- 在不改变阶段目标的前提下，把今天一课改到更容易执行

Message:

- 已为你简化任务
- 或已为你补充前置知识

#### 7) Completion

Purpose:

- 提供明确完成感，防止产品无止境推进

Shows:

- 今天完成了什么
- 当前阶段进度

#### 8) Inactivity Replan

Trigger:

- 连续 3 天未学习

Default option:

- 重新安排

Effects:

- 插入复习/补基础
- 拉长周期

#### 9) Unsupported Goal

Purpose:

- 对不在支持范围内的目标保持硬边界

Behavior:

- 直接提示当前暂不支持
- 不做模糊兜底

## 7. Recovery Logic

### User clicks "too hard / not right"

- 整节 `今天一课` 重生成
- 阶段目标保持不变

### User clicks "too hard / not right" twice

Show a short disambiguation:

- 太难 -> 是否拆分成更简单版本的任务
- 节奏太快，我跟不上 -> 放慢节奏
- 目标不对 -> 是否重新调整目标

### User inactive for 3 days

Give 3 options:

- 继续原计划
- 轻量模式
- 重新安排

Default:

- 重新安排

## 8. Milestones

### Milestone 1

- 完成环境搭建
- 跑通基础 Python

### Milestone 2

- 写出一个带假 AI 返回结果的小助手

### Milestone 3

- 在小助手基础上改出 2 个变体

Accepted variants:

- 变体 1: 修改助手的角色与输出风格
- 变体 2: 增加一条输入规则分支

## 9. Technical Plan

### Recommended architecture

- Frontend: Next.js + React
- Backend: Next.js Route Handlers or Server Actions
- Database: PostgreSQL
- AI layer: a thin orchestration layer for goal mapping, lesson generation, and replanning

### Technical principles

- 先做 Web，后续再考虑桌面包装
- 对用户表现为实时生成
- 底层仍应使用受控路径和受控 lesson schema
- 重生成只能改“当前课”，不能漂移阶段目标

### Core entities

- `User`
- `LearningProfile`
- `Goal`
- `PathMapping`
- `Plan`
- `Milestone`
- `Lesson`
- `AtomicTask`
- `Quiz`
- `Progress`
- `FeedbackEvent`
- `ReplanEvent`

### Suggested fields

#### User

- `id`
- `created_at`

#### LearningProfile

- `user_id`
- `current_level`
- `weekly_time_budget`
- `deadline`
- `mbti`
- `preferred_pace`

#### Goal

- `user_id`
- `raw_goal_text`
- `mapped_path`
- `status`

#### Plan

- `id`
- `user_id`
- `goal_id`
- `current_milestone_id`
- `target_end_date`
- `status`

#### Lesson

- `id`
- `plan_id`
- `milestone_id`
- `lesson_date`
- `goal_text`
- `completion_criteria`
- `regeneration_count`

#### AtomicTask

- `id`
- `lesson_id`
- `order_index`
- `title`
- `instructions`
- `estimated_minutes`
- `status`

#### Quiz

- `id`
- `lesson_id`
- `type`
- `question`
- `options`
- `answer`

### API or server actions

- `POST /api/onboarding`
- `POST /api/plan/generate`
- `GET /api/plan/current`
- `POST /api/lesson/start`
- `POST /api/task/complete`
- `POST /api/task/skip`
- `POST /api/lesson/regenerate`
- `POST /api/lesson/quiz-submit`
- `POST /api/plan/replan`

### State transitions

- `onboarding_submitted -> generating -> roadmap_ready`
- `roadmap_ready -> lesson_started`
- `lesson_started -> task_in_progress -> lesson_completed`
- `lesson_started -> regenerate_requested -> regenerated_lesson_ready`
- `inactive -> replan_prompted -> replanned`
- `unsupported_goal -> closed`

### Analytics events

- `onboarding_started`
- `onboarding_submitted`
- `mbti_skipped`
- `plan_generated`
- `goal_unsupported`
- `roadmap_viewed`
- `lesson_started`
- `task_completed`
- `task_skipped`
- `lesson_regenerated`
- `quiz_completed`
- `lesson_completed`
- `replan_prompted`
- `replan_confirmed`
- `milestone_completed`
- `first_deliverable_completed`

## 10. Build Order

### Phase 1

- Fixed path mapping
- Onboarding
- Goal support boundary
- Generating state

### Phase 2

- Roadmap overview
- Today lesson page
- Atomic task progression
- Completion page

### Phase 3

- Regenerate current lesson
- Inactivity replan
- Light MBTI personalization

### Phase 4

- Improve content stability
- Add limited lesson validation
- Tune pacing based on real usage

## 11. Launch Checklist

- 明确首版支持路径和不支持边界
- 跑通首日课程体验
- 验证 `太难/不对` 的重生成链路
- 验证 3 天断更后的重排逻辑
- 埋点覆盖首个核心漏斗
- 招募首批有明确 demo 目标的测试用户

## 12. Open Questions and Risks

- 对外文案更广，但首版支持路径很窄，预期管理风险高
- v1 不做自动校验，会影响“课程靠谱”的信任
- 用户第二天不回来，最可能是第一天新鲜感过去，而不是功能缺失
- 自由输入目标但不预确认映射，可能带来目标理解偏差
- 若后续想加入桌宠，需避免过早干扰 MVP 验证

## 13. Recommendation

MVP 最该优先打透的不是“更炫的 AI 感”或“更强的人格化”，而是两件事:

- 用户第一天真的能跑通结果
- 用户卡住时，系统真的能把今天的任务改到做得动

如果这两件事跑不稳，后续的 MBTI、桌宠、桌面端都会建立在不稳的基础上。
