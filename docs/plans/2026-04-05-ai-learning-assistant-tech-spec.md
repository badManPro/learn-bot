# AI Learning Assistant MVP Tech Spec

Status: Frozen for v0
Date: 2026-04-05
Reference: `docs/plans/2026-04-05-ai-learning-assistant-design.md`

## 1. Goal

Build a web MVP that helps a zero-background learner start a `Python for AI` path, follow a daily lesson with near-zero decision cost, and reach a first 30-day deliverable:

- a fake-AI command-line helper
- plus 2 small variants

This document exists to make the product spec implementable by AI with minimal guessing.

## 2. Scope Freeze

### v0 supported path

Only one learning path is supported in code:

- `python_for_ai_workflows`

This path covers:

- Python basics for AI-oriented beginners
- fake-AI CLI helper
- simple automation mindset

### v0 unsupported

- non-programming goals
- multiple learning tracks
- real API key integration
- desktop app
- screenshot-based debugging
- community features
- deep personality system

### Hard product boundaries

- If the input goal cannot be mapped to `python_for_ai_workflows`, return `unsupported`
- Do not silently create a fake custom plan for unsupported goals
- Regeneration can simplify the current lesson, but cannot change the current milestone target

## 3. Implementation Decisions

### Tech stack

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Validation: Zod
- ORM: Prisma
- Database: SQLite for v0
- AI SDK: OpenAI Node SDK
- Testing:
  - Vitest
  - React Testing Library
  - Playwright

### Why SQLite for v0

The product spec originally leaned toward PostgreSQL. For AI-first implementation in an empty repo, SQLite removes infrastructure friction and speeds up iteration. The schema must stay simple enough to migrate to PostgreSQL later.

### Auth model

No full auth in v0.

Use a guest session cookie:

- create a `guest_user_id` cookie on first onboarding submit
- create one `User` row and one `LearningProfile` row
- all later reads and writes resolve from that cookie

This keeps persistence without blocking MVP on auth.

## 4. Supported Goal Mapping

### Mapping target

All supported goals map to:

- `python_for_ai_workflows`

### Supported examples

- 我想学 Python 做 AI 应用
- 我想入门 AI 自动化
- 我想做一个 AI 工作流 demo
- 我完全不会编程，想学 AI
- 我想学 Python 为以后做 agent 打基础

### Unsupported examples

- 我想学钢琴
- 我想学画画
- 我想做设计作品集
- 我想练英语口语

### Goal-mapping rules

Map to `python_for_ai_workflows` when the raw goal includes one or more of:

- `python`
- `ai`
- `llm`
- `agent`
- `chatbot`
- `automation`
- `workflow`
- `script`
- `自动化`
- `工作流`
- `ai 应用`

Return `unsupported` when:

- the goal is clearly non-programming
- the goal is too vague to connect to programming or AI

## 5. User Flow

### Primary flow

1. User lands on onboarding
2. User enters:
   - goal
   - current level
   - weekly time budget
   - target deadline
3. User optionally selects MBTI
4. App creates or reuses guest user
5. App maps goal to supported path
6. If supported, app generates:
   - current plan
   - roadmap overview
   - first lesson
7. User sees 3 milestone roadmap
8. User starts today lesson
9. User completes 2 to 4 atomic tasks
10. User passes 1 short quiz question
11. App records lesson completion and shows progress

### Recovery flow

- User clicks `太难/不对`
- App regenerates the entire current lesson with simpler task breakdown
- If user clicks it twice in a row, app asks one short reason:
  - too hard
  - pace too fast
  - wrong goal
- Then app applies a constrained replan action

### Inactivity flow

- If 3 days pass without lesson completion, show replan prompt
- Default recommendation is `重新安排`
- Replan means:
  - insert review/foundation work
  - extend schedule

## 6. Routes

### Pages

- `/`
  - redirect to `/onboarding` if no active plan
  - redirect to `/roadmap` if active plan exists
- `/onboarding`
- `/roadmap`
- `/lesson/[lessonId]`
- `/lesson/[lessonId]/complete`
- `/unsupported`
- `/replan`

### API routes

- `POST /api/onboarding`
- `POST /api/plan/generate`
- `GET /api/plan/current`
- `POST /api/lesson/regenerate`
- `POST /api/task/complete`
- `POST /api/task/skip`
- `POST /api/lesson/quiz-submit`
- `POST /api/plan/replan`

## 7. Page-Level Acceptance Criteria

### `/onboarding`

Must:

- render the 4 required inputs
- allow optional MBTI selection
- validate required fields
- create guest session on submit
- call plan generation flow
- redirect to `/roadmap` on success

### `/roadmap`

Must:

- show exactly 3 milestones
- show one visible outcome per milestone
- show current milestone status
- show primary CTA `开始今天一课`
- allow editing weekly time budget and deadline

Must not:

- expose daily calendar detail
- expose unsupported learning paths

### `/lesson/[lessonId]`

Must:

- show lesson completion criteria first
- show first atomic task immediately
- show one short `why this matters today` sentence
- keep explanation collapsed by default
- render 2 to 4 atomic tasks
- allow skipping the current task
- allow `太难/不对` regeneration

### `/lesson/[lessonId]/complete`

Must:

- show what was completed today
- show current milestone progress
- stop the default learning flow for the day

### `/unsupported`

Must:

- clearly say the current goal is unsupported
- not pretend to generate a plan

## 8. Domain Model

### Enums

```ts
type GoalPath = "python_for_ai_workflows";

type GoalSupportStatus = "supported" | "unsupported";

type CurrentLevel = "zero" | "some_programming";

type LessonStatus = "pending" | "active" | "completed" | "archived";

type TaskStatus = "pending" | "completed" | "skipped";

type ReplanReason = "too_hard" | "pace_too_fast" | "wrong_goal" | "inactive";

type PaceMode = "default" | "lighter" | "slower";
```

### Tables

#### `User`

- `id: string`
- `createdAt: datetime`

#### `LearningProfile`

- `id: string`
- `userId: string`
- `currentLevel: CurrentLevel`
- `weeklyTimeBudgetMinutes: number`
- `targetDeadline: date`
- `mbti: string | null`
- `paceMode: PaceMode`
- `goalText: string`
- `goalPath: GoalPath | null`

#### `Plan`

- `id: string`
- `userId: string`
- `goalPath: GoalPath`
- `status: "active" | "completed"`
- `targetStartDate: date`
- `targetEndDate: date`
- `currentMilestoneIndex: number`
- `daysInactiveCount: number`

#### `Milestone`

- `id: string`
- `planId: string`
- `index: number`
- `title: string`
- `outcome: string`
- `status: "pending" | "active" | "completed"`

#### `Lesson`

- `id: string`
- `planId: string`
- `milestoneId: string`
- `dayIndex: number`
- `title: string`
- `whyItMatters: string`
- `completionCriteria: string`
- `status: LessonStatus`
- `regenerationCount: number`
- `generatedFromReason: ReplanReason | null`
- `createdAt: datetime`

#### `AtomicTask`

- `id: string`
- `lessonId: string`
- `orderIndex: number`
- `title: string`
- `instructions: string`
- `estimatedMinutes: number`
- `status: TaskStatus`

#### `Quiz`

- `id: string`
- `lessonId: string`
- `kind: "single_choice" | "true_false"`
- `question: string`
- `optionsJson: string`
- `correctAnswer: string`

#### `LessonFeedbackEvent`

- `id: string`
- `lessonId: string`
- `reason: ReplanReason`
- `createdAt: datetime`

## 9. AI Contracts

All AI outputs must be parsed into Zod-validated JSON. No freeform parsing in page code.

### 9.1 Goal Mapping Contract

#### Input

```ts
type GoalMappingInput = {
  rawGoal: string;
};
```

#### Output

```ts
type GoalMappingResult = {
  supportStatus: "supported" | "unsupported";
  mappedPath: "python_for_ai_workflows" | null;
  normalizedGoal: string | null;
  unsupportedReason: string | null;
};
```

### 9.2 Plan Generation Contract

#### Input

```ts
type PlanGenerationInput = {
  goalPath: "python_for_ai_workflows";
  goalText: string;
  currentLevel: "zero" | "some_programming";
  weeklyTimeBudgetMinutes: number;
  targetDeadline: string;
  mbti?: string | null;
  paceMode: "default" | "lighter" | "slower";
};
```

#### Output

```ts
type PlanGenerationOutput = {
  milestones: Array<{
    index: number;
    title: string;
    outcome: string;
  }>;
  firstLesson: LessonPayload;
};
```

### 9.3 Lesson Generation Contract

#### Output

```ts
type LessonPayload = {
  title: string;
  whyItMatters: string;
  completionCriteria: string;
  tasks: Array<{
    title: string;
    instructions: string;
    estimatedMinutes: number;
  }>;
  quiz: {
    kind: "single_choice" | "true_false";
    question: string;
    options: string[];
    correctAnswer: string;
  };
};
```

### 9.4 Lesson Generation Constraints

- 2 to 4 tasks only
- each task 10 to 15 minutes
- one short sentence for `whyItMatters`
- one quiz only
- no real API key requirement
- no paid external tooling
- no multi-file project explosion
- stay inside current milestone objective

### 9.5 Lesson Regeneration Contract

#### Input

```ts
type LessonRegenerationInput = {
  lessonId: string;
  reason: "too_hard" | "pace_too_fast" | "wrong_goal";
  regenerationCount: number;
};
```

#### Output

```ts
type LessonRegenerationOutput = {
  changeSummary: string;
  lesson: LessonPayload;
};
```

### 9.6 Replan Rules

- `too_hard`
  - keep milestone goal
  - split task difficulty down
  - optionally inject missing foundation explanation
- `pace_too_fast`
  - reduce lesson density
  - extend remaining schedule
- `wrong_goal`
  - route user back to onboarding edit state

## 10. API Contracts

### `POST /api/onboarding`

#### Request

```json
{
  "goalText": "我想学 Python 做 AI 应用",
  "currentLevel": "zero",
  "weeklyTimeBudgetMinutes": 240,
  "targetDeadline": "2026-05-05",
  "mbti": "INFP"
}
```

#### Response

```json
{
  "status": "ok",
  "redirectTo": "/roadmap"
}
```

### `POST /api/plan/generate`

#### Response

```json
{
  "status": "ok",
  "planId": "plan_123",
  "currentLessonId": "lesson_123"
}
```

### `GET /api/plan/current`

#### Response

```json
{
  "plan": {
    "id": "plan_123",
    "goalPath": "python_for_ai_workflows",
    "currentMilestoneIndex": 1
  },
  "milestones": [
    { "index": 1, "title": "Setup Python", "outcome": "Run basic Python locally" }
  ],
  "currentLessonId": "lesson_123"
}
```

### `POST /api/lesson/regenerate`

#### Request

```json
{
  "lessonId": "lesson_123",
  "reason": "too_hard"
}
```

#### Response

```json
{
  "status": "ok",
  "changeSummary": "已为你简化任务并补充前置知识",
  "lessonId": "lesson_123"
}
```

### `POST /api/task/complete`

#### Request

```json
{
  "taskId": "task_123"
}
```

### `POST /api/task/skip`

#### Request

```json
{
  "taskId": "task_123"
}
```

### `POST /api/lesson/quiz-submit`

#### Request

```json
{
  "lessonId": "lesson_123",
  "answer": "B"
}
```

#### Response

```json
{
  "status": "correct",
  "redirectTo": "/lesson/lesson_123/complete"
}
```

### `POST /api/plan/replan`

#### Request

```json
{
  "reason": "inactive",
  "mode": "rearrange"
}
```

## 11. File Structure

```text
docs/plans/
prisma/
  schema.prisma
  seed.ts
src/
  app/
    page.tsx
    onboarding/page.tsx
    roadmap/page.tsx
    lesson/[lessonId]/page.tsx
    lesson/[lessonId]/complete/page.tsx
    unsupported/page.tsx
    replan/page.tsx
    api/
      onboarding/route.ts
      plan/generate/route.ts
      plan/current/route.ts
      lesson/regenerate/route.ts
      lesson/quiz-submit/route.ts
      task/complete/route.ts
      task/skip/route.ts
      plan/replan/route.ts
  components/
    onboarding/
    roadmap/
    lesson/
    shared/
  lib/
    db.ts
    session.ts
    validations/
    ai/
      client.ts
      goal-mapper.ts
      plan-generator.ts
      lesson-generator.ts
      lesson-regenerator.ts
    domain/
      progress.ts
      replan.ts
tests/
  unit/
  e2e/
```

## 12. Analytics

- `onboarding_started`
- `onboarding_submitted`
- `mbti_skipped`
- `goal_unsupported`
- `plan_generated`
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

## 13. Testing Strategy

### Unit

- goal mapping rules
- lesson schema validation
- replan rules
- pace adjustment logic

### Integration

- onboarding submit creates guest user and plan
- unsupported goal redirects correctly
- lesson regenerate replaces lesson content but preserves milestone
- quiz completion marks lesson complete

### E2E

- zero-background user can onboard and reach roadmap
- user can start first lesson and complete first task
- user can trigger lesson regeneration

## 14. Open Risks

- no automatic code validation in v0 means trust risk remains
- only one supported path means expectation management is critical
- free goal input without confirmation may still create mismatch frustration

## 15. Recommended Next Step

Implement v0 against this spec first. Do not add:

- desktop shell
- real API integration
- screenshot debugging
- extra paths

until the basic daily lesson loop is stable.
