// Warm, food-adjacent palette variants of the app's accent family — distinct
// enough to tell people apart at a glance, still cohesive with the rest of
// the UI rather than a generic bright-primary avatar set.
const AVATAR_COLORS = [
  "#8A9A6E", // sage (the app's own accent)
  "#C97B5F", // terracotta
  "#D9A44E", // ochre / amber
  "#6E8AA8", // dusty blue
  "#B5654B", // clay
  "#7C8B5A", // olive
  "#A67B9E", // mauve
  "#5F9A8F", // teal
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Deterministic per-id color, so a person's avatar stays the same color
// across renders and reorders instead of flickering to a new random one.
export function colorForId(id: string): string {
  return AVATAR_COLORS[hashString(id) % AVATAR_COLORS.length];
}

export function initialsForName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  id,
  name,
  size = 36,
}: {
  id: string;
  name: string;
  size?: number;
}) {
  return (
    <div
      style={{
        backgroundColor: colorForId(id),
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white"
    >
      {initialsForName(name)}
    </div>
  );
}
