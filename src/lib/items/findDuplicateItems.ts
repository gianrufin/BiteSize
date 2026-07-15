// Flags item pairs whose names look like the same thing scanned/typed twice
// (e.g. "Iced Tea" and "Iced Tea " from a receipt line that got OCR'd oddly,
// or a manual re-add of something already on the list). Pure string
// similarity — no knowledge of prices/quantities, so it can't tell you
// whether merging is *correct*, only that it's worth asking about.

export interface DuplicateCandidateItem {
  id: string;
  name: string;
}

export interface DuplicatePair<T extends DuplicateCandidateItem> {
  a: T;
  b: T;
}

const SIMILARITY_THRESHOLD = 0.72;
const MIN_NAME_LENGTH = 4;

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[rows - 1][cols - 1];
}

function nameSimilarity(nameA: string, nameB: string): number {
  const a = normalize(nameA);
  const b = normalize(nameB);
  if (a === b) return 1;

  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;

  return 1 - levenshteinDistance(a, b) / maxLength;
}

export function findDuplicateItems<T extends DuplicateCandidateItem>(
  items: T[],
): DuplicatePair<T>[] {
  const pairs: DuplicatePair<T>[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (normalize(a.name).length < MIN_NAME_LENGTH) continue;
      if (normalize(b.name).length < MIN_NAME_LENGTH) continue;

      if (nameSimilarity(a.name, b.name) >= SIMILARITY_THRESHOLD) {
        pairs.push({ a, b });
      }
    }
  }

  return pairs;
}
