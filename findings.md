# Findings & Decisions

## 2026-04-08 Product Direction Findings
- The current product is still architected around a frozen MVP spec that supports exactly one path, `python_for_ai_workflows`, and explicitly excludes desktop app support and real API-key integration.
- The current goal mapping path is deterministic keyword matching in [src/lib/ai/goal-mapper.ts](/Users/casper/Documents/try/learn-bot/src/lib/ai/goal-mapper.ts), not model-based intent understanding.
- The current roadmap and first-lesson generation path is deterministic and hardcoded in [src/lib/ai/plan-generator.ts](/Users/casper/Documents/try/learn-bot/src/lib/ai/plan-generator.ts) and [src/lib/ai/lesson-generator.ts](/Users/casper/Documents/try/learn-bot/src/lib/ai/lesson-generator.ts).
- The current lesson regeneration flow is also deterministic simplification, not model-driven regeneration, in [src/lib/ai/lesson-regenerator.ts](/Users/casper/Documents/try/learn-bot/src/lib/ai/lesson-regenerator.ts).
- The project already includes the `openai` SDK dependency and an optional `OPENAI_API_KEY`, but there is no live model call wired anywhere in `src/`.
- OpenAI's current API authentication docs state that the OpenAI API uses API keys and that keys must not be exposed in client-side code or apps. Source: [API Overview - Authentication](https://developers.openai.com/api/reference/overview#authentication).
- OpenAI's current Apps SDK authentication docs describe OAuth 2.1 for ChatGPT acting as the client against your MCP server, which is not the same thing as using ChatGPT/OpenAI account login as the identity system for your own Electron app. Source: [Apps SDK - Authentication](https://developers.openai.com/apps-sdk/build/auth).
- Updated product assumption after user clarification: the target auth UX should mirror Codex CLI, using a browser-based ChatGPT / OpenAI login with workspace selection and local credential restoration in the desktop app.
- Inference from the official sources reviewed: OpenAI officially documents this experience for Codex CLI, which validates the UX pattern; the exact third-party integration surface still needs implementation-time validation, so the plan treats it as a required external capability rather than replacing it with product-owned auth.
- For an AI-native learning product, prompt engineering alone is insufficient. The product needs structured outputs, domain-specific constraints, evals, and application-side validation before content reaches the UI.

## Recommended Direction
- Replace the current single-shot deterministic generator with a staged generation pipeline: domain classification -> learner model -> roadmap generation -> lesson generation -> critique/eval -> persistence.
- Use structured JSON outputs as the contract between the model and UI. The model should generate content into typed schemas, and the renderer should never parse free-form prose heuristically.
- Introduce domain packs instead of templates: each pack defines ontology, difficulty ladders, milestone patterns, skill prerequisites, safety rules, and acceptable task types for one field such as Python, piano, or drawing.
- Keep model calls on a backend you control, even after moving the shell to Electron. The desktop app should authenticate to your backend; your backend should call OpenAI.
- Treat auth and billing/entitlement as product-owned concerns. Do not block architecture on an assumed ChatGPT-login identity flow that is not documented for this use case.
- A concrete rebuild plan has been added at `docs/plans/2026-04-08-ai-native-multi-domain-rebuild-plan.md`, covering architecture, domain packs, auth, Electron migration, removals, DB evolution, and rollout phases.
- The auth direction has been updated to reflect the user's requirement for a Codex-style browser login with ChatGPT / OpenAI plus workspace selection, based on OpenAI's help-center documentation for Codex CLI sign-in.
- The domain model direction has been refined so one domain pack can serve a whole domain family through tags and overlays, instead of forcing a separate pack per narrow subtopic.
- A dedicated Electron migration plan has been added at `docs/plans/2026-04-08-electron-migration-plan.md`.
- A concrete Phase 1 execution plan has been added at `docs/plans/2026-04-08-phase-1-execution-plan.md`, covering workspace restructuring, shared package extraction, Electron scaffolding, domain-pack shape, and boundary enforcement.
- Phase 1 implementation is now in place in the repo: the Next app has moved to `apps/web`, the repo root is a pnpm workspace, and `packages/ai-contracts`, `packages/ui`, `packages/core`, and `packages/domain-packs` now exist.
- The web app now imports shared contracts and shared UI components, which proves the extraction path works without breaking the current product flow.
- The Python domain pack now has a base pack plus an `automation` overlay, which matches the updated domain-family direction instead of forcing one pack per narrow subtopic.
- The Electron scaffold now builds successfully and can start through `electron-vite dev`; the final runtime blocker encountered during bring-up was dependency installation policy for Electron, which was resolved by allowing built dependencies and reinstalling.
- Phase 1 Task 8 is now complete: `eslint.config.mjs` enforces that `packages/ui` cannot import Prisma and that the desktop renderer cannot import Electron main/preload modules directly.
- Phase 1 Task 9 is now complete: the desktop shell exposes typed preload APIs for `auth.login`, `auth.session.get`, `plan.generate`, and `lesson.generate`, with shared contract types under `apps/desktop/shared/contracts.ts`.
- The first 2026-04-09 Electron dev verification exposed a real runtime issue: `electron-vite` was externalizing workspace packages, so the Electron main process handed raw TypeScript package sources to Node, which then failed on extensionless ESM re-exports in `packages/ai-contracts`.
- Excluding the workspace packages from Electron dependency externalization fixed the dev boot path, and the desktop app now reaches `starting electron app...` without the prior module-resolution crash.
- The local `openai` dependency resolved to version `4.104.0`, which supports `responses.parse` and Zod-backed structured parsing through `zodTextFormat`; the Phase 2 orchestration package uses that path instead of the older chat-completions parser.
- Current official OpenAI docs recommend the Responses API for new text/structured-output projects and position `gpt-5-mini` as a good fit for well-defined, high-volume tasks. This Phase 2 slice uses `gpt-5-mini` as the default desktop plan model, overridable through `LEARN_BOT_PLAN_MODEL`. Sources: [Structured outputs guide](https://platform.openai.com/docs/guides/structured-outputs), [Model selection docs](https://platform.openai.com/docs/models).
- `packages/ai-contracts` now include milestone prerequisites, success criteria, lesson materials, blocked-state actions, reflection prompts, and richer replan replacement payloads, which moves the shared contracts much closer to the rebuild plan's target UI contract.
- `packages/ai-orchestrator` now exists and composes Python-domain prompts from the domain pack, learner-state summary, and exact schema requirements before handing the request to OpenAI.
- The desktop renderer no longer auto-loads a fake plan on startup. It now exposes a manual `Generate Python roadmap` action that exercises the real main-process orchestration path and surfaces a clear missing-key error when `OPENAI_API_KEY` is absent.
- The current desktop AI boundary is asymmetric: `plan.generate` already calls the real Python orchestrator, but `lesson.generate` still returns `LessonSchema.parse(...)` from a hardcoded preview in `apps/desktop/electron-main/ai/index.ts`.
- The most direct next implementation step is therefore to add a structured Python lesson request and generator to `packages/ai-orchestrator`, wire it through the desktop main/preload bridge, and replace the renderer's startup-time lesson preview mock with a real request path.
- The cleanest request boundary for real lesson generation is `plan + learner profile`, not a no-arg IPC call. `PlanContract` already carries the active milestone and `todayLessonSeed`, while the learner profile still provides pacing and experience signals the lesson prompt needs.
- The renderer should stop auto-loading a lesson on startup; instead it should generate a lesson explicitly from the latest real plan so the desktop shell exercises one coherent Python end-to-end path.
- `packages/ai-orchestrator/src/python-lesson.ts` now implements that real lesson path: it validates a `LessonGenerationRequest`, composes Python-domain lesson prompts from the roadmap, active milestone, lesson seed, domain pack, and learner state, then parses the result through `LessonSchema`.
- The desktop bridge is now symmetric for generation: both `plan.generate` and `lesson.generate` flow through typed preload APIs into Electron main and then into the real orchestrator package.
- The renderer now clears stale lesson state after a new plan is generated and requires an explicit `Generate Python lesson` action, which keeps the visible lesson output tied to the latest real roadmap instead of the old mock preview.
- Focused orchestrator tests and broader app verification are green after the change: Python plan and lesson orchestrator tests pass, desktop build passes, web build passes, and boundary lint still passes.

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
- Task 10 starts from a partly wired UI state: the onboarding form submits directly to `/api/onboarding`, but that route currently returns JSON for form posts instead of redirecting to `/roadmap`.
- The lesson page still renders preview data only and does not expose a user-triggerable lesson regeneration action, even though `/api/lesson/regenerate` and the regeneration banner already exist.
- `package.json` already includes `@playwright/test` and a `test:e2e` script, but the repo does not yet contain `playwright.config.ts`, any `tests/e2e` specs, or a project `README.md`.
- The smallest Task 10-complete shape is: add Playwright config plus two smoke specs, make form-post onboarding redirect and preserve the guest cookie path, and add a visible lesson regeneration button flow that can hit the existing regeneration API.
- The first Task 10 root cause was host drift during onboarding: the form-post redirect changed the browser from `127.0.0.1` to `localhost`, so the host-only `guest_user_id` cookie was not sent to `/roadmap`, and no `Plan` or `Lesson` could be created.
- Task 10 is now complete: `playwright.config.ts`, `tests/e2e/onboarding-to-roadmap.spec.ts`, `tests/e2e/lesson-regeneration.spec.ts`, and `README.md` all exist and are wired into the project.
- `/api/onboarding` now returns a relative redirect for form posts, which keeps the guest cookie on the same host and lets `/roadmap` bootstrap the active plan for that guest user.
- `/roadmap` now uses the current guest profile to ensure a real plan exists and links to the actual current `lessonId` instead of the preview-only `lesson_1`.
- `/lesson/[lessonId]` now loads persisted lesson, task, and quiz data from Prisma, and shows regeneration state when `regenerationCount > 0`.
- The lesson regeneration trigger now uses a server-handled HTML form POST instead of a client-only click handler; the client path proved hydration-dependent and could miss the request under E2E timing.
- `vitest.config.ts` now scopes test collection to `tests/unit/**` and excludes `tests/e2e/**`, preventing Vitest from pulling in Playwright specs and dependency test files.

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
| Make the onboarding redirect relative for form posts | Same-host navigation is required to preserve the `guest_user_id` cookie in local E2E runs |
| Bootstrap the real plan on `/roadmap` instead of inventing a separate Task 10 API hop | The plan and current lesson id already exist in server code, so this is the smallest glue layer |
| Prefer a server form submission for lesson regeneration | It removes hydration timing from the critical path and keeps the E2E smoke test aligned with real browser behavior |
| Restrict Vitest to unit tests only | Adding E2E coverage should not break the unit runner's test discovery |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| `git status` failed because the repo is not initialized | Accept as expected; Task 1 includes `git init` |
| `pnpm install` could not reach the registry in sandbox | Re-ran the install with approved escalated network access |
| Prisma schema engine fails during `db push` with no detail | Confirmed schema validity and reproduced the failure with a minimal schema to isolate the issue to environment/runtime |
| `db push` still fails after installing Node 22 | Used `prisma migrate diff --script -o ...` and `prisma db execute --file ...` to initialize the SQLite schema |
| Playwright initially failed before reaching product code | Fixed the `webServer` command, ran E2E outside the sandbox, and installed the Chromium browser binary |
| Onboarding redirect lost the guest cookie by changing hosts | Changed the route handler to emit `location: /roadmap` for form posts |
| The first lesson regeneration button path was hydration-dependent | Replaced the client fetch button with a plain form POST to the existing regeneration route |
| Vitest started collecting E2E files and dependency test suites | Added explicit `include`/`exclude` patterns in `vitest.config.ts` |
| Electron desktop dev crashed on workspace package ESM resolution | Stopped externalizing `@learn-bot/*` packages in `apps/desktop/electron.vite.config.ts` so Electron dev bundles those sources instead of handing raw TS modules to Node |
| Expanding shared plan contracts broke existing persisted roadmap records | Added `enrichMilestones()` in the web plan generator so DB milestones are upgraded into the richer shared roadmap shape at read time |
| Zod defaults widened orchestrator types during Next type-checking | Re-parsed the model output through `PlanSchema.parse()` inside `generatePythonPlan()` before normalization |

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
