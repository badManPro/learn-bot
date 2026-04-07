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
