import { describe, expect, it } from "vitest";
import { buildSummaryText } from "./summaryText";

describe("buildSummaryText", () => {
  it("lists every non-payer participant with their amount, skipping the payer", () => {
    const text = buildSummaryText("Dinner with Friends", 10125, [
      { name: "You", isPayer: true, amountCents: 3777 },
      { name: "James", isPayer: false, amountCents: 2330 },
      { name: "Sophia", isPayer: false, amountCents: 1848 },
    ]);

    expect(text).toContain("Dinner with Friends — ₱101.25");
    expect(text).toContain("James: ₱23.30");
    expect(text).toContain("Sophia: ₱18.48");
    expect(text).not.toContain("You:");
  });

  it("still produces a header line with no participants", () => {
    const text = buildSummaryText("Empty Bill", 0, []);
    expect(text).toBe("Empty Bill — ₱0.00\n");
  });
});
