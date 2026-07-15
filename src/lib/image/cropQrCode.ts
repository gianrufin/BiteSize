import jsQR from "jsqr";

export interface QrCropResult {
  blob: Blob;
  cropped: boolean;
}

// Payers often upload a full screenshot of the GCash app rather than a tight
// crop of just the QR code. jsQR locates the QR pattern's four corners in the
// image; we bound-box those corners, pad out a bit so the crop doesn't clip
// the quiet zone around the code, and crop to that instead of uploading the
// whole screenshot (nav bars, balance, promos, and all).
export async function autoCropQrCode(
  file: File,
  maxDimension = 800,
  quality = 0.9,
): Promise<QrCropResult> {
  const bitmap = await createImageBitmap(file);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = bitmap.width;
  sourceCanvas.height = bitmap.height;
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) return { blob: file, cropped: false };

  sourceCtx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });

  if (!code) return { blob: file, cropped: false };

  const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } =
    code.location;
  const xs = [topLeftCorner.x, topRightCorner.x, bottomLeftCorner.x, bottomRightCorner.x];
  const ys = [topLeftCorner.y, topRightCorner.y, bottomLeftCorner.y, bottomRightCorner.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const padding = Math.max(maxX - minX, maxY - minY) * 0.3;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(sourceCanvas.width - cropX, maxX - minX + padding * 2);
  const cropHeight = Math.min(sourceCanvas.height - cropY, maxY - minY + padding * 2);

  const scale = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
  const outputWidth = Math.round(cropWidth * scale);
  const outputHeight = Math.round(cropHeight * scale);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = outputWidth;
  cropCanvas.height = outputHeight;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) return { blob: file, cropped: false };

  cropCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    cropCanvas.toBlob(resolve, "image/jpeg", quality),
  );

  return blob ? { blob, cropped: true } : { blob: file, cropped: false };
}
