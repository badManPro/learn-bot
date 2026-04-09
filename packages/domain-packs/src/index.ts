import automationOverlay from "../python/overlays/automation.overlay.json" with { type: "json" };
import critiqueRubric from "../python/critique_rubric.json" with { type: "json" };
import domain from "../python/domain.json" with { type: "json" };
import lessonRules from "../python/lesson_rules.json" with { type: "json" };
import milestoneArchetypes from "../python/milestone_archetypes.json" with { type: "json" };
import skills from "../python/skills.json" with { type: "json" };

export const pythonDomainPack = {
  domain,
  skills,
  milestoneArchetypes,
  lessonRules,
  critiqueRubric,
  overlays: {
    automation: automationOverlay
  }
} as const;

export const domainPacks = {
  python: pythonDomainPack
} as const;
