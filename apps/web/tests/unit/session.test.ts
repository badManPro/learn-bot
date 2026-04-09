import { getOrCreateGuestUserId } from "@/lib/session";

test("creates and reuses guest user id", async () => {
  const first = await getOrCreateGuestUserId();
  const second = await getOrCreateGuestUserId();

  expect(first).toBe(second);
});
