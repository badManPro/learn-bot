import { z } from "zod";

export const MilestoneStatusSchema = z.enum(["pending", "active", "completed"]);
export const LessonTypeSchema = z.enum(["setup", "practice", "project", "review", "reflection"]);

export const TodayLessonSeedSchema = z.object({
  milestoneId: z.string().min(1),
  lessonType: LessonTypeSchema,
  objective: z.string().min(1)
});

export const RoadmapMilestoneSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().positive(),
  title: z.string().min(1),
  purpose: z.string().min(1),
  outcome: z.string().min(1),
  prerequisites: z.array(z.string().min(1)).default([]),
  successCriteria: z.array(z.string().min(1)).min(1),
  recommendedWeeks: z.number().int().positive(),
  lessonTypes: z.array(LessonTypeSchema).min(1),
  status: MilestoneStatusSchema
});

export const PlanSchema = z.object({
  planTitle: z.string().min(1),
  domainId: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  goalSummary: z.string().min(1),
  totalEstimatedWeeks: z.number().int().positive(),
  milestones: z.array(RoadmapMilestoneSchema).min(1),
  currentStrategy: z.string().min(1),
  todayLessonSeed: TodayLessonSeedSchema,
  warnings: z.array(z.string().min(1)).default([])
});

export type LessonType = z.infer<typeof LessonTypeSchema>;
export type RoadmapMilestone = z.infer<typeof RoadmapMilestoneSchema>;
export type TodayLessonSeed = z.infer<typeof TodayLessonSeedSchema>;
export type PlanContract = z.infer<typeof PlanSchema>;
