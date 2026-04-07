export const ROUTES = {
  home: "/",
  onboarding: "/onboarding",
  roadmap: "/roadmap",
  unsupported: "/unsupported",
  lesson: (lessonId: string) => `/lesson/${lessonId}`
} as const;
