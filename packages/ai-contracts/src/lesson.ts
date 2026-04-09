import { z } from "zod";

export const LessonTaskSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  estimatedMinutes: z.number().int().min(10).max(15)
});

export const LessonQuizSchema = z.object({
  kind: z.enum(["single_choice", "true_false"]),
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctAnswer: z.string().min(1)
});

export const LessonSchema = z.object({
  title: z.string().min(1),
  whyItMatters: z.string().min(1),
  completionCriteria: z.string().min(1),
  tasks: z.array(LessonTaskSchema).min(2).max(4),
  quiz: LessonQuizSchema
});

export type LessonTask = z.infer<typeof LessonTaskSchema>;
export type LessonQuiz = z.infer<typeof LessonQuizSchema>;
export type LessonContract = z.infer<typeof LessonSchema>;
