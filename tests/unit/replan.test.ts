import { buildReplanResult } from "@/lib/domain/replan";

test("default replan inserts review work and extends schedule", () => {
  const result = buildReplanResult({
    mode: "rearrange",
    reason: "inactive"
  });

  expect(result.recommendedMode).toBe("rearrange");
  expect(result.insertReviewLesson).toBe(true);
  expect(result.extendScheduleDays).toBeGreaterThan(0);
});
