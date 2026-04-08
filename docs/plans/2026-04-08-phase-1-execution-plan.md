# Phase 1 Execution Plan: Repo and Architecture Reset

Date: 2026-04-08
Status: Proposed
Parent Plans:
- `docs/plans/2026-04-08-ai-native-multi-domain-rebuild-plan.md`
- `docs/plans/2026-04-08-electron-migration-plan.md`

## 1. Goal

Execute Phase 1 of the rebuild by restructuring the repo for a desktop-first, AI-native product without yet replacing the full learner flow.

This phase is about scaffolding and extraction.
It is not the phase where full real-AI generation or full desktop auth is completed.

## 2. Scope

### In scope

- create workspace boundaries
- scaffold Electron app structure
- extract shared UI, contracts, and core logic packages
- introduce domain-pack package shape
- keep the current web MVP runnable during transition
- prepare the codebase so Phase 2 can add real model orchestration without fighting repo layout

### Out of scope

- full OpenAI auth flow
- full desktop lesson flow
- full removal of all Next routes
- complete local DB redesign
- production packaging and signing

## 3. Success criteria

Phase 1 is complete only if all of these are true:

- the repo builds as a workspace
- an empty Electron shell launches
- the existing web app still runs
- `packages/ui`, `packages/ai-contracts`, `packages/core`, and `packages/domain-packs` exist
- at least one current screen component is extracted into shared UI
- at least one shared schema exists outside the web app
- the Python domain has a base pack plus overlay folder structure
- no renderer-facing shared component imports Prisma directly

## 4. Target directory layout after Phase 1

```text
apps/
  web/
  desktop/
    electron-main/
    electron-preload/
    renderer/
packages/
  ui/
  ai-contracts/
  core/
  domain-packs/
    python/
      overlays/
```

Notes:

- `apps/web` is the current Next.js app relocated, not rewritten.
- `apps/desktop` is a scaffold in this phase.
- `packages/domain-packs/python` is the first proof that the domain-pack format works.

## 5. Task list

## Task 1: Create workspace root

### Files

- Update: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`

### Actions

- convert the repo root into a workspace root
- move app-specific scripts into app-level packages where appropriate
- define shared TypeScript compiler options in `tsconfig.base.json`

### Acceptance

- `pnpm install` works at repo root
- workspace packages are discovered correctly

## Task 2: Relocate the current web app into `apps/web`

### Files

- Move: current Next app files into `apps/web`
- Update: import paths and package metadata as needed

### Actions

- keep the current app behavior intact
- do not rewrite product logic here
- minimize behavior changes during the move

### Acceptance

- `pnpm --filter web dev` or equivalent runs the web app successfully
- existing web build still passes after the move

## Task 3: Scaffold Electron desktop app

### Files

- Create: `apps/desktop/package.json`
- Create: `apps/desktop/electron-main/main.ts`
- Create: `apps/desktop/electron-preload/preload.ts`
- Create: `apps/desktop/renderer/index.html`
- Create: `apps/desktop/renderer/src/main.tsx`
- Create: `apps/desktop/renderer/src/App.tsx`
- Create: `apps/desktop/tsconfig.json`
- Create: Electron and Vite config files

### Actions

- add Electron main-process entry
- add preload bridge scaffold
- add a minimal renderer boot
- use a blank but typed shell, not product UI yet

### Acceptance

- desktop app launches a window
- renderer renders a minimal placeholder UI

## Task 4: Create shared contracts package

### Files

- Create: `packages/ai-contracts/package.json`
- Create: `packages/ai-contracts/tsconfig.json`
- Create: `packages/ai-contracts/src/index.ts`
- Create: `packages/ai-contracts/src/plan.ts`
- Create: `packages/ai-contracts/src/lesson.ts`
- Create: `packages/ai-contracts/src/replan.ts`

### Actions

- define initial `PlanSchema`, `LessonSchema`, and `ReplanSchema`
- keep schemas small but realistic
- ensure schemas are independent of Next, Prisma, and Electron

### Acceptance

- both `apps/web` and `apps/desktop` can import these schemas
- schemas compile and export typed contracts

## Task 5: Create shared UI package

### Files

- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Create: extracted components from current web app

### Recommended first extractions

- roadmap milestone list
- lesson shell layout primitives
- quiz/task card display primitives where they are presentation-only

### Actions

- move presentation-only components first
- leave data fetching and route code in `apps/web`
- add a small package-level style or utility strategy if needed

### Acceptance

- at least one roadmap component and one lesson component are imported from `packages/ui`

## Task 6: Create shared core package

### Files

- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: extracted domain helpers from current app

### Recommended first extractions

- route-independent lesson progression helpers
- pure validation or transformation helpers
- shared tag normalization helpers

### Actions

- move pure logic only
- do not move Prisma-bound helpers yet

### Acceptance

- extracted helpers have no Next.js or Prisma imports

## Task 7: Create domain-pack package shape

### Files

- Create: `packages/domain-packs/package.json`
- Create: `packages/domain-packs/src/index.ts`
- Create: `packages/domain-packs/python/domain.json`
- Create: `packages/domain-packs/python/skills.json`
- Create: `packages/domain-packs/python/milestone_archetypes.json`
- Create: `packages/domain-packs/python/lesson_rules.json`
- Create: `packages/domain-packs/python/critique_rubric.json`
- Create: `packages/domain-packs/python/overlays/automation.overlay.json`

### Actions

- define the base Python domain pack
- define one overlay proving the overlay system works
- keep pack contents structured and machine-readable

### Acceptance

- the package exports the Python base pack and its overlays
- web and desktop code can read the base pack structure

## Task 8: Add shared import hygiene and boundaries

### Files

- Update: lint config
- Update: TS path aliases
- Optionally create workspace boundary checks

### Actions

- prevent `packages/ui` from importing Prisma
- prevent renderer code from importing Electron main-process modules directly
- document allowed dependency directions

### Acceptance

- lint or build fails on invalid cross-layer imports

## Task 9: Prepare auth and orchestration interfaces

### Files

- Create: `apps/desktop/electron-main/auth/index.ts`
- Create: `apps/desktop/electron-main/ai/index.ts`
- Create: `apps/desktop/electron-main/ipc/contracts.ts`
- Create: `apps/desktop/electron-preload/api.ts`

### Actions

- define interface boundaries now, even if implementation is mocked
- include placeholders for:
  - `auth.login`
  - `auth.session.get`
  - `plan.generate`
  - `lesson.generate`

### Acceptance

- renderer can call mocked IPC endpoints through typed preload APIs

## Task 10: Verification and handoff

### Actions

- run workspace install
- run web build
- run desktop dev boot
- record resulting structure and unresolved blockers

### Acceptance

- Phase 1 deliverables are documented and reproducible

## 6. Recommended implementation order

Execute in this order:

1. Task 1: workspace root
2. Task 2: move web app
3. Task 3: Electron scaffold
4. Task 4: shared contracts
5. Task 5: shared UI
6. Task 6: shared core
7. Task 7: domain-pack shape
8. Task 8: boundary enforcement
9. Task 9: auth/orchestration interfaces
10. Task 10: verification

Reason:

- it establishes repo shape first
- then creates a safe extraction path
- then prepares Phase 2 without prematurely implementing auth or model calls

## 7. Commands to expect during implementation

These command names are recommendations, not yet final:

- `pnpm install`
- `pnpm --filter web dev`
- `pnpm --filter web build`
- `pnpm --filter desktop dev`
- `pnpm --filter desktop lint`
- `pnpm --filter web test`

## 8. Risks in Phase 1

- moving the web app too early can break existing scripts
- extracting UI before contracts are stable can cause churn
- Electron boot complexity can distract from workspace restructuring
- domain-pack files can become pseudo-prompts if not kept structured

## 9. Definition of done for Phase 1 handoff

The phase handoff should include:

- final workspace tree
- list of extracted modules
- list of remaining web-only modules
- blockers for auth implementation
- blockers for real model orchestration
- recommendation for the first Phase 2 implementation task

## 10. Recommended first Phase 2 task

After Phase 1, start with:

- implementing `PlanSchema`, `LessonSchema`, and `ReplanSchema` in real detail
- then wiring one real Python-domain plan generation call through the desktop orchestration layer

Do not start Phase 2 with piano or drawing.
Get one domain working end-to-end first.
