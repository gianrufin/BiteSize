import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODEL = "claude-sonnet-5";

const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number().int(),
  confidence: z.number().min(0).max(1),
});

const ReceiptSchema = z.object({
  items: z.array(ReceiptItemSchema),
});

export type ExtractedReceiptItem = z.infer<typeof ReceiptItemSchema>;

const PROMPT = `This is a photo of a printed receipt. It may be rotated, skewed, creased,
or faintly printed. Read every purchased line item — ignore subtotal, tax, total,
savings, and other summary lines.

For each item:
- name: transcribe it as printed. You may expand an unambiguous abbreviation, but
  don't guess at anything you can't read confidently.
- quantity: the number of units bought (default to 1 if the receipt doesn't show one).
- unitPriceCents: the price per unit in integer cents (e.g. $2.50 is 250). If the
  receipt only prints a line total, divide it by quantity and round to the nearest cent.
- confidence: your own 0–1 confidence in this line's accuracy. Lower it for anything
  illegible, ambiguous, or guessed.

If the image contains no readable receipt, return an empty items array.`;

type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function extractReceiptItems(
  imageBase64: string,
  mediaType: SupportedMediaType,
): Promise<ExtractedReceiptItem[]> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ReceiptSchema) },
  });

  return response.parsed_output?.items ?? [];
}
