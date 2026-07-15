// Uppercases the first letter of each word without touching the rest of the
// word, so "iced tea" -> "Iced Tea" but "BBQ wings" -> "BBQ Wings" (an
// already-correct acronym isn't lowercased into "Bbq").
export function autoCapitalize(name: string): string {
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
}
