import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const MODEL = "gemini-3.1-flash-lite";

// The model reports every money value exactly as printed (a decimal major-unit
// amount) rather than doing the cents conversion itself — asking it to multiply by
// 100 turned out to be unreliable (it would sometimes just strip the ".00" instead
// of scaling). Cents conversion happens here in code, where it's guaranteed correct.
const RawReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  confidence: z.number().min(0).max(1),
});

const RawTextItemsSchema = z.object({
  items: z.array(RawReceiptItemSchema),
});

const RawReceiptSchema = z.object({
  items: z.array(RawReceiptItemSchema),
  currencyCode: z.string().nullable(),
  venueName: z.string().nullable(),
});

export interface ExtractedReceiptItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  confidence: number;
}

export interface ExtractedReceipt {
  items: ExtractedReceiptItem[];
  currencyCode: string | null;
  venueName: string | null;
}

const PROMPT = `This is a photo of a printed receipt. It may be rotated, skewed, creased,
or faintly printed. Read every purchased line item — ignore subtotal, total, savings,
and other summary lines.

For each item:
- name: transcribe it as printed. You may expand an unambiguous abbreviation, but
  don't guess at anything you can't read confidently.
- quantity: the number of units bought (default to 1 if the receipt doesn't show one).
- unitPrice: the price per unit exactly as printed, as a plain decimal number (e.g. a
  line printed "12.50" is 12.5). Do not convert currency or scale the number in any
  way — just transcribe the printed decimal value. If the receipt only prints a line
  total, divide it by quantity.
- confidence: your own 0–1 confidence in this line's accuracy. Lower it for anything
  illegible, ambiguous, or guessed.

Also identify the currency the receipt is printed in from its symbol, code, or
context (e.g. "₱" or "PHP" → "PHP", "$" in a US context → "USD", "€" → "EUR"):
- currencyCode: the ISO 4217 three-letter currency code, or null if you can't tell.

Also read the name of the restaurant/store printed at the top of the receipt:
- venueName: the business name as printed, or null if it isn't legible or present.

If the image contains no readable receipt, return an empty items array and null for
currencyCode and venueName.

Respond with JSON only, matching the given schema.`;

type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp";

export async function extractReceipt(
  imageBase64: string,
  mediaType: SupportedMediaType,
): Promise<ExtractedReceipt> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: mediaType, data: imageBase64 } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(RawReceiptSchema),
    },
  });

  const empty: ExtractedReceipt = { items: [], currencyCode: null, venueName: null };
  if (!response.text) return empty;

  const parsed = RawReceiptSchema.safeParse(JSON.parse(response.text));
  if (!parsed.success) return empty;

  const currencyCode =
    parsed.data.currencyCode && /^[A-Z]{3}$/.test(parsed.data.currencyCode)
      ? parsed.data.currencyCode
      : null;

  const venueName = parsed.data.venueName?.trim() || null;

  return {
    items: parsed.data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: Math.round(item.unitPrice * 100),
      confidence: item.confidence,
    })),
    currencyCode,
    venueName,
  };
}

const TEXT_ITEMS_PROMPT = `The following is a pasted block of text — copied from a notes app, a group
chat, or typed by hand — describing what a group ordered. Lines might look like
"2x Burger 250", "Fries x2 @125", "1. Cola - 60", "Latte  180", or similar loose
formats; they won't be as clean as a printed receipt.

Extract every distinct order line as an item:
- name: the item name, cleaned up (don't include the quantity or price in it).
- quantity: the number of units, defaulting to 1 if none is stated.
- unitPrice: the price per unit as a plain decimal number. If only a line total is
  given for multiple units, divide it by quantity to get the per-unit price.
- confidence: your own 0–1 confidence in this line's accuracy. Lower it for anything
  ambiguous, like a line with no clear price.

Ignore lines that aren't an order (greetings, totals, running commentary). If nothing
in the text looks like an order, return an empty items array.

Respond with JSON only, matching the given schema.

Text:
"""
{{TEXT}}
"""`;

export async function extractItemsFromText(text: string): Promise<ExtractedReceiptItem[]> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: TEXT_ITEMS_PROMPT.replace("{{TEXT}}", text) }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(RawTextItemsSchema),
    },
  });

  if (!response.text) return [];

  const parsed = RawTextItemsSchema.safeParse(JSON.parse(response.text));
  if (!parsed.success) return [];

  return parsed.data.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: Math.round(item.unitPrice * 100),
    confidence: item.confidence,
  }));
}
