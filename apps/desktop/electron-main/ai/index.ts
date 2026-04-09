import { domainPacks } from "@learn-bot/domain-packs";

export async function getPhaseOnePlanPreview() {
  return {
    status: "idle",
    message: "Phase 1 only wires contracts and shell boundaries.",
    supportedDomainIds: Object.keys(domainPacks)
  };
}
