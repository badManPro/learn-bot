import automationOverlay from "../python/overlays/automation.overlay.json" with { type: "json" };
import critiqueRubric from "../python/critique_rubric.json" with { type: "json" };
import domain from "../python/domain.json" with { type: "json" };
import lessonRules from "../python/lesson_rules.json" with { type: "json" };
import milestoneArchetypes from "../python/milestone_archetypes.json" with { type: "json" };
import skills from "../python/skills.json" with { type: "json" };
import drawingCritiqueRubric from "../drawing/critique_rubric.json" with { type: "json" };
import drawingDomain from "../drawing/domain.json" with { type: "json" };
import drawingLessonRules from "../drawing/lesson_rules.json" with { type: "json" };
import drawingMilestoneArchetypes from "../drawing/milestone_archetypes.json" with { type: "json" };
import drawingSkills from "../drawing/skills.json" with { type: "json" };
import pianoCritiqueRubric from "../piano/critique_rubric.json" with { type: "json" };
import pianoDomain from "../piano/domain.json" with { type: "json" };
import pianoLessonRules from "../piano/lesson_rules.json" with { type: "json" };
import pianoMilestoneArchetypes from "../piano/milestone_archetypes.json" with { type: "json" };
import pianoSkills from "../piano/skills.json" with { type: "json" };

type DomainMetadata = {
  id: string;
  label: string;
  family: string;
  defaultTags: readonly string[];
  subdomainTags: readonly string[];
  supportedModalities: readonly string[];
  environmentAssumptions: readonly string[];
};

type SkillDefinition = {
  id: string;
  label: string;
  prerequisites: readonly string[];
};

type MilestoneArchetype = {
  id: string;
  label: string;
  description: string;
};

type LessonRules = {
  defaultTaskCountRange: readonly [number, number];
  defaultTaskMinutesRange: readonly [number, number];
  acceptableLessonFormats: readonly string[];
  allowedTaskTypes: readonly string[];
  mustInclude: readonly string[];
  forbiddenPatterns: readonly string[];
  equipmentOrEnvironment: readonly string[];
  pedagogyConstraints: readonly string[];
};

type CritiqueRubric = {
  checks: readonly string[];
};

type OverlayDefinition = {
  id: string;
  tags: readonly string[];
  milestoneBias: readonly string[];
  lessonBias: readonly string[];
};

type LessonRulesLike = Omit<LessonRules, "defaultTaskCountRange" | "defaultTaskMinutesRange"> & {
  defaultTaskCountRange: number[];
  defaultTaskMinutesRange: number[];
};

export type DomainPack = {
  domain: DomainMetadata;
  skills: readonly SkillDefinition[];
  milestoneArchetypes: readonly MilestoneArchetype[];
  lessonRules: LessonRules;
  critiqueRubric: CritiqueRubric;
  overlays: Readonly<Record<string, OverlayDefinition>>;
};

function asRange(value: number[]): readonly [number, number] {
  if (value.length !== 2) {
    throw new Error(`Expected a two-number range, received ${value.length} items.`);
  }

  return [value[0]!, value[1]!] as const;
}

function normalizeLessonRules(rules: LessonRulesLike): LessonRules {
  return {
    ...rules,
    defaultTaskCountRange: asRange(rules.defaultTaskCountRange),
    defaultTaskMinutesRange: asRange(rules.defaultTaskMinutesRange)
  };
}

export const pythonDomainPack = {
  domain,
  skills,
  milestoneArchetypes,
  lessonRules: normalizeLessonRules(lessonRules),
  critiqueRubric,
  overlays: {
    automation: automationOverlay
  }
} as const satisfies DomainPack;

export const pianoDomainPack = {
  domain: pianoDomain,
  skills: pianoSkills,
  milestoneArchetypes: pianoMilestoneArchetypes,
  lessonRules: normalizeLessonRules(pianoLessonRules),
  critiqueRubric: pianoCritiqueRubric,
  overlays: {}
} as const satisfies DomainPack;

export const drawingDomainPack = {
  domain: drawingDomain,
  skills: drawingSkills,
  milestoneArchetypes: drawingMilestoneArchetypes,
  lessonRules: normalizeLessonRules(drawingLessonRules),
  critiqueRubric: drawingCritiqueRubric,
  overlays: {}
} as const satisfies DomainPack;

export const domainPacks = {
  python: pythonDomainPack,
  piano: pianoDomainPack,
  drawing: drawingDomainPack
} as const;

export type DomainPackId = keyof typeof domainPacks;

export const domainPackIds = Object.keys(domainPacks) as DomainPackId[];

export function getDomainPack(id: DomainPackId) {
  return domainPacks[id];
}
