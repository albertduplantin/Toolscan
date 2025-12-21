/**
 * Silhouette Detection Algorithm
 *
 * This algorithm compares two images (empty cabinet vs full cabinet)
 * to detect tool silhouettes using Canvas API for image processing.
 *
 * Algorithm steps:
 * 1. Load both images (empty and full)
 * 2. Convert to grayscale
 * 3. Calculate pixel difference
 * 4. Apply threshold to create binary mask
 * 5. Find contours (connected components)
 * 6. Extract bounding boxes for each tool
 * 7. Return silhouette data and positions
 */

export interface SilhouetteData {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  imageData: string; // Base64 encoded silhouette
}

export interface DetectionResult {
  silhouettes: SilhouetteData[];
  processedImageUrl: string;
}

/**
 * Load an image from URL and return canvas context
 */
async function loadImage(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Convert image to grayscale
 */
function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(imageData.width * imageData.height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    // Standard grayscale conversion formula
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return gray;
}

/**
 * Calculate absolute difference between two grayscale images
 */
function calculateDifference(
  gray1: Uint8ClampedArray,
  gray2: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const diff = new Uint8ClampedArray(width * height);

  for (let i = 0; i < gray1.length; i++) {
    diff[i] = Math.abs(gray1[i] - gray2[i]);
  }

  return diff;
}

/**
 * Apply threshold to create binary mask
 */
function applyThreshold(
  diff: Uint8ClampedArray,
  threshold: number = 30
): Uint8ClampedArray {
  const binary = new Uint8ClampedArray(diff.length);

  for (let i = 0; i < diff.length; i++) {
    binary[i] = diff[i] > threshold ? 255 : 0;
  }

  return binary;
}

/**
 * Find connected components (simple flood fill)
 */
function findConnectedComponents(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
  minArea: number = 500
): SilhouetteData[] {
  const visited = new Uint8ClampedArray(width * height);
  const silhouettes: SilhouetteData[] = [];

  const floodFill = (startX: number, startY: number): SilhouetteData | null => {
    const pixels: [number, number][] = [[startX, startY]];
    const component: [number, number][] = [];

    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;

    while (pixels.length > 0) {
      const [x, y] = pixels.pop()!;
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx] || binary[idx] === 0) continue;

      visited[idx] = 1;
      component.push([x, y]);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Check 8-connected neighbors
      pixels.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      pixels.push([x + 1, y + 1], [x + 1, y - 1], [x - 1, y + 1], [x - 1, y - 1]);
    }

    const area = component.length;
    if (area < minArea) return null;

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    // Extract silhouette image data
    const silCanvas = document.createElement('canvas');
    silCanvas.width = w;
    silCanvas.height = h;
    const silCtx = silCanvas.getContext('2d');
    if (!silCtx) return null;

    const silImageData = silCtx.createImageData(w, h);
    for (const [px, py] of component) {
      const x = px - minX;
      const y = py - minY;
      const idx = (y * w + x) * 4;
      silImageData.data[idx] = 255;     // R
      silImageData.data[idx + 1] = 0;   // G
      silImageData.data[idx + 2] = 0;   // B
      silImageData.data[idx + 3] = 255; // A
    }
    silCtx.putImageData(silImageData, 0, 0);

    return {
      x: minX,
      y: minY,
      width: w,
      height: h,
      area,
      imageData: silCanvas.toDataURL(),
    };
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binary[idx] === 255 && !visited[idx]) {
        const silhouette = floodFill(x, y);
        if (silhouette) {
          silhouettes.push(silhouette);
        }
      }
    }
  }

  return silhouettes;
}

/**
 * Main detection function
 */
export async function detectSilhouettes(
  emptyImageUrl: string,
  fullImageUrl: string
): Promise<DetectionResult> {
  try {
    // Load both images
    const emptyCanvas = await loadImage(emptyImageUrl);
    const fullCanvas = await loadImage(fullImageUrl);

    const width = emptyCanvas.width;
    const height = emptyCanvas.height;

    // Ensure images have same dimensions
    if (fullCanvas.width !== width || fullCanvas.height !== height) {
      throw new Error('Images must have the same dimensions');
    }

    const emptyCtx = emptyCanvas.getContext('2d')!;
    const fullCtx = fullCanvas.getContext('2d')!;

    const emptyImageData = emptyCtx.getImageData(0, 0, width, height);
    const fullImageData = fullCtx.getImageData(0, 0, width, height);

    // Convert to grayscale
    const emptyGray = toGrayscale(emptyImageData);
    const fullGray = toGrayscale(fullImageData);

    // Calculate difference
    const diff = calculateDifference(emptyGray, fullGray, width, height);

    // Apply threshold
    const binary = applyThreshold(diff, 30);

    // Find connected components
    const silhouettes = findConnectedComponents(binary, width, height, 500);

    // Create processed image showing detection
    const processedCanvas = document.createElement('canvas');
    processedCanvas.width = width;
    processedCanvas.height = height;
    const processedCtx = processedCanvas.getContext('2d')!;
    processedCtx.drawImage(fullCanvas, 0, 0);

    // Draw bounding boxes on processed image
    processedCtx.strokeStyle = 'red';
    processedCtx.lineWidth = 3;
    for (const sil of silhouettes) {
      processedCtx.strokeRect(sil.x, sil.y, sil.width, sil.height);
    }

    return {
      silhouettes,
      processedImageUrl: processedCanvas.toDataURL(),
    };
  } catch (error) {
    console.error('Error detecting silhouettes:', error);
    throw error;
  }
}
