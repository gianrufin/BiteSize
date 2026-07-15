import { formatCents } from "@/lib/format";

export interface SummaryTextParticipant {
  name: string;
  isPayer: boolean;
  amountCents: number;
}

// Plain-text rendering of the payer's summary, meant to be pasted into a group
// chat — so everyone has the numbers without opening the app.
export function buildSummaryText(
  billName: string,
  grandTotalCents: number,
  participants: SummaryTextParticipant[],
): string {
  const lines = [`${billName} — ${formatCents(grandTotalCents)}`, ""];

  for (const participant of participants) {
    if (participant.isPayer) continue;
    lines.push(`${participant.name}: ${formatCents(participant.amountCents)}`);
  }

  return lines.join("\n");
}
