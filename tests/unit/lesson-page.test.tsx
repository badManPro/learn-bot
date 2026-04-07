import { render, screen } from "@testing-library/react";

import LessonPage from "@/app/lesson/[lessonId]/page";

test("shows completion criteria before lesson content", async () => {
  render(await LessonPage({ params: Promise.resolve({ lessonId: "lesson_1" }) }));

  expect(screen.getByText(/完成标准/i)).toBeInTheDocument();
});
