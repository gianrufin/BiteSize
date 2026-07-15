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

const RawReceiptSchema = z.object({
  items: z.array(RawReceiptItemSchema),
  tax: z.number().nullable(),
  serviceCharge: z.number().nullable(),
});

export interface ExtractedReceiptItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  confidence: number;
}

export interface ExtractedReceipt {
  items: ExtractedReceiptItem[];
  taxCents: number | null;
  serviceChargeCents: number | null;
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

Also look for a separate tax line (e.g. "VAT", "Tax", "GST") and a separate service
charge line, if the receipt prints them as their own line items rather than folding
them into item prices:
- tax: the printed tax amount as a plain decimal number, or null if there isn't one.
- serviceCharge: the printed service charge amount as a plain decimal number, or null
  if there isn't one.

If the image contains no readable receipt, return an empty items array and null for
tax and serviceCharge.

Respond with JSON only, matching the given schema.`;

type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp";

function toCents(amount: number | null): number | null {
  return amount === null ? null : Math.round(amount * 100);
}

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

  if (!response.text) return { items: [], taxCents: null, serviceChargeCents: null };

  const parsed = RawReceiptSchema.safeParse(JSON.parse(response.text));
  if (!parsed.success) return { items: [], taxCents: null, serviceChargeCents: null };

  return {
    items: parsed.data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: Math.round(item.unitPrice * 100),
      confidence: item.confidence,
    })),
    taxCents: toCents(parsed.data.tax),
    serviceChargeCents: toCents(parsed.data.serviceCharge),
  };
}
