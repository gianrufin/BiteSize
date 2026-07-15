import { customAlphabet } from "nanoid";

// Uppercase alphanumeric, no ambiguous characters (0/O, 1/I/L) — short enough to read
// off a screen or type from a share link, long enough to be unguessable as a capability
// token (36^8 ≈ 2.8 trillion combinations).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const generate = customAlphabet(ALPHABET, 8);

export function generateSessionCode(): string {
  return generate();
}
