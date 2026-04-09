import { z } from "zod";

export const MilestoneStatusSchema = z.enum(["pending", "active", "completed"]);

export const RoadmapMilestoneSchema = z.object({
  index: z.number().int().positive(),
  title: z.string().min(1),
  outcome: z.string().min(1),
  status: MilestoneStatusSchema
});

export const PlanSchema = z.object({
  planTitle: z.string().min(1),
  domainId: z.string().min(1),
  tags: z.array(z.string()).default([]),
  goalSummary: z.string().min(1),
  milestones: z.array(RoadmapMilestoneSchema).min(1),
  currentStrategy: z.string().optional(),
  todayLessonSeed: z.string().optional(),
  warnings: z.array(z.string()).default([])
});

export type RoadmapMilestone = z.infer<typeof RoadmapMilestoneSchema>;
export type PlanContract = z.infer<typeof PlanSchema>;
