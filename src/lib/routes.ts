export const ROUTES = {
  home: "/",
  onboarding: "/onboarding",
  roadmap: "/roadmap",
  replan: "/replan",
  unsupported: "/unsupported",
  lesson: (lessonId: string) => `/lesson/${lessonId}`,
  lessonComplete: (lessonId: string) => `/lesson/${lessonId}/complete`
} as const;
