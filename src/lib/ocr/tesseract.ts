import { createWorker } from "tesseract.js";

// Runs entirely in the browser (WASM), not a Vercel serverless function — receipt
// OCR routinely takes several seconds, well past the Hobby-tier 10s function
// timeout, and client-side execution sidesteps that entirely at the cost of a
// larger client bundle (fetched once, cached by the browser after).
export async function recognizeReceiptText(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}
