import { domainPackIds, domainPacks, getDomainPack } from "@learn-bot/domain-packs";

test("domain pack registry exposes the phase 3 base domains", () => {
  expect(domainPackIds).toEqual(["python", "piano", "drawing"]);
  expect(getDomainPack("piano").domain.label).toBe("Piano");
  expect(getDomainPack("drawing").domain.family).toBe("visual-art");
});

test("each domain pack has a coherent v1 teaching contract", () => {
  for (const [packId, pack] of Object.entries(domainPacks)) {
    expect(pack.domain.id).toBe(packId);
    expect(pack.domain.defaultTags.length).toBeGreaterThanOrEqual(3);
    expect(pack.domain.subdomainTags.length).toBeGreaterThanOrEqual(4);
    expect(pack.domain.supportedModalities.length).toBeGreaterThanOrEqual(3);
    expect(pack.domain.environmentAssumptions.length).toBeGreaterThanOrEqual(2);

    expect(pack.skills.length).toBeGreaterThanOrEqual(3);
    const skillIds = new Set(pack.skills.map((skill) => skill.id));

    for (const skill of pack.skills) {
      for (const prerequisite of skill.prerequisites) {
        expect(skillIds.has(prerequisite)).toBe(true);
      }
    }

    expect(pack.milestoneArchetypes.length).toBeGreaterThanOrEqual(2);
    expect(pack.lessonRules.acceptableLessonFormats.length).toBeGreaterThanOrEqual(2);
    expect(pack.lessonRules.allowedTaskTypes.length).toBeGreaterThanOrEqual(3);
    expect(pack.lessonRules.mustInclude.length).toBeGreaterThanOrEqual(2);
    expect(pack.lessonRules.pedagogyConstraints.length).toBeGreaterThanOrEqual(2);
    expect(pack.critiqueRubric.checks.length).toBeGreaterThanOrEqual(4);
  }
});

test("python keeps its automation overlay for tag-driven lesson biasing", () => {
  expect(domainPacks.python.overlays.automation.tags).toContain("automation");
  expect(domainPacks.python.overlays.automation.lessonBias).toContain("input-output scripts");
});
