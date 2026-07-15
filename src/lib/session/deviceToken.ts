import { cookies } from "next/headers";
import { nanoid } from "nanoid";

const COOKIE_NAME = "bitesize_device";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Every browser gets one persistent, anonymous device token. It's how we tell a
 * session's payer apart from its participants without any real auth (see plan
 * Section 3): the token is just matched against `sessions.payer_device_token` /
 * `participants.device_token` on each request.
 */
export async function getOrCreateDeviceToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = nanoid(21);
  store.set(COOKIE_NAME, token, {
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return token;
}

export async function getDeviceToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}
