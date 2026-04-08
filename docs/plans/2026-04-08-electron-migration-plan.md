# Electron Migration Plan

Date: 2026-04-08
Status: Proposed
Depends on: `docs/plans/2026-04-08-ai-native-multi-domain-rebuild-plan.md`

## 1. Goal

Convert the current Next.js web MVP into a desktop-first Electron product that:

- authenticates through a browser-based ChatGPT / OpenAI login flow similar to Codex CLI
- stores credentials securely on the device
- runs AI orchestration outside the renderer
- renders structured plans and lessons with a native-feeling desktop UI
- keeps future room for optional backend sync without requiring it in the first shipping version

## 2. Migration principles

- The renderer must stay thin.
- The Electron main process owns privileged operations.
- The preload layer exposes a minimal, typed IPC bridge.
- The current Next.js API routes are transitional and should not survive as the long-term product runtime.
- Shared presentation components should be preserved where possible.

## 3. Target desktop architecture

```text
apps/desktop/
  electron-main/
    auth/
    ai/
    db/
    ipc/
    system/
  electron-preload/
  renderer/
    src/
packages/
  ai-contracts/
  ai-orchestrator/
  domain-packs/
  ui/
  core/
  database/
```

### Ownership

- `electron-main`
  - app lifecycle
  - auth browser flow
  - local secure credential handling
  - OpenAI calls
  - local persistence
  - orchestration jobs
- `electron-preload`
  - typed IPC façade only
- `renderer`
  - screens
  - view state
  - design system
  - no secrets

## 4. Technology choices

Recommended stack:

- Electron
- React
- Vite
- TypeScript
- Tailwind CSS
- Zod
- SQLite
- OS keychain storage library

Recommended router direction:

- migrate from Next App Router to a client-side router in the renderer

Reason:

- desktop product does not need Next server rendering
- current Next route handlers should move into main-process services or shared packages
- Vite-based renderer startup and packaging are simpler for Electron than preserving a full Next runtime

## 5. Migration phases

## Phase 1: Workspace restructuring

- add package workspace config
- create `apps/desktop`
- create `packages/ui`, `packages/ai-contracts`, `packages/core`
- move reusable components and schemas out of `src/`
- keep the current web app working during transition

Deliverable:

- monorepo boots
- web MVP still runs
- empty Electron shell launches

## Phase 2: Extract shared UI and contracts

- move lesson and roadmap presentation into `packages/ui`
- move zod schemas into `packages/ai-contracts`
- move domain logic helpers into `packages/core`
- remove direct Prisma imports from renderer-facing components

Deliverable:

- shared UI compiles in both web and desktop contexts

## Phase 3: Electron shell and preload

- implement Electron main entry
- implement BrowserWindow lifecycle
- implement preload bridge
- set content security policy
- disable unsafe renderer capabilities

Deliverable:

- desktop shell opens the renderer safely

## Phase 4: Auth flow

- add `Login with ChatGPT` entry in renderer
- open system browser from main process
- handle callback via deep link or loopback redirect listener
- resolve workspace / organization selection result
- persist credentials in OS keychain
- expose session state to renderer via IPC

Deliverable:

- user can sign in through browser and return to the app authenticated

## Phase 5: Local persistence layer

- create local SQLite database access in main process
- migrate existing plan and lesson tables to desktop-owned persistence
- add generated-artifact versioning
- store auth-linked workspace metadata

Deliverable:

- desktop app can persist learner state and generated content locally

## Phase 6: AI orchestration in main process

- move model calls out of web routes
- create orchestrator services in main process or shared package
- validate structured outputs before persistence
- add retries and critique pass
- log model metadata and prompt version locally

Deliverable:

- desktop app generates plans and lessons end-to-end without relying on Next API routes

## Phase 7: Renderer migration

- replace Next page routes with desktop renderer routes
- port onboarding, roadmap, lesson, and settings screens
- wire renderer actions to IPC commands
- remove direct server assumptions from components

Deliverable:

- full learner flow works in Electron renderer

## Phase 8: Remove web-runtime coupling

- deprecate Next API routes from active product path
- archive or remove deterministic web-only generation logic
- keep web app only if explicitly needed as a secondary surface

Deliverable:

- Electron becomes the primary runtime

## Phase 9: Packaging and desktop operations

- set up application signing
- configure packaging for macOS and Windows
- add error reporting
- add upgrade path for local DB migrations
- optionally add auto-update

Deliverable:

- installable desktop builds

## 6. Auth implementation plan

## 6.1 Required UX

The desktop login flow must look like this:

1. user clicks `登录`
2. app opens browser
3. user signs into ChatGPT / OpenAI
4. user selects workspace or API organization
5. auth flow finishes
6. user returns to desktop app
7. app shows authenticated state

## 6.2 Main-process responsibilities

- start auth flow
- generate PKCE values if needed
- launch browser
- listen for callback
- exchange auth result if required
- store credentials securely
- emit authenticated session state to renderer

## 6.3 Security rules

- never store credentials in renderer localStorage
- never expose raw credentials over broad IPC channels
- keep the preload API small and explicit
- clear credentials on logout

## 7. Desktop AI runtime plan

The renderer must not call OpenAI directly.
All AI calls should go through a narrow IPC command surface to main-process orchestration services.

Suggested IPC commands:

- `auth.login`
- `auth.logout`
- `auth.session.get`
- `plan.generate`
- `plan.current`
- `plan.replan`
- `lesson.generate`
- `lesson.completeTask`
- `lesson.skipTask`
- `lesson.feedback`

## 8. State and storage plan

Split storage into three layers:

- secure credentials
- local structured database
- lightweight renderer cache

Use:

- OS keychain for tokens and auth secrets
- SQLite for plans, lessons, runs, and settings
- in-memory renderer store for active screen state

## 9. UI migration map

Current Next routes to target desktop screens:

- `/onboarding` -> `OnboardingScreen`
- `/roadmap` -> `RoadmapScreen`
- `/lesson/[lessonId]` -> `LessonScreen`
- `/lesson/[lessonId]/complete` -> `CompletionScreen`
- `/replan` -> `ReplanScreen`
- `/unsupported` -> `UnsupportedGoalScreen`

Renderer navigation should become explicit client routing, not filesystem-bound server routing.

## 10. Code migration map

### Keep and extract

- validation schemas that remain relevant
- reusable presentational components
- domain progress logic that is still valid

### Replace

- Next route handlers
- Prisma-coupled server helpers inside UI paths
- deterministic AI generators
- cookie-based guest session assumptions

### Remove from primary runtime

- guest-only auth flow
- deterministic plan generation
- deterministic lesson generation
- deterministic lesson regeneration

## 11. Verification gates

Do not call the Electron migration successful unless:

- desktop auth completes through browser flow
- credentials survive app relaunch securely
- renderer never accesses secrets directly
- plan generation works from desktop flow
- lesson flow works without Next API routes
- packaged app runs on target OS

## 12. First implementation sprint

Recommended first Electron sprint:

1. create workspace layout and empty Electron shell
2. extract shared UI and contracts
3. wire preload and typed IPC
4. port onboarding screen into renderer
5. add mocked auth state only for shell bring-up

Recommended second sprint:

1. implement real browser auth flow
2. add secure credential storage
3. add local persistence
4. add first real AI generation path for Python domain

Recommended third sprint:

1. port roadmap and lesson screens
2. remove deterministic runtime path
3. run desktop end-to-end verification
