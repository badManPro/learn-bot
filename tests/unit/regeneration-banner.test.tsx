import { render, screen } from "@testing-library/react";

import { RegenerationBanner } from "@/components/lesson/regeneration-banner";

test("shows simplification message", () => {
  render(<RegenerationBanner message="已为你简化任务" />);

  expect(screen.getByText(/已为你简化任务/i)).toBeInTheDocument();
});
