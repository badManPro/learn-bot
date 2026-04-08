# AI-Native Multi-Domain Learning Product Rebuild Plan

Date: 2026-04-08
Status: Proposed
Supersedes: `docs/plans/2026-04-05-ai-learning-assistant-tech-spec.md`, `docs/plans/2026-04-05-ai-learning-assistant-design.md`, `docs/plans/2026-04-05-ai-learning-assistant-implementation-plan.md` for the next phase of the product

## 1. Goal

Replace the current deterministic, single-path MVP with an AI-native learning product that:

- uses real model calls for plan generation, lesson generation, and replanning
- supports multiple learning domains such as Python, piano, and drawing
- removes template fallback behavior entirely
- drives the user toward near-zero decision cost through structured, granular action plans
- migrates from a web-only MVP toward an Electron desktop client

This document is a build plan, not a brainstorm note. It fixes the target architecture, the migration order, and the boundaries of the next implementation phase.

## 2. Hard Product Decisions

### 2.1 Generation

- Remove deterministic roadmap, lesson, and regeneration generators.
- Do not keep a template fallback path in production behavior.
- All learner-facing plan content must come from model generation constrained by typed schemas, domain packs, and application-side validation.

### 2.2 Domain support

- The next product phase is multi-domain by design.
- Initial supported domains:
  - Python / AI / automation
  - Piano
  - Drawing
- Domain support is not implemented as one giant generic prompt.
- Domain support is implemented through `domain packs` with explicit learning constraints.
- A single domain should usually reuse one base domain pack plus tags and overlays, rather than creating a new pack for every subtopic.

### 2.3 Auth and model access

- The initial desktop auth flow should mirror the Codex CLI sign-in experience:
  - user clicks a login button
  - the app opens the system browser
  - user signs in with ChatGPT / OpenAI
  - user selects the target workspace or API organization
  - the browser flow completes
  - the user closes the page and returns to the desktop app as authenticated
- Treat this as an OAuth-style browser-based auth requirement for the product.
- The desktop app must store resulting credentials in OS-secure storage.
- The desktop app must support workspace selection as part of authentication.
- The product should be designed so the first shipping desktop version can operate without product-owned auth as the primary login system.

### 2.4 Platform

- The product moves to a desktop-first Electron shell.
- The current Next.js codebase should not be stretched into a long-term “frontend + backend + desktop runtime” monolith.
- The repo should become a small monorepo with clear separation between desktop renderer, desktop shell, shared contracts, and backend orchestration.

## 3. Why the current architecture must be replaced

The current repo is built around deterministic content generation:

- goal mapping is keyword-based
- roadmap generation is hardcoded
- first-lesson generation is hardcoded
- regeneration is a deterministic simplification transform

These choices were acceptable for the earlier MVP, but they directly block the current product direction:

- they cannot support multiple unrelated domains
- they cannot personalize at high resolution
- they cannot improve through evals and prompt iteration
- they force UI decisions to mirror template decisions rather than model reasoning

## 4. Product Principles for the rebuild

### 4.1 Zero-decision-cost means controlled generation

The product should not ask the learner to decide:

- what to learn next
- how deep to go today
- what to do when blocked
- whether today’s task is foundational, exploratory, or review

The model must decide these within a constrained system.

### 4.2 Model freedom is not the product

We do not want maximal creativity from the model.
We want:

- valid structure
- fine-grained tasks
- domain-appropriate sequencing
- realistic time estimates
- clear completion criteria
- controlled recovery actions when the learner struggles

### 4.3 Domain packs replace templates

A domain pack is not a text template.
It is a structured set of constraints, rubrics, and allowed moves for one learning field.

Each domain pack defines:

- domain id and display metadata
- subdomain tags
- skill graph and prerequisite relationships
- milestone archetypes
- acceptable lesson formats
- allowed task types
- time-boxing rules
- equipment or environment assumptions
- safety and pedagogy constraints
- critique rubric for generated output

Each domain pack can also define:

- tag overlays
- subdomain overlays
- instrument or tool overlays
- learner-goal overlays

This allows one domain family to stay reusable while still specializing behavior.

## 5. Target architecture

## 5.1 Repository shape

Adopt a monorepo layout:

```text
apps/
  desktop/
    electron-main/
    electron-preload/
    renderer/
  api/
    src/
packages/
  ai-contracts/
  ai-orchestrator/
  domain-packs/
    python/
    piano/
    drawing/
  ui/
  core/
  database/
```

### Responsibilities

- `apps/desktop`
  - Electron shell
  - renderer UI
  - desktop auth callback handling
  - secure credential storage
  - model orchestration entrypoint for the first shipping version
- `apps/api`
  - optional in the first shipping version
  - later used for sync
  - later used for eval aggregation
  - later used for shared persistence, collaboration, billing, or organizational features
- `packages/ai-contracts`
  - zod or JSON schema definitions for all model outputs
- `packages/domain-packs`
  - domain metadata and constraints
  - base packs plus overlays
- `packages/ai-orchestrator`
  - prompt composition, model calls, validation, critique, retries
- `packages/ui`
  - domain-agnostic presentation components driven by structured data

## 5.2 Generation pipeline

Every plan or lesson request runs through a staged pipeline.

### Stage A: Goal understanding

Input:

- raw goal
- stated motivation
- available time
- deadline
- existing experience
- preferred modality

Output:

- normalized learner intent
- domain id
- tag set
- ambiguity flags
- confidence score

### Stage B: Learner state synthesis

Input:

- onboarding data
- prior activity
- completed lessons
- skips
- replan reasons
- explicit friction signals

Output:

- learner state summary
- pace recommendation
- attention budget
- current bottlenecks
- risk factors

### Stage C: Roadmap generation

Input:

- domain pack
- learner state summary
- target outcome and date

Output:

- milestone graph
- phase ordering
- success criteria per milestone
- pacing assumptions
- first active milestone

### Stage D: Lesson generation

Input:

- domain pack
- roadmap state
- current milestone
- learner state

Output:

- one lesson
- 2 to 6 atomic tasks
- estimated duration for each task
- required materials
- “why this now”
- pass/fail completion criteria
- blocked-state recovery actions

### Stage E: Critique and repair

Input:

- generated roadmap or lesson
- domain rubric
- schema validator errors if any

Output:

- acceptance or rejection
- repair instructions
- revised structured result

No generated content is shown to the user unless:

- it matches schema
- it passes the domain rubric
- it satisfies application-level safety checks

## 5.3 Model strategy

Use different model roles instead of one universal call:

- classifier / tagger
- planner
- lesson generator
- critic / grader

This should be implemented at the orchestration layer, not spread across route handlers or random Electron renderer components.

Avoid product logic like prerequisite enforcement in prompt text alone.
Enforce it in code after generation as well.

## 6. Structured output contracts

All model responses must be schema-first.

## 6.1 Plan schema

The plan contract should include at least:

- `plan_title`
- `domain_id`
- `tags`
- `goal_summary`
- `total_estimated_weeks`
- `milestones[]`
- `current_strategy`
- `today_lesson_seed`
- `warnings[]`

Each milestone should include:

- `id`
- `title`
- `purpose`
- `prerequisites`
- `success_criteria[]`
- `recommended_weeks`
- `lesson_types[]`

## 6.2 Lesson schema

The lesson contract should include at least:

- `lesson_id`
- `title`
- `why_this_now`
- `estimated_total_minutes`
- `completion_contract`
- `materials_needed[]`
- `tasks[]`
- `if_blocked[]`
- `reflection_prompt`
- `next_default_action`

Each task should include:

- `id`
- `title`
- `type`
- `instructions`
- `expected_output`
- `estimated_minutes`
- `verification_method`
- `skip_policy`

## 6.3 Replan schema

The replan contract should include at least:

- `replan_reason`
- `diagnosis`
- `pace_change`
- `milestone_adjustment`
- `replacement_lesson`
- `user_message`

## 6.4 UI rule

The renderer must consume structured lesson and plan objects directly.
It must not parse free-form model prose heuristically.

## 7. Domain-pack design

## 7.1 Python / AI / automation pack

Must define:

- beginner-to-project progression
- environment setup expectations
- code execution task types
- debugging and verification conventions
- allowed first-project archetypes

## 7.2 Piano pack

Must define:

- posture and warm-up constraints
- technique sequencing
- left/right hand coordination progression
- practice block types
- tempo, repetition, and difficulty rules

## 7.3 Drawing pack

Must define:

- shape/form/value progression
- observation vs imagination exercise types
- material assumptions
- study-to-finished-piece progression
- critique rules that do not require impossible precision claims

## 7.4 Domain-pack format

Each pack should include:

- `domain.json`
- `skills.json`
- `milestone_archetypes.json`
- `lesson_rules.json`
- `critique_rubric.json`
- `safety_rules.md`
- `overlays/`

These are not user-facing prompts.
They are internal structured constraints consumed by the orchestrator.

Recommended overlay examples:

- Python:
  - `automation.overlay.json`
  - `data.overlay.json`
  - `web.overlay.json`
- Piano:
  - `beginner-technique.overlay.json`
  - `sight-reading.overlay.json`
  - `accompaniment.overlay.json`
- Drawing:
  - `observation.overlay.json`
  - `character.overlay.json`
  - `digital.overlay.json`

## 8. Prompting and eval strategy

Yes, prompt engineering is required.
No, prompt engineering alone is not enough.

## 8.1 Prompt layering

Every generation request should compose:

1. global system policy
2. domain-pack constraints
3. learner-state summary
4. task-specific instruction
5. exact output schema

This avoids one giant brittle prompt and keeps prompt changes localized.

## 8.2 Eval flywheel

Before shipping any domain, build eval sets for:

- roadmap coherence
- prerequisite correctness
- lesson granularity
- time-estimate realism
- recoverability after failure
- domain realism
- formatting validity

Each eval case should have:

- input learner profile
- expected accept/reject conditions
- grader rubric
- regression label

## 8.3 Prompt optimizer and manual tuning

Use prompt optimization as a tool, not as the architecture.
The workflow should be:

1. write baseline prompts
2. define schemas
3. build eval set
4. measure failures
5. optimize prompts
6. keep only changes that improve eval scores

## 9. Auth and identity direction

## 9.1 Decision

For the next build phase:

- authenticate via a browser-based OpenAI / ChatGPT login flow that mirrors Codex CLI
- support workspace or API organization selection during login
- store the resulting credentials locally in OS-secure storage
- restore desktop session on app relaunch

The desktop app should behave like a first-class authenticated OpenAI-powered client.

## 9.2 Desktop auth UX

The UX can still feel like a modern desktop sign-in flow:

1. app opens system browser
2. user signs into ChatGPT / OpenAI
3. user chooses the workspace or API organization
4. callback returns to desktop app or local auth listener
5. browser can be closed
6. desktop app stores credentials securely

The product requirement is that this should feel essentially the same as Codex CLI login.

## 9.3 Storage

Store:

- access token or equivalent session credential
- refresh token if the auth flow provides one
- workspace id or API organization id
- local account metadata needed to restore the session

in OS-secure storage, not in plaintext files.

## 9.4 Validation constraint

The exact protocol surface available to third-party apps must be validated during implementation.
The product requirement remains:

- browser-based OpenAI / ChatGPT login
- workspace selection
- secure local session restoration

Do not silently substitute a different login UX without an explicit product decision.

## 10. Electron migration plan

## 10.1 Desktop shape

The desktop app should contain:

- Electron main process
- preload bridge
- React renderer
- local cache for recent plans and lessons

## 10.2 Backend dependency

The desktop app remains online-first.
For the first shipping desktop version:

- auth and model access are desktop-led
- local persistence is desktop-led
- backend services are optional and secondary

For later versions:

- backend services can be added for sync, teams, shared state, or eval aggregation

## 10.3 Migration rule

Do not directly embed the current Next.js server routes inside Electron.
Instead:

- preserve reusable UI and domain code
- move backend logic into `apps/api`
- move presentation into a desktop renderer

## 11. Current-code removal map

The following modules should be deleted or fully replaced:

- `src/lib/ai/goal-mapper.ts`
- `src/lib/ai/plan-generator.ts`
- `src/lib/ai/lesson-generator.ts`
- `src/lib/ai/lesson-regenerator.ts`

The following areas should be refactored heavily:

- `src/app/api/onboarding/route.ts`
- `src/app/api/plan/generate/route.ts`
- `src/app/api/plan/current/route.ts`
- `src/app/api/plan/replan/route.ts`
- `src/app/api/lesson/regenerate/route.ts`
- `src/app/roadmap/page.tsx`
- `src/app/lesson/[lessonId]/page.tsx`

The current Prisma schema should also be revised to support versioned generated artifacts and model-run observability.

## 12. Database changes

Add or revise tables for:

- `OpenAIIdentity`
- `DeviceSession`
- `Workspace`
- `DomainEnrollment`
- `Plan`
- `PlanVersion`
- `Lesson`
- `LessonVersion`
- `GenerationJob`
- `ModelRun`
- `CritiqueRun`
- `UserFeedbackEvent`
- `PromptVariant`
- `EvalCase`
- `EvalRun`

Important rule:

- store the structured output that the user actually saw
- store the prompt version and model metadata used to produce it
- keep generated versions immutable after display

## 13. UX direction after model integration

The UI should become more structured, not more chat-like.

## 13.1 Roadmap page

Show:

- goal summary
- active strategy
- current milestone
- upcoming milestone
- today’s recommended lesson

Do not dump the full model reasoning transcript.

## 13.2 Lesson page

Show in order:

1. today’s win condition
2. first task
3. why this is the right task now
4. materials needed
5. blocked-state fallback
6. short reflection / check

The UI should visibly reduce user choice, not increase it.

## 13.3 Tags

Tags should serve the system and the learner:

- domain tags
- skill tags
- modality tags
- difficulty tags
- tool/material tags
- outcome tags

Tags are not just UI chips.
They are routing signals for orchestration and filtering.

## 14. Delivery phases

## Phase 1: Repo and architecture reset

- create monorepo structure
- separate Electron shell, renderer, and orchestration concerns
- extract reusable contracts and domain logic
- freeze the current MVP in a branch or archive path

## Phase 2: Real AI orchestration foundation

- add real OpenAI integration through the desktop orchestration layer
- implement structured output schemas
- create orchestrator package
- add job lifecycle, retries, validation, and logging

## Phase 3: Domain-pack v1

- build Python pack
- build piano pack
- build drawing pack
- write critique rubrics for each

## Phase 4: Plan generation

- implement goal understanding and tag generation
- implement roadmap generation
- implement critique and repair loop
- persist plan versions

## Phase 5: Lesson generation and replanning

- implement lesson generation pipeline
- implement blocked-state replanning
- implement history-aware next-lesson generation

## Phase 6: Desktop client

- add Electron shell
- add secure auth callback handling
- add OpenAI / ChatGPT browser login flow
- add workspace selection handling
- migrate the UI into the desktop renderer
- add secure credential storage
- add local caching and offline read behavior

## Phase 7: Eval and rollout gates

- build eval dataset
- run prompt comparisons
- block release on schema and rubric regressions

## 15. Verification gates

Do not call the rebuild complete unless all of the following are true:

- template generators are fully removed from runtime behavior
- plan and lesson generation use real model calls
- structured outputs validate before persistence
- at least three domains pass acceptance evals
- desktop auth works through system-browser callback
- the desktop client never stores OpenAI API keys
- every user-visible plan and lesson is traceable to prompt version, model metadata, and critique result

## 16. Risks

- moving to Electron too early can hide unresolved backend architecture problems
- multi-domain support will fail if domain packs stay shallow
- prompt-only control will not keep quality stable without evals
- free-form model prose will create fragile UI behavior
- treating OpenAI as the app’s identity provider without explicit supported docs is a product risk

## 17. Immediate next sprint

The next sprint should do exactly this:

1. Create the monorepo split and backend package boundaries.
2. Introduce structured `PlanSchema`, `LessonSchema`, and `ReplanSchema`.
3. Add the desktop-first AI orchestration layer with one real generation path.
4. Remove the existing deterministic generators from the active runtime path.
5. Ship one end-to-end AI-generated domain first, then add piano and drawing as domain packs.

Recommended first domain for the first real-AI cut:

- Python / AI / automation

Reason:

- easiest to validate with deterministic checks
- easiest to compare against current product flow
- easiest to debug during orchestration bring-up

Immediate implementation note:

- start with one base Python domain pack
- use tags and overlays for subtopics instead of creating separate hardcoded packs too early

## 18. Official docs references

- Codex CLI and Sign in with ChatGPT: https://help.openai.com/en/articles/11381614
- OpenAI Apps SDK authentication: https://developers.openai.com/apps-sdk/build/auth
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI evals: https://developers.openai.com/api/docs/guides/evals
- OpenAI prompt optimizer: https://developers.openai.com/api/docs/guides/prompt-optimizer
