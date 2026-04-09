# Task Plan: AI-Native Multi-Domain Learning Product

## Goal
Replace deterministic template-based roadmap and lesson generation with a real-model architecture, support multiple learning domains, define the Electron and authentication direction, and produce an implementation plan that drives the next product phase.

## Current Phase
Phase 2

## Phases

### Phase 1: Product and Architecture Audit
- [x] Confirm how the current app generates plans and lessons
- [x] Identify all template-based generators and single-path assumptions
- [x] Record current auth and platform constraints
- **Status:** complete

### Phase 2: AI-Native Product Direction
- [ ] Define the target generation pipeline for roadmap, lesson, and replanning
- [ ] Define how domain tags and domain specs constrain model output
- [ ] Define the structured response contracts the UI will consume
- **Status:** in_progress

### Phase 3: Platform and Auth Direction
- [ ] Decide the desktop-shell strategy for moving from Next.js web to Electron
- [ ] Decide the authentication approach that is actually implementable with current OpenAI capabilities
- [ ] Define backend ownership of API calls, session storage, and entitlements
- **Status:** pending

### Phase 4: Prompt, Eval, and Quality System
- [ ] Define prompt layering: system policy, domain spec, learner profile, and task request
- [ ] Define eval cases and grading for plan quality, lesson granularity, and safety
- [ ] Define the prompt optimization workflow before feature rollout
- **Status:** pending

### Phase 5: Delivery Plan
- [x] Produce a concrete implementation sequence for repo refactor and new feature delivery
- [x] List removals, migrations, and verification gates
- [x] Hand off the recommended next build order
- [x] Adjust the plan for Codex-style browser auth and reusable domain-pack overlays
- [x] Add a dedicated Electron migration plan
- [x] Add a concrete Phase 1 execution plan
- **Status:** complete

## Key Questions
1. How do we replace hardcoded templates without letting the model produce unstable or unusable course structures?
2. How do we support multiple domains such as Python, piano, and drawing without collapsing into one generic prompt?
3. What auth flow is actually possible for an Electron app that needs OpenAI-backed generation?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Treat the current deterministic roadmap and lesson generators as transitional code that should be removed | The user explicitly wants no template fallback and real-model generation only |
| Separate product discussion into generation, platform/auth, and UI contract tracks | These decisions are tightly coupled and cannot be solved with prompt edits alone |
| Validate OpenAI authentication assumptions against current official docs before proposing an auth design | The requested “login with ChatGPT then close the page” flow is easy to assume incorrectly |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Product direction conflicted with the frozen MVP docs | 1 | Reframed the task as a post-MVP architecture change rather than an MVP extension |
| Existing planning files were oriented around Task 10 delivery | 1 | Rebased the active task plan to the new AI-native product direction |
| Richer AI contracts broke persisted roadmap milestone typing in the web app | 1 | Added a persisted-milestone enrichment layer so old DB records can satisfy the new shared plan schema |
| Orchestrator contract typing widened defaulted Zod fields during Next build | 1 | Re-validated the model output through `PlanSchema.parse` before normalization and tightened the normalization step |

## Notes
- The current app is still a web MVP with guest-cookie auth and deterministic generation paths.
- The next plan must account for removing, not extending, those deterministic generators.
- The auth and credential model is now assumed to follow a Codex-style browser login flow handled by the desktop app, with secure local credential storage.
- The concrete rebuild plan now lives at `docs/plans/2026-04-08-ai-native-multi-domain-rebuild-plan.md`.
- The auth direction has been revised to match a Codex-style browser login requirement, and the Electron migration plan now lives at `docs/plans/2026-04-08-electron-migration-plan.md`.
- The concrete Phase 1 task breakdown now lives at `docs/plans/2026-04-08-phase-1-execution-plan.md`.
- Phase 1 workspace restructuring has now been implemented in code: the web app lives in `apps/web`, shared packages exist under `packages/*`, and the Electron shell scaffold lives in `apps/desktop`.
- The remaining Phase 1 tasks are now complete as well: boundary lint rules are in place, the desktop preload API is typed through shared contracts, mocked `plan.generate` and `lesson.generate` both render in the shell, and Electron dev boot succeeds without the previous workspace-package resolution error.
- The first Phase 2 slice is now in code: `packages/ai-orchestrator` exists, `packages/ai-contracts` now carry much richer plan/lesson/replan schemas, and desktop `plan.generate` calls a real OpenAI-backed Python orchestration path.
- The desktop real-generation path currently requires `OPENAI_API_KEY`; without it, the renderer now shows an explicit configuration error instead of silently falling back to deterministic content.
- The next implementation target is now concrete: desktop `lesson.generate` is still backed by mock data, so the next code pass should add a real Python lesson orchestration path before expanding into replan or additional domains.
- That lesson-generation pass is now implemented too: desktop `lesson.generate` accepts a structured request, calls the real Python lesson orchestrator in Electron main, and no longer depends on startup-time mock preview data in the renderer.
- The next concrete follow-up after this pass is to add real replanning and history-aware next-lesson generation, then start removing the remaining deterministic web runtime generators from the active product path.

---

# Task Plan: AI Learning Assistant MVP Task 10

## Goal
Execute Task 10 for the AI Learning Assistant MVP by adding end-to-end smoke coverage, wiring the remaining onboarding and lesson regeneration paths, and finishing the project README.

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Test Scaffolding
- [x] Add Playwright config
- [x] Add failing onboarding-to-roadmap smoke test
- [x] Add failing lesson-regeneration smoke test
- **Status:** complete

### Phase 3: Implementation
- [x] Fix form-post onboarding redirect and preserve guest cookie continuity
- [x] Wire roadmap to bootstrap the current user's plan and lesson id
- [x] Wire lesson page to load persisted lesson data and regeneration state
- [x] Add a non-hydration-dependent lesson regeneration button path
- [x] Add README.md with setup, env vars, and run commands
- [x] Scope Vitest to unit tests after adding E2E coverage
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Run Prisma client generation
- [x] Run full unit suite
- [x] Run lint
- [x] Run production build
- [x] Run full Playwright smoke suite
- [x] Record results in progress.md
- **Status:** complete

### Phase 5: Delivery
- [x] Summarize what was implemented
- [x] Highlight blockers or follow-up work
- [x] Hand off the Task 10 completion state
- **Status:** complete

## Key Questions
1. What is the smallest E2E-complete path that proves onboarding reaches roadmap and users can trigger lesson regeneration?
2. Which wiring gaps should be fixed in product code instead of being papered over in Playwright tests?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Keep Task 10 focused on real product wiring, not Playwright workarounds | The implementation plan explicitly calls out missing glue code, not just missing tests |
| Make onboarding form posts return a relative redirect | The previous absolute redirect drifted from `127.0.0.1` to `localhost`, which dropped the host-only guest cookie |
| Bootstrap the active plan from the roadmap page | This is the smallest place to turn a saved learning profile into a real lesson id without widening Task 10 scope |
| Render the lesson regeneration action as a server-handled HTML form | The client-only button path was hydration-dependent and flaky under E2E timing |
| Restrict Vitest to `tests/unit/**` and exclude `tests/e2e/**` | Adding Playwright specs should not cause the unit runner to collect E2E files or third-party tests under `node_modules` |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Playwright `webServer` failed with `Invalid project directory ... /--hostname` | 1 | Switched the config to `pnpm exec next dev --hostname ... --port ...` |
| Next dev server failed with `listen EPERM` in sandbox | 1 | Re-ran Playwright outside the sandbox for E2E verification |
| Playwright Chromium executable was missing locally | 1 | Installed the Playwright Chromium browser before rerunning the red tests |
| Form-post onboarding redirect changed host from `127.0.0.1` to `localhost` | 1 | Replaced the absolute redirect with a relative `location: /roadmap` response |
| Unit test runner collected Playwright specs and third-party tests | 1 | Added explicit Vitest `include` and `exclude` patterns for `tests/unit/**` only |

## Notes
- Re-read this plan before major decisions.
- Log verification evidence before making completion claims.
- Do not skip the failing-test step for behavior changes.
