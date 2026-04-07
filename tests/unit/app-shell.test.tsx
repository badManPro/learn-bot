import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

test("renders start CTA", () => {
  render(<HomePage />);
  expect(screen.getByRole("link", { name: /开始/i })).toBeInTheDocument();
});
