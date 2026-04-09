import { expect, test } from "@playwright/test";

test("user can regenerate the current lesson from the lesson page", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("学习目标").fill("我想学 Python 做 AI 工作流");
  await page.getByLabel("当前基础").selectOption("zero");
  await page.getByLabel("每周可投入时间").fill("240");
  await page.getByLabel("目标截止时间").fill("2026-05-05");
  await page.getByRole("button", { name: /开始/i }).click();

  await expect(page).toHaveURL(/roadmap/);

  await page.getByRole("link", { name: /开始今天一课/i }).click();

  await expect(page).toHaveURL(/lesson\//);

  await page.getByRole("button", { name: /太难了，帮我简化/i }).click();

  await expect(page.getByText(/Lesson Regenerated/i)).toBeVisible();
  await expect(page.getByText(/已为你简化任务/i)).toBeVisible();
});
