// Turns raw OCR text into candidate line items. This is inherently heuristic —
// receipts vary wildly in layout and OCR output is noisy — so every result carries
// a confidence score and nothing here is ever trusted blindly: it only ever
// pre-fills the same item editor a manual entry would, fully editable/deletable.

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  confidence: number;
}

// Lines that are receipt metadata/summary rows, not purchasable items. Matched
// against the start of the line (after stripping the trailing price) so a real
// item that happens to contain one of these words elsewhere isn't skipped.
const NON_ITEM_PREFIXES = [
  "subtotal",
  "sub total",
  "total",
  "tax",
  "vat",
  "service charge",
  "svc chg",
  "svc charge",
  "tip",
  "gratuity",
  "cash",
  "change",
  "discount",
  "amount due",
  "balance due",
  "balance",
  "card",
  "payment",
  "thank you",
  "receipt",
  "table",
  "server",
  "cashier",
  "qty",
  "item",
  "description",
  "order",
  "date",
  "time",
  "invoice",
  "reference",
  "no.",
];

const TRAILING_PRICE = /(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/;
const LEADING_QUANTITY = /^(\d{1,2})\s*[xX]?\s+(?=\D)/;

function isNonItemLine(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return NON_ITEM_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function parseReceiptItems(rawText: string): ParsedReceiptItem[] {
  const items: ParsedReceiptItem[] = [];

  for (const rawLine of rawText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const priceMatch = line.match(TRAILING_PRICE);
    if (!priceMatch) continue;

    const priceCents = Math.round(parseFloat(priceMatch[1].replace(/,/g, "")) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) continue;

    let rest = line.slice(0, priceMatch.index).trim();
    // Receipts often print a trailing unit-price/qty column before the line
    // total (e.g. "Truffle Pasta  14.00  2  28.00") — strip a second trailing
    // number if one remains, since the item name is what's left after that.
    rest = rest.replace(/\d{1,3}(?:,\d{3})*\.\d{2}\s*$/, "").trim();
    rest = rest.replace(/[-–—.\s]+$/, "").trim();

    if (!rest || isNonItemLine(rest)) continue;

    let quantity = 1;
    const qtyMatch = rest.match(LEADING_QUANTITY);
    let name = rest;
    let hadExplicitQuantity = false;
    if (qtyMatch) {
      const parsedQty = parseInt(qtyMatch[1], 10);
      if (parsedQty > 0 && parsedQty <= 20) {
        quantity = parsedQty;
        name = rest.slice(qtyMatch[0].length).trim();
        hadExplicitQuantity = true;
      }
    }

    name = name.replace(/\s{2,}/g, " ").trim();
    if (name.length < 2) continue;

    const totalPriceCents = priceCents;
    const unitPriceCents = Math.round(totalPriceCents / quantity);

    let confidence = 0.6;
    if (hadExplicitQuantity && name.length >= 3) confidence = 0.85;
    if (name.length <= 2 || /^[^a-zA-Z]*$/.test(name)) confidence = 0.35;

    items.push({ name, quantity, unitPriceCents, totalPriceCents, confidence });
  }

  return items;
}
