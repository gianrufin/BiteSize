import { describe, expect, it } from "vitest";
import { findDuplicateItems } from "./findDuplicateItems";

describe("findDuplicateItems", () => {
  it("flags an exact duplicate name", () => {
    const items = [
      { id: "1", name: "Iced Tea" },
      { id: "2", name: "Iced Tea" },
    ];

    const pairs = findDuplicateItems(items);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].a.id).toBe("1");
    expect(pairs[0].b.id).toBe("2");
  });

  it("flags a near-duplicate with a small typo or casing/whitespace difference", () => {
    const items = [
      { id: "1", name: "Margherita Pizza" },
      { id: "2", name: "margherita  pizzaa" },
    ];

    expect(findDuplicateItems(items)).toHaveLength(1);
  });

  it("does not flag clearly different items", () => {
    const items = [
      { id: "1", name: "Cheeseburger" },
      { id: "2", name: "French Fries" },
      { id: "3", name: "Iced Coffee" },
    ];

    expect(findDuplicateItems(items)).toEqual([]);
  });

  it("ignores very short names to avoid noisy false positives", () => {
    const items = [
      { id: "1", name: "Ice" },
      { id: "2", name: "Rice" },
    ];

    expect(findDuplicateItems(items)).toEqual([]);
  });

  it("finds multiple independent duplicate pairs", () => {
    const items = [
      { id: "1", name: "Coke" },
      { id: "2", name: "Coke" },
      { id: "3", name: "Sprite" },
      { id: "4", name: "Sprite" },
    ];

    const pairs = findDuplicateItems(items);
    expect(pairs).toHaveLength(2);
  });

  it("returns an empty array for fewer than two items", () => {
    expect(findDuplicateItems([])).toEqual([]);
    expect(findDuplicateItems([{ id: "1", name: "Coke" }])).toEqual([]);
  });
});
