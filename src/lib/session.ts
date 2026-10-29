import "server-only";
import { cookies } from "next/headers";
import { findParticipantByToken, type Room } from "./rooms";

const cookieName = (slug: string) => `np_${slug}`;

export async function readSessionParticipant(room: Room) {
  const token = (await cookies()).get(cookieName(room.slug))?.value;
  return token ? findParticipantByToken(room.id, token) : null;
}

export async function setSession(slug: string, token: string) {
  (await cookies()).set(cookieName(slug), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearSession(slug: string) {
  (await cookies()).delete(cookieName(slug));
}
