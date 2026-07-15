// Shared between the API routes that write sessions.gcash_number and any client-side
// form that collects one, so the rule ("11-digit 09xxxxxxxxx") only lives in one place.

export function normalizeGcashNumber(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function isValidGcashNumber(value: string): boolean {
  return /^09\d{9}$/.test(normalizeGcashNumber(value));
}
