import { render, screen } from "@testing-library/react";

import RoadmapPage from "@/app/roadmap/page";

test("shows 3 milestones", async () => {
  render(await RoadmapPage());

  expect(screen.getAllByTestId("milestone-card")).toHaveLength(3);
});
