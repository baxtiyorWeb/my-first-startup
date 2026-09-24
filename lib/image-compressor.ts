/**
 * Client-side high-efficiency image compressor.
 * Crops to square and resizes to maxDimension using HTML5 Canvas.
 * Compresses to WebP (0.85 quality) to reduce file size from ~5MB to ~50KB
 * without any visible quality degradation for avatars.
 */
export async function compressAvatarImage(
  file: File,
  maxDimension = 400,
  quality = 0.85
): Promise<File> {
  // If file is SVG, do not compress via canvas (vector remains vector)
  if (file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // Calculate center square crop
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        const targetSize = Math.min(maxDimension, minSide);

        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file); // Fallback to original
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw center-cropped square
        ctx.drawImage(
          img,
          startX,
          startY,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }

            const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
            const compressedFile = new File([blob], `${cleanBaseName}.webp`, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
