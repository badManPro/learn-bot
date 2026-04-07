# Findings & Decisions

## Requirements
- Build the AI Learning Assistant MVP from the provided docs, progressing task-by-task through the implementation plan.
- Keep the v0 scope constrained to a single supported path: `python_for_ai_workflows`.
- Use Next.js App Router, TypeScript, Tailwind CSS, Zod, Prisma, SQLite, OpenAI SDK, Vitest, React Testing Library, and Playwright.
- Implement guest-session persistence via a `guest_user_id` cookie.

## Research Findings
- The tech spec is frozen for v0 and explicitly says it exists to make the product spec implementable with minimal guessing.
- The implementation plan assumes the repo currently contains docs only, which matches the workspace state.
- The domain model, AI contracts, API contracts, and target file structure are already defined in the tech spec.
- The design doc still marks open risks, but they are product risks rather than blockers for Task 1 to Task 3.
- Task 1 succeeded with a minimal Next.js plus Vitest setup, and the homepage CTA test now passes.
- Task 2 session unit test passes after adding `session.ts`, `db.ts`, `env.ts`, and `schema.prisma`.
- `pnpm prisma validate` succeeds, but `pnpm prisma db push` fails with a blank `Schema engine error`.
- The same `db push` failure reproduces against a temporary one-model schema in `/tmp`, which points away from the app schema and toward the local Prisma runtime environment.
- Prisma's official system requirements say current versions support LTS Node lines and do not recommend odd-numbered "Current" releases; this machine is on Node `23.10.0`.
- Installing Node 22 and running the toolchain with `/opt/homebrew/opt/node@22/bin` removes the runtime-version ambiguity, but `prisma db push` still fails locally.
- Prisma can still generate correct SQL with `migrate diff`, and `prisma db execute` successfully applies that SQL to `prisma/dev.db`.
- Task 3 is now in place: onboarding schema validation, onboarding page, form component, and the onboarding POST route.
- Task 4 to Task 6 require only deterministic logic; no external AI call is needed for this batch because the spec allows a single supported path and structured lesson payloads.
- The current onboarding route already creates or updates the `LearningProfile`, so Task 4 only needs to add goal mapping and route branching.
- The Prisma schema already contains all tables needed for Task 5 and Task 6 persistence: `Plan`, `Milestone`, `Lesson`, `AtomicTask`, and `Quiz`.
- The repo currently has user-created planning files untracked and a generated `next-env.d.ts` modification, so edits should avoid reverting unrelated workspace state.
- Task 4 is complete: goal mapping is now deterministic, unsupported goals branch to `/unsupported`, and onboarding persists `goalPath` only when the goal matches the single supported path.
- Task 5 is complete: deterministic roadmap and first-lesson generators now exist, `/api/plan/generate` and `/api/plan/current` can bootstrap or return the active plan, and the roadmap page renders the expected 3-milestone overview.
- Task 6 is complete: the lesson page now renders a Today Lesson shell with completion criteria first, task progression is encoded in `getNextVisibleTaskIndex`, and task complete/skip APIs return the next visible task index while marking the lesson complete when all tasks are done.
- The repo had a pre-existing verification blocker in `eslint.config.mjs`; it required a flat-config rewrite plus a Next 15 dynamic-route `params: Promise<...>` fix before `pnpm lint` and `pnpm build` could pass.
- The working tree is currently clean and `main` is aligned with `origin/main`, so Task 7 can start from a stable base.
- Task 7 can reuse the existing `Lesson`, `AtomicTask`, and `Quiz` Prisma models without schema changes.
- There is a behavior gap between the current code and the Task 7 plan: `src/app/api/task/complete/route.ts` and `src/app/api/task/skip/route.ts` mark a lesson as `completed` when all tasks are done, but the implementation plan says lesson completion should happen only after a correct quiz answer.
- The current lesson page already renders a quiz card, so Task 7 mainly needs submission handling, correctness evaluation, and a dedicated completion page.
- Task 7 is complete: quiz submission now lives in `/api/lesson/quiz-submit`, correct answers transition the lesson to `completed`, and `/lesson/[lessonId]/complete` shows completed work plus milestone progress.
- Task completion and skip routes now only advance progression; they no longer close the lesson before the quiz is answered correctly.
- `main` is now one commit ahead of `origin/main` with `feat: add lesson completion flow`, so Task 8 starts from a clean, committed base.
- Task 8 can reuse the existing `Lesson.regenerationCount`, `Lesson.generatedFromReason`, and `LessonFeedbackEvent` schema fields without introducing any schema changes.
- The current lesson UI has no regeneration entry point yet, but `LessonShell` has a clear insertion point above the task list for a lightweight feedback banner.
- The smallest Task 8-complete shape is: a server helper that simplifies the current lesson, an API route that triggers it, and a banner component that can display the simplification message.
- Task 8 is complete: `src/lib/ai/lesson-regenerator.ts` now simplifies the current lesson in place, persists a `LessonFeedbackEvent`, increments `regenerationCount`, and preserves the original `milestoneId`.
- `/api/lesson/regenerate` now accepts `lessonId`, `reason`, and `regenerationCount`, returning the simplification summary for the caller.
- `RegenerationBanner` now exists as a dedicated lesson UI primitive, and `LessonShell` can render it when a regeneration message is present.
- `main` is now two commits ahead of `origin/main` after Task 7 and Task 8 commits, so Task 9 starts from a clean committed base as well.
- Task 9 can reuse the existing `LearningProfile.paceMode`, `Plan.daysInactiveCount`, and `Plan.targetEndDate` fields without any Prisma schema changes.
- The current code stores `mbti` and weekly time budget on the learning profile, but pace is still hard-coded to `default`; Task 9 needs to derive and use that field instead of treating it as inert metadata.
- The smallest Task 9-complete shape is: a deterministic `replan` domain helper, a `/replan` page that surfaces the options, a `/api/plan/replan` route that applies the chosen mode, and lesson generation that adapts task granularity by `paceMode`.
- Task 9 is complete: `src/lib/domain/replan.ts` now derives `paceMode` from MBTI and weekly time, and computes deterministic continue/light/rearrange outcomes.
- `src/lib/ai/plan-generator.ts` now resolves an effective pace mode before generating the first lesson, but still keeps the roadmap fixed at 3 milestones.
- `src/lib/ai/lesson-generator.ts` now changes only task granularity and load by pace mode: `lighter` compresses the work, `slower` breaks it into more smaller tasks, and `default` keeps the original shape.
- `/api/plan/replan` now applies the chosen replan result to the active plan and learning profile, and `/replan` exposes the option set in the UI.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Execute Tasks 1 to 3 before pausing for review | Follows the executing-plans default batch size |
| Use planning files in repo root during implementation | Required by the planning-with-files workflow for long tasks |
| Treat design risk notes as non-blocking for engineering start | They do not leave core API or schema behavior undefined |
| Keep the dependency lockfile under version control | It stabilizes the greenfield setup across future runs |
| Do not mutate the Prisma schema further until the runtime issue is resolved | The failure reproduces with a minimal schema, so more schema edits would be guesswork |
| Add `.nvmrc` and a Node engine constraint | Future runs should start on a supported runtime instead of rediscovering the version mismatch |
| Accept a Prisma bootstrap workaround for local development | It unblocks product work while keeping schema generation inside Prisma tooling |
| Execute Task 4 to Task 6 as a single second batch | The implementation plan is explicitly batched in groups of three tasks |
| Use deterministic generators instead of live model calls in this batch | The frozen spec emphasizes predictable single-path v0 behavior and accepts constrained generation |
| Start Task 7 from the current post-Batch-2 codebase instead of rewriting the lesson flow | The existing lesson shell, quiz card, and progress helper already provide the right scaffold |
| Move lesson completion responsibility to quiz submission while keeping task progression separate | This aligns the live code with the written Task 7 contract |
| Keep the Task 7 completion page server-rendered from a progress-domain helper | The page only needs persisted lesson, task, and milestone summary data and does not require client state for v0 |
| Regenerate the current lesson in place for Task 8 | The schema already has regeneration metadata, and in-place mutation is the smallest way to simplify content while preserving milestone continuity |
| Preserve the quiz and milestone framing while reducing task scope | The plan says the regenerated lesson must stay on the same milestone and become easier to execute |
| Keep Task 8 stateless at the page layer for now | The implementation plan requires regeneration logic and messaging, not a fully wired client workflow in this batch |
| Keep Task 9 focused on deterministic replan math and pacing rules | The implementation plan only asks for continue/light/rearrange options and light MBTI effects |
| Reuse `paceMode` as the single pacing switch across onboarding, plan generation, and lessons | This avoids introducing a second parallel pacing concept |
| Keep `replan` persistence lightweight in Task 9 | Updating the active plan deadline and profile pace mode is enough to satisfy the current batch without inventing a full review-lesson scheduler |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| `git status` failed because the repo is not initialized | Accept as expected; Task 1 includes `git init` |
| `pnpm install` could not reach the registry in sandbox | Re-ran the install with approved escalated network access |
| Prisma schema engine fails during `db push` with no detail | Confirmed schema validity and reproduced the failure with a minimal schema to isolate the issue to environment/runtime |
| `db push` still fails after installing Node 22 | Used `prisma migrate diff --script -o ...` and `prisma db execute --file ...` to initialize the SQLite schema |

## Resources
- `/Users/casper/Documents/project/test-skills/docs/plans/2026-04-05-ai-learning-assistant-tech-spec.md`
- `/Users/casper/Documents/project/test-skills/docs/plans/2026-04-05-ai-learning-assistant-implementation-plan.md`
- `/Users/casper/Documents/project/test-skills/docs/plans/2026-04-05-ai-learning-assistant-design.md`
- `/Users/casper/Documents/project/test-skills/tests/unit/app-shell.test.tsx`
- [Prisma system requirements](https://docs.prisma.io/docs/orm/reference/system-requirements)
- `/Users/casper/Documents/project/test-skills/src/app/api/onboarding/route.ts`
- `/Users/casper/Documents/project/test-skills/src/lib/validations/onboarding.ts`
- `/Users/casper/Documents/project/test-skills/prisma/schema.prisma`
- `/Users/casper/Documents/project/test-skills/src/lib/session.ts`

## Visual/Browser Findings
- No browser or image inputs used in this task so far.

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
