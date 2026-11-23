/**
 * Prepares a photo in the browser before upload: honours EXIF orientation, scales the
 * longest side down to `maxSize`, and re-encodes as JPEG. Re-encoding also strips EXIF
 * metadata such as GPS location — guests' photos shouldn't leak where they live.
 */
export async function preparePhoto(file: File, maxSize = 2400, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {imageOrientation: "from-image"});
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("canvas unavailable");
    }
    context.fillStyle = "#ffffff"; // transparent PNGs become white, not black
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) {
      throw new Error("encode failed");
    }
    return blob;
  } finally {
    bitmap.close();
  }
}
