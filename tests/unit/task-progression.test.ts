import { getNextVisibleTaskIndex } from "@/lib/domain/progress";

test("advances to the next task after completion or skip", () => {
  expect(getNextVisibleTaskIndex([true, false, false])).toBe(1);
  expect(getNextVisibleTaskIndex([true, true, false])).toBe(2);
});
