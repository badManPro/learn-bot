import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

export const GUEST_USER_COOKIE_NAME = "guest_user_id";

const fallbackSession = {
  guestUserId: undefined as string | undefined
};

export async function getOrCreateGuestUserId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const existingGuestUserId = cookieStore.get(GUEST_USER_COOKIE_NAME)?.value;

    if (existingGuestUserId) {
      return existingGuestUserId;
    }

    const guestUserId = randomUUID();

    cookieStore.set(GUEST_USER_COOKIE_NAME, guestUserId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return guestUserId;
  } catch {
    if (!fallbackSession.guestUserId) {
      fallbackSession.guestUserId = randomUUID();
    }

    return fallbackSession.guestUserId;
  }
}
