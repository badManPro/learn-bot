import { beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { ensureCurrentPlanForUserMock, getOrCreateGuestUserIdMock } = vi.hoisted(() => ({
  ensureCurrentPlanForUserMock: vi.fn(),
  getOrCreateGuestUserIdMock: vi.fn()
}));

vi.mock("@/lib/ai/plan-generator", () => ({
  ensureCurrentPlanForUser: ensureCurrentPlanForUserMock
}));

vi.mock("@/lib/session", () => ({
  getOrCreateGuestUserId: getOrCreateGuestUserIdMock
}));

import RoadmapPage from "@/app/roadmap/page";

beforeEach(() => {
  getOrCreateGuestUserIdMock.mockReset();
  ensureCurrentPlanForUserMock.mockReset();

  getOrCreateGuestUserIdMock.mockResolvedValue("guest_user");
  ensureCurrentPlanForUserMock.mockResolvedValue({
    plan: {
      id: "plan_1",
      goalPath: "python_for_ai_workflows",
      currentMilestoneIndex: 1
    },
    planContract: {
      planTitle: "Python Automation Roadmap",
      domainId: "python",
      tags: ["python", "automation"],
      goalSummary: "Build Python automation habits.",
      totalEstimatedWeeks: 3,
      currentStrategy: "Keep the path concrete.",
      todayLessonSeed: {
        milestoneId: "m1",
        lessonType: "setup",
        objective: "Get the environment running"
      },
      warnings: [],
      milestones: [
        {
          id: "m1",
          index: 1,
          title: "Bootstrap Python",
          purpose: "Get a working environment.",
          outcome: "Python scripts run locally.",
          prerequisites: [],
          successCriteria: ["python3 --version works"],
          recommendedWeeks: 1,
          lessonTypes: ["setup"],
          status: "active"
        },
        {
          id: "m2",
          index: 2,
          title: "Automate a small task",
          purpose: "Turn one repeated task into a script.",
          outcome: "One script saves time.",
          prerequisites: ["m1"],
          successCriteria: ["A script runs end to end"],
          recommendedWeeks: 1,
          lessonTypes: ["practice"],
          status: "pending"
        },
        {
          id: "m3",
          index: 3,
          title: "Extend the workflow",
          purpose: "Build confidence through one variation.",
          outcome: "The workflow handles one extra case.",
          prerequisites: ["m2"],
          successCriteria: ["The script handles two cases"],
          recommendedWeeks: 1,
          lessonTypes: ["project"],
          status: "pending"
        }
      ]
    },
    milestones: [
      {
        id: "m1",
        index: 1,
        title: "Bootstrap Python",
        purpose: "Get a working environment.",
        outcome: "Python scripts run locally.",
        prerequisites: [],
        successCriteria: ["python3 --version works"],
        recommendedWeeks: 1,
        lessonTypes: ["setup"],
        status: "active"
      },
      {
        id: "m2",
        index: 2,
        title: "Automate a small task",
        purpose: "Turn one repeated task into a script.",
        outcome: "One script saves time.",
        prerequisites: ["m1"],
        successCriteria: ["A script runs end to end"],
        recommendedWeeks: 1,
        lessonTypes: ["practice"],
        status: "pending"
      },
      {
        id: "m3",
        index: 3,
        title: "Extend the workflow",
        purpose: "Build confidence through one variation.",
        outcome: "The workflow handles one extra case.",
        prerequisites: ["m2"],
        successCriteria: ["The script handles two cases"],
        recommendedWeeks: 1,
        lessonTypes: ["project"],
        status: "pending"
      }
    ],
    currentLessonId: "lesson_1",
    currentLesson: null
  });
});

test("shows 3 milestones", async () => {
  render(await RoadmapPage());

  expect(screen.getAllByTestId("milestone-card")).toHaveLength(3);
});
