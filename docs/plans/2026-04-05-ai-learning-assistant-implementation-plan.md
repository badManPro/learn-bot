# AI Learning Assistant MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a greenfield Web MVP for the AI Learning Assistant using one supported path, one guest user model, roadmap generation, today lesson execution, lesson regeneration, and basic progress tracking.

**Architecture:** Use a single Next.js App Router app with SQLite via Prisma, a guest session cookie, and a small server-side AI orchestration layer. Keep the product deterministic by constraining all generation to one supported path and one lesson schema.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Zod, Prisma, SQLite, OpenAI SDK, Vitest, React Testing Library, Playwright

---

## Assumptions

- Repo root is `/Users/casper/Documents/project/test-skills`
- Current repo contains docs only
- v0 has no auth beyond guest cookie
- v0 supports exactly one path: `python_for_ai_workflows`
- v0 does not support real API keys or screenshot debugging

## Task 1: Bootstrap the app shell and tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/lib/routes.ts`
- Test: `tests/unit/app-shell.test.tsx`

**Step 1: Write the failing test**

Create `tests/unit/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

test("renders start CTA", () => {
  render(<HomePage />);
  expect(screen.getByRole("link", { name: /开始/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/app-shell.test.tsx
```

Expected:

- fail because app files and tooling do not exist yet

**Step 3: Write minimal implementation**

Create the root app and route helper:

```ts
// src/lib/routes.ts
export const ROUTES = {
  home: "/",
  onboarding: "/onboarding",
  roadmap: "/roadmap",
} as const;
```

```tsx
// src/app/page.tsx
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function HomePage() {
  return <Link href={ROUTES.onboarding}>开始</Link>;
}
```

Also create package/tooling files for:

- Next.js
- Vitest
- React Testing Library
- Tailwind

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm install
pnpm vitest run tests/unit/app-shell.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git init
git add package.json tsconfig.json next.config.ts postcss.config.mjs tailwind.config.ts eslint.config.mjs .gitignore src/app src/lib/routes.ts tests/unit/app-shell.test.tsx
git commit -m "feat: bootstrap app shell and tooling"
```

## Task 2: Add database schema and guest session infrastructure

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/session.ts`
- Create: `src/lib/env.ts`
- Test: `tests/unit/session.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/session.test.ts`:

```ts
import { getOrCreateGuestUserId } from "@/lib/session";

test("creates and reuses guest user id", async () => {
  const first = await getOrCreateGuestUserId();
  const second = await getOrCreateGuestUserId();
  expect(first).toBe(second);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/session.test.ts
```

Expected:

- FAIL because session and db helpers are not implemented

**Step 3: Write minimal implementation**

Add Prisma models for:

- `User`
- `LearningProfile`
- `Plan`
- `Milestone`
- `Lesson`
- `AtomicTask`
- `Quiz`
- `LessonFeedbackEvent`

Implement session helper:

```ts
export async function getOrCreateGuestUserId(): Promise<string> {
  // read cookie, create uuid if missing, persist cookie
}
```

Implement `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const db = globalThis.__db ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__db = db;
```

**Step 4: Run tests and schema checks**

Run:

```bash
pnpm prisma generate
pnpm prisma db push
pnpm vitest run tests/unit/session.test.ts
```

Expected:

- Prisma client generated
- database schema pushed
- session test PASS

**Step 5: Commit**

```bash
git add prisma src/lib tests/unit/session.test.ts
git commit -m "feat: add prisma schema and guest session"
```

## Task 3: Build onboarding flow with validation

**Files:**
- Create: `src/app/onboarding/page.tsx`
- Create: `src/components/onboarding/onboarding-form.tsx`
- Create: `src/lib/validations/onboarding.ts`
- Create: `src/app/api/onboarding/route.ts`
- Test: `tests/unit/onboarding-schema.test.ts`
- Test: `tests/unit/onboarding-page.test.tsx`

**Step 1: Write the failing tests**

Create schema test:

```ts
import { onboardingSchema } from "@/lib/validations/onboarding";

test("requires goal, current level, weekly time, and deadline", () => {
  const result = onboardingSchema.safeParse({});
  expect(result.success).toBe(false);
});
```

Create page test:

```tsx
import { render, screen } from "@testing-library/react";
import OnboardingPage from "@/app/onboarding/page";

test("renders all required onboarding fields", () => {
  render(<OnboardingPage />);
  expect(screen.getByLabelText(/学习目标/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/当前基础/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/每周可投入时间/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/目标截止时间/i)).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm vitest run tests/unit/onboarding-schema.test.ts tests/unit/onboarding-page.test.tsx
```

Expected:

- FAIL

**Step 3: Write minimal implementation**

Implement Zod schema:

```ts
export const onboardingSchema = z.object({
  goalText: z.string().min(3),
  currentLevel: z.enum(["zero", "some_programming"]),
  weeklyTimeBudgetMinutes: z.coerce.number().min(30),
  targetDeadline: z.string().min(1),
  mbti: z.string().optional().nullable(),
});
```

Implement form page and POST handler that:

- validates request
- gets/creates guest user
- upserts `LearningProfile`
- redirects to plan generation

**Step 4: Run tests**

Run:

```bash
pnpm vitest run tests/unit/onboarding-schema.test.ts tests/unit/onboarding-page.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/app/onboarding src/components/onboarding src/lib/validations src/app/api/onboarding tests/unit
git commit -m "feat: add onboarding flow"
```

## Task 4: Implement supported-goal mapping and unsupported boundary

**Files:**
- Create: `src/lib/ai/goal-mapper.ts`
- Create: `src/app/unsupported/page.tsx`
- Modify: `src/app/api/onboarding/route.ts`
- Test: `tests/unit/goal-mapper.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/goal-mapper.test.ts`:

```ts
import { mapGoal } from "@/lib/ai/goal-mapper";

test("maps python and AI goals to the supported path", async () => {
  const result = await mapGoal("我想学 Python 做 AI 工作流");
  expect(result.supportStatus).toBe("supported");
  expect(result.mappedPath).toBe("python_for_ai_workflows");
});

test("rejects non-programming goals", async () => {
  const result = await mapGoal("我想学钢琴");
  expect(result.supportStatus).toBe("unsupported");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/goal-mapper.test.ts
```

Expected:

- FAIL

**Step 3: Write minimal implementation**

Implement a deterministic mapper first:

```ts
export async function mapGoal(rawGoal: string) {
  const normalized = rawGoal.toLowerCase();
  const supported = /python|ai|llm|agent|automation|workflow|自动化|工作流/.test(normalized);
  if (!supported) {
    return {
      supportStatus: "unsupported",
      mappedPath: null,
      normalizedGoal: null,
      unsupportedReason: "current_goal_unsupported",
    };
  }
  return {
    supportStatus: "supported",
    mappedPath: "python_for_ai_workflows",
    normalizedGoal: rawGoal,
    unsupportedReason: null,
  };
}
```

Update onboarding route:

- call `mapGoal`
- redirect unsupported requests to `/unsupported`

**Step 4: Run tests**

Run:

```bash
pnpm vitest run tests/unit/goal-mapper.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai/goal-mapper.ts src/app/unsupported/page.tsx src/app/api/onboarding/route.ts tests/unit/goal-mapper.test.ts
git commit -m "feat: add goal mapping and unsupported boundary"
```

## Task 5: Generate roadmap and first lesson

**Files:**
- Create: `src/lib/ai/plan-generator.ts`
- Create: `src/lib/ai/lesson-generator.ts`
- Create: `src/app/api/plan/generate/route.ts`
- Create: `src/app/api/plan/current/route.ts`
- Create: `src/app/roadmap/page.tsx`
- Create: `src/components/roadmap/milestone-list.tsx`
- Test: `tests/unit/lesson-schema.test.ts`
- Test: `tests/unit/roadmap-page.test.tsx`

**Step 1: Write the failing tests**

Lesson schema test:

```ts
import { lessonPayloadSchema } from "@/lib/ai/lesson-generator";

test("lesson payload has 2 to 4 tasks and one quiz", () => {
  const result = lessonPayloadSchema.safeParse({
    title: "Day 1",
    whyItMatters: "Python is the base for later AI workflows.",
    completionCriteria: "Run hello world",
    tasks: [{ title: "A", instructions: "B", estimatedMinutes: 10 }],
    quiz: { kind: "single_choice", question: "Q", options: ["A"], correctAnswer: "A" },
  });
  expect(result.success).toBe(true);
});
```

Roadmap page test:

```tsx
import { render, screen } from "@testing-library/react";
import RoadmapPage from "@/app/roadmap/page";

test("shows 3 milestones", () => {
  render(<RoadmapPage />);
  expect(screen.getAllByTestId("milestone-card")).toHaveLength(3);
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm vitest run tests/unit/lesson-schema.test.ts tests/unit/roadmap-page.test.tsx
```

Expected:

- FAIL

**Step 3: Write minimal implementation**

Implement lesson schema:

```ts
export const lessonPayloadSchema = z.object({
  title: z.string(),
  whyItMatters: z.string(),
  completionCriteria: z.string(),
  tasks: z.array(
    z.object({
      title: z.string(),
      instructions: z.string(),
      estimatedMinutes: z.number().min(10).max(15),
    }),
  ).min(2).max(4),
  quiz: z.object({
    kind: z.enum(["single_choice", "true_false"]),
    question: z.string(),
    options: z.array(z.string()).min(2),
    correctAnswer: z.string(),
  }),
});
```

Implement deterministic v0 generators:

- always create 3 milestones
- always create first lesson for day 1
- persist milestones and lesson rows

**Step 4: Run tests**

Run:

```bash
pnpm vitest run tests/unit/lesson-schema.test.ts tests/unit/roadmap-page.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai src/app/api/plan src/app/roadmap src/components/roadmap tests/unit
git commit -m "feat: generate roadmap and first lesson"
```

## Task 6: Build the Today Lesson page and atomic task progression

**Files:**
- Create: `src/app/lesson/[lessonId]/page.tsx`
- Create: `src/components/lesson/lesson-shell.tsx`
- Create: `src/components/lesson/task-card.tsx`
- Create: `src/components/lesson/quiz-card.tsx`
- Create: `src/app/api/task/complete/route.ts`
- Create: `src/app/api/task/skip/route.ts`
- Test: `tests/unit/lesson-page.test.tsx`
- Test: `tests/unit/task-progression.test.ts`

**Step 1: Write the failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import LessonPage from "@/app/lesson/[lessonId]/page";

test("shows completion criteria before lesson content", () => {
  render(<LessonPage params={{ lessonId: "lesson_1" }} />);
  expect(screen.getByText(/完成标准/i)).toBeInTheDocument();
});
```

```ts
import { getNextVisibleTaskIndex } from "@/lib/domain/progress";

test("advances to the next task after completion or skip", () => {
  expect(getNextVisibleTaskIndex([true, false, false])).toBe(1);
});
```

**Step 2: Run tests**

Run:

```bash
pnpm vitest run tests/unit/lesson-page.test.tsx tests/unit/task-progression.test.ts
```

Expected:

- FAIL

**Step 3: Write minimal implementation**

Implement lesson page rules:

- render completion criteria first
- render first task immediately
- show one short `why this matters today`
- keep explanation collapsed by default
- render 2 to 4 tasks
- skip moves directly to next task

Implement progress helper:

```ts
export function getNextVisibleTaskIndex(completed: boolean[]) {
  return completed.findIndex((done) => !done);
}
```

**Step 4: Run tests**

Run:

```bash
pnpm vitest run tests/unit/lesson-page.test.tsx tests/unit/task-progression.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/app/lesson src/components/lesson src/app/api/task tests/unit
git commit -m "feat: add lesson page and task progression"
```

## Task 7: Add quiz completion and lesson completion page

**Files:**
- Create: `src/app/lesson/[lessonId]/complete/page.tsx`
- Create: `src/app/api/lesson/quiz-submit/route.ts`
- Create: `src/lib/domain/progress.ts`
- Test: `tests/unit/quiz-submit.test.ts`
- Test: `tests/unit/completion-page.test.tsx`

**Step 1: Write the failing tests**

```ts
import { submitQuizAnswer } from "@/lib/domain/progress";

test("marks lesson complete when quiz answer is correct", async () => {
  const result = await submitQuizAnswer({
    lessonId: "lesson_1",
    answer: "A",
  });
  expect(result.status).toBe("correct");
});
```

```tsx
import { render, screen } from "@testing-library/react";
import LessonCompletePage from "@/app/lesson/[lessonId]/complete/page";

test("shows completed work and milestone progress", () => {
  render(<LessonCompletePage params={{ lessonId: "lesson_1" }} />);
  expect(screen.getByText(/当前阶段进度/i)).toBeInTheDocument();
});
```

**Step 2: Run tests**

Run:

```bash
pnpm vitest run tests/unit/quiz-submit.test.ts tests/unit/completion-page.test.tsx
```

Expected:

- FAIL

**Step 3: Write minimal implementation**

Implement:

- quiz answer verification
- lesson status update to `completed`
- completion page with:
  - what was completed today
  - milestone progress

**Step 4: Run tests**

Run:

```bash
pnpm vitest run tests/unit/quiz-submit.test.ts tests/unit/completion-page.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/app/lesson/[lessonId]/complete src/app/api/lesson/quiz-submit src/lib/domain/progress.ts tests/unit
git commit -m "feat: add lesson completion flow"
```

## Task 8: Implement lesson regeneration and user feedback handling

**Files:**
- Create: `src/lib/ai/lesson-regenerator.ts`
- Create: `src/app/api/lesson/regenerate/route.ts`
- Create: `src/components/lesson/regeneration-banner.tsx`
- Test: `tests/unit/lesson-regenerator.test.ts`
- Test: `tests/unit/regeneration-banner.test.tsx`

**Step 1: Write the failing tests**

```ts
import { regenerateLesson } from "@/lib/ai/lesson-regenerator";

test("keeps milestone goal but simplifies lesson when too hard", async () => {
  const result = await regenerateLesson({
    lessonId: "lesson_1",
    reason: "too_hard",
    regenerationCount: 0,
  });
  expect(result.changeSummary).toMatch(/简化任务|补充前置知识/);
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { RegenerationBanner } from "@/components/lesson/regeneration-banner";

test("shows simplification message", () => {
  render(<RegenerationBanner message="已为你简化任务" />);
  expect(screen.getByText(/已为你简化任务/i)).toBeInTheDocument();
});
```

**Step 2: Run tests**

Run:

```bash
pnpm vitest run tests/unit/lesson-regenerator.test.ts tests/unit/regeneration-banner.test.tsx
```

Expected:

- FAIL

**Step 3: Write minimal implementation**

Implement `regenerateLesson()` with hard constraints:

- same milestone
- easier task wording
- smaller task count or task scope
- optional added foundation explanation

Persist a `LessonFeedbackEvent` row for every regeneration reason.

**Step 4: Run tests**

Run:

```bash
pnpm vitest run tests/unit/lesson-regenerator.test.ts tests/unit/regeneration-banner.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai/lesson-regenerator.ts src/app/api/lesson/regenerate src/components/lesson/regeneration-banner.tsx tests/unit
git commit -m "feat: add lesson regeneration flow"
```

## Task 9: Implement inactivity replan and light MBTI pacing

**Files:**
- Create: `src/app/replan/page.tsx`
- Create: `src/app/api/plan/replan/route.ts`
- Create: `src/lib/domain/replan.ts`
- Modify: `src/lib/ai/plan-generator.ts`
- Modify: `src/lib/ai/lesson-generator.ts`
- Test: `tests/unit/replan.test.ts`
- Test: `tests/unit/pace-mode.test.ts`

**Step 1: Write the failing tests**

```ts
import { buildReplanResult } from "@/lib/domain/replan";

test("default replan inserts review work and extends schedule", () => {
  const result = buildReplanResult({
    mode: "rearrange",
    reason: "inactive",
  });
  expect(result.insertReviewLesson).toBe(true);
  expect(result.extendScheduleDays).toBeGreaterThan(0);
});
```

```ts
import { derivePaceMode } from "@/lib/domain/replan";

test("maps mbti and weekly budget to a pace mode", () => {
  expect(derivePaceMode({ mbti: "INFP", weeklyTimeBudgetMinutes: 120 })).toBeDefined();
});
```

**Step 2: Run tests**

Run:

```bash
pnpm vitest run tests/unit/replan.test.ts tests/unit/pace-mode.test.ts
```

Expected:

- FAIL

**Step 3: Write minimal implementation**

Implement:

- replan options:
  - continue
  - light
  - rearrange
- default recommendation is `rearrange`
- `rearrange` inserts review and extends schedule
- MBTI affects only:
  - task granularity
  - pace

Do not let MBTI change the milestone structure.

**Step 4: Run tests**

Run:

```bash
pnpm vitest run tests/unit/replan.test.ts tests/unit/pace-mode.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/app/replan src/app/api/plan/replan src/lib/domain/replan.ts src/lib/ai/plan-generator.ts src/lib/ai/lesson-generator.ts tests/unit
git commit -m "feat: add replan flow and light mbti pacing"
```

## Task 10: Add end-to-end smoke coverage and finish docs

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/onboarding-to-roadmap.spec.ts`
- Create: `tests/e2e/lesson-regeneration.spec.ts`
- Modify: `README.md`

**Step 1: Write the failing E2E test**

Create `tests/e2e/onboarding-to-roadmap.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("user can complete onboarding and reach roadmap", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("学习目标").fill("我想学 Python 做 AI 工作流");
  await page.getByLabel("当前基础").selectOption("zero");
  await page.getByLabel("每周可投入时间").fill("240");
  await page.getByLabel("目标截止时间").fill("2026-05-05");
  await page.getByRole("button", { name: /开始/i }).click();
  await expect(page).toHaveURL(/roadmap/);
});
```

**Step 2: Run E2E to verify it fails**

Run:

```bash
pnpm playwright test tests/e2e/onboarding-to-roadmap.spec.ts
```

Expected:

- FAIL until the full app flow is wired correctly

**Step 3: Write missing glue code**

Add any remaining wiring for:

- redirects
- guest cookie persistence
- roadmap render after onboarding
- lesson regeneration button path

Add `README.md` with:

- stack
- setup
- env vars
- run commands

**Step 4: Run full verification**

Run:

```bash
pnpm vitest run
pnpm playwright test
```

Expected:

- all unit tests PASS
- all E2E smoke tests PASS

**Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e README.md
git commit -m "test: add e2e smoke coverage and project docs"
```

## Verification Commands

Run these before claiming the MVP works:

```bash
pnpm prisma generate
pnpm prisma db push
pnpm vitest run
pnpm playwright test
pnpm next build
```

Expected:

- Prisma generation succeeds
- schema pushes cleanly
- unit and E2E tests pass
- production build succeeds

## Notes for the Implementer

- Do not broaden supported paths in v0
- Do not add desktop shell work
- Keep unsupported goals as hard rejects
- Keep regeneration scoped to the current lesson
- Keep MBTI light; it is not a second planning engine
- If AI output becomes unstable, replace freeform generation with hardcoded templates before adding new features

## Handoff

Plan complete and saved to `docs/plans/2026-04-05-ai-learning-assistant-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints
