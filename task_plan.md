# Task Plan: AI Learning Assistant MVP Task 9

## Goal
Execute Task 9 for the AI Learning Assistant MVP by adding inactivity replan and light MBTI pacing, while keeping planning documents aligned with the live repository state.

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define technical approach
- [x] Create project structure if needed
- [x] Document decisions with rationale
- **Status:** complete

### Phase 3: Implementation
- [x] Sync planning files to the post-Task-8 repository state
- [x] Add failing Task 9 tests
- [x] Implement replan domain logic, API route, and page
- [x] Connect pace mode derivation into plan and lesson generation without changing milestone structure
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Run Task 9 verification commands
- [x] Run relevant regression checks for lesson, roadmap, and completion flows
- [x] Record results in progress.md
- **Status:** complete

### Phase 5: Delivery
- [x] Summarize what was implemented
- [x] Highlight blockers or follow-up work
- [x] Hand off for user feedback before Task 10
- **Status:** complete

## Key Questions
1. What is the smallest replan flow that satisfies Task 9 without forcing a full progress-tracking rewrite?
2. How should `paceMode` influence task granularity and cadence without changing the 3-milestone roadmap?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Execute the existing implementation plan in batches of three tasks | Matches the executing-plans workflow and keeps checkpoints small |
| Treat the current docs as sufficiently frozen for v0 implementation | The tech spec defines scope, domain model, AI contracts, API contracts, and file structure |
| Continue with Task 4 instead of revising docs | The current repo already matches the assumptions created by Task 1 to Task 3 |
| Track `pnpm-lock.yaml` in git | Locking dependency resolution is useful once the project is bootstrapped |
| Treat the Prisma `db push` failure as an environment issue first, not a schema bug | `prisma validate` passes and the same failure reproduces with a one-model temporary schema |
| Pin the project to Node 22 | Node 23 contributed enough uncertainty during Prisma investigation that the project should advertise the supported runtime |
| Use `prisma migrate diff` plus `prisma db execute` as the current schema bootstrap workaround | `db push` remains broken locally, but Prisma can still generate valid SQL and execute it successfully |
| Keep Task 4 to Task 6 deterministic and schema-first | The spec explicitly allows a constrained single-path v0 and requires Zod-validated structured payloads |
| Treat quiz correctness as the lesson completion gate in Task 7 | The implementation plan says the lesson becomes complete when the quiz answer is correct |
| Sync planning docs before changing code again | The repo state already moved past earlier batches and the planning files had drifted before the last sync |
| Implement Task 8 by mutating the current lesson in place rather than creating a second lesson record | The plan only requires regeneration, simplified content, and feedback persistence; it does not require version history in v0 |
| Keep the Task 8 UI surface small | A standalone regeneration banner plus API contract is enough to satisfy the plan without adding speculative client orchestration |
| Keep Task 9 deterministic and profile-driven | The plan only requires replan options and light MBTI pacing, not open-ended AI scheduling |
| Apply pacing through existing `paceMode` and lesson payload generation | This keeps milestone structure stable while still changing task granularity and user load |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `pnpm install` failed in sandbox with `ENOTFOUND` | 1 | Re-ran with escalated network permissions and installation succeeded |
| `pnpm prisma db push` fails with blank `Schema engine error` | 1 | Investigated with `prisma validate`, direct engine checks, and a minimal temporary schema; likely tied to unsupported local Node 23 runtime |
| `pnpm prisma db push` still fails after switching to Node 22 | 2 | Used Prisma SQL generation plus `db execute` to create the SQLite schema and continued the batch |

## Notes
- Re-read this plan before major decisions.
- Log verification evidence before making completion claims.
- Do not skip the failing-test step for behavior changes.
