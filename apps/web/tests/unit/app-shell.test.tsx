import { vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock
}));

import HomePage from "@/app/page";

test("redirects home to onboarding", () => {
  HomePage();
  expect(redirectMock).toHaveBeenCalledWith("/onboarding");
});
