import { describe, expect, it } from "vitest";
import { parseReceiptItems } from "./parseReceiptText";

describe("parseReceiptItems", () => {
  it("parses a clean receipt with explicit quantities", () => {
    const text = [
      "La Cucina Bistro",
      "123 Main St",
      "--------------------------------",
      "2   Truffle Pasta       28.00",
      "1   Margherita Pizza    16.00",
      "2   Garlic Bread        10.00",
      "--------------------------------",
      "SUBTOTAL                54.00",
      "SERVICE CHARGE (10%)     5.40",
      "TOTAL                   59.40",
    ].join("\n");

    const items = parseReceiptItems(text);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      name: "Truffle Pasta",
      quantity: 2,
      unitPriceCents: 1400,
      totalPriceCents: 2800,
    });
    expect(items[1]).toMatchObject({
      name: "Margherita Pizza",
      quantity: 1,
      unitPriceCents: 1600,
      totalPriceCents: 1600,
    });
    expect(items[2]).toMatchObject({
      name: "Garlic Bread",
      quantity: 2,
      unitPriceCents: 500,
      totalPriceCents: 1000,
    });
  });

  it("defaults to quantity 1 when no leading quantity is present", () => {
    const items = parseReceiptItems("Iced Tea    3.50");
    expect(items).toEqual([
      expect.objectContaining({ name: "Iced Tea", quantity: 1, totalPriceCents: 350 }),
    ]);
  });

  it("skips subtotal/tax/service/tip/total lines", () => {
    const text = [
      "Chickenjoy 2pc      159.00",
      "Subtotal            159.00",
      "VAT (12%)            19.08",
      "Service Charge       15.90",
      "Tip                  10.00",
      "Total               204.98",
      "Discount              5.00",
      "Cash                250.00",
      "Change               45.02",
    ].join("\n");

    const items = parseReceiptItems(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Chickenjoy 2pc");
  });

  it("skips header/footer noise lines with no trailing price", () => {
    const text = [
      "Receipt No: 00123",
      "Date: 07/15/2026  Time: 7:45 PM",
      "Table 4  Server: Maria",
      "1 Caesar Salad      12.00",
      "Thank you for dining with us!",
    ].join("\n");

    const items = parseReceiptItems(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Caesar Salad");
  });

  it("handles comma-formatted thousands in prices", () => {
    const items = parseReceiptItems("1 Premium Wagyu Set   1,250.00");
    expect(items[0].totalPriceCents).toBe(125000);
  });

  it("ignores blank lines and lines without a trailing decimal price", () => {
    const text = ["", "   ", "Just some noise text", "1 Lemonade   6.00"].join("\n");
    const items = parseReceiptItems(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Lemonade");
  });

  it("gives higher confidence to lines with an explicit quantity than without", () => {
    const withQty = parseReceiptItems("2 Tiramisu   12.00")[0];
    const withoutQty = parseReceiptItems("Tiramisu   12.00")[0];
    expect(withQty.confidence).toBeGreaterThan(withoutQty.confidence);
  });

  it("flags non-alphabetic names as low confidence rather than dropping them", () => {
    const items = parseReceiptItems("12   5.00");
    expect(items).toHaveLength(1);
    expect(items[0].confidence).toBeLessThanOrEqual(0.35);
  });

  it("drops single-character names as pure noise", () => {
    expect(parseReceiptItems("A   5.00")).toHaveLength(0);
  });

  it("strips a stray unit-price column that precedes the line total", () => {
    const items = parseReceiptItems("2 Truffle Pasta   14.00   28.00");
    expect(items[0]).toMatchObject({
      name: "Truffle Pasta",
      quantity: 2,
      totalPriceCents: 2800,
    });
  });
});
