/**
 * Utility to compress and generate thumbnails client-side using HTML5 Canvas.
 */

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Loads a File/Blob as an HTMLImageElement.
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file. It might be corrupt or an unsupported format.'));
    };
    img.src = url;
  });
}

/**
 * Compresses an image file, scaling it down proportionally if it exceeds maxWidth/maxHeight.
 */
export async function compressImage(
  file: File,
  options: ResizeOptions = { maxWidth: 1920, maxHeight: 1080, quality: 0.85 }
): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.85 } = options;
  const img = await loadImage(file);

  let width = img.width;
  let height = img.height;

  // Scale proportionally
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    // Export as JPEG for high compression
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas export to blob failed'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Generates a cropped 200x200px square thumbnail from an image file.
 */
export async function generateSquareThumbnail(
  file: File,
  size: number = 200,
  quality: number = 0.8
): Promise<Blob> {
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  // Calculate cropping parameters to center the square crop
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;

  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas thumbnail export failed'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}
