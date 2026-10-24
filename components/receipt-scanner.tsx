const MAX_EDGE = 1600;
const SKIP_UNDER = 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isReceiptImage(file: File) {
  return IMAGE_TYPES.has(file.type);
}

export async function compressReceipt(file: File) {
  if (file.size < SKIP_UNDER) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  return blob ?? file;
}

export async function uploadReceipt(file: File) {
  const prepared = await compressReceipt(file);
  const body = new FormData();
  const upload =
    prepared instanceof File ? prepared : new File([prepared], "receipt.jpg", { type: "image/jpeg" });
  body.set("file", upload);
  const response = await fetch("/api/scan-receipt", { method: "POST", body });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (response.status === 429) {
    const error = new Error("SCAN LIMIT REACHED. TRY AGAIN LATER.");
    error.name = "ScanLimitError";
    throw error;
  }
  if (response.status === 503 && (json as { error?: unknown } | null)?.error === "SCANNER_BUSY") {
    const error = new Error("SCANNER_BUSY");
    error.name = "ScannerBusyError";
    throw error;
  }
  if (!response.ok || json == null || typeof json !== "object") {
    throw new Error(String(response.status || "scan"));
  }
  return json;
}
