import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

import OnboardingPage from "@/app/onboarding/page";

afterEach(() => {
  vi.unstubAllGlobals();
  pushMock.mockReset();
});

test("renders all required onboarding fields", () => {
  render(<OnboardingPage />);

  expect(screen.getByLabelText(/学习目标/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/当前基础/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/每周可投入时间/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/目标截止时间/i)).toBeInTheDocument();
});

test("shows roadmap generation dialog and navigates on success", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValue({
    json: async () => ({
      redirectTo: "/roadmap",
      status: "ok"
    }),
    ok: true
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<OnboardingPage />);

  await user.type(screen.getByLabelText(/学习目标/i), "我想学 Python 做 AI 应用");
  await user.selectOptions(screen.getByLabelText(/当前基础/i), "zero");
  await user.type(screen.getByLabelText(/每周可投入时间/i), "240");
  await user.type(screen.getByLabelText(/目标截止时间/i), "2026-05-05");
  await user.click(screen.getByRole("button", { name: /开始生成我的学习路线/i }));

  expect(screen.getByRole("dialog", { name: /正在为「我想学 Python 做 AI 应用」生成路线图/i })).toBeInTheDocument();
  expect(screen.getByText(/拆成三段可执行里程碑/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith("/api/onboarding", {
      body: JSON.stringify({
        currentLevel: "zero",
        goalText: "我想学 Python 做 AI 应用",
        mbti: "",
        targetDeadline: "2026-05-05",
        weeklyTimeBudgetMinutes: "240"
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    expect(pushMock).toHaveBeenCalledWith("/roadmap");
  });
});

test("shows inline error when roadmap generation fails", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValue({
    json: async () => ({
      errors: {
        formErrors: ["目标信息还不完整"]
      },
      status: "error"
    }),
    ok: false
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<OnboardingPage />);

  await user.type(screen.getByLabelText(/学习目标/i), "我想学 Python 做 AI 应用");
  await user.type(screen.getByLabelText(/每周可投入时间/i), "240");
  await user.type(screen.getByLabelText(/目标截止时间/i), "2026-05-05");
  await user.click(screen.getByRole("button", { name: /开始生成我的学习路线/i }));

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("目标信息还不完整");
  });

  expect(pushMock).not.toHaveBeenCalled();
});
