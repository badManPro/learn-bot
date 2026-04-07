import { render, screen } from "@testing-library/react";

import OnboardingPage from "@/app/onboarding/page";

test("renders all required onboarding fields", () => {
  render(<OnboardingPage />);

  expect(screen.getByLabelText(/学习目标/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/当前基础/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/每周可投入时间/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/目标截止时间/i)).toBeInTheDocument();
});
