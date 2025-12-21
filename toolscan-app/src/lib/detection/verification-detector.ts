/**
 * Verification Algorithm
 *
 * Compares a captured image with configured tool silhouettes
 * to determine which tools are missing from the cabinet.
 *
 * Algorithm:
 * 1. Load captured image
 * 2. Load reference empty image
 * 3. Calculate difference between captured and empty
 * 4. For each configured tool silhouette:
 *    - Check if the region shows significant difference
 *    - If difference is high enough, tool is present
 *    - If difference is low, tool is missing
 * 5. Return list of missing and present tools
 */

export interface VerificationResult {
  missingTools: string[]; // Array of tool IDs
  presentTools: string[]; // Array of tool IDs
  confidenceScore: number; // 0-100
  capturedImageUrl?: string;
}

interface ToolSilhouette {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  silhouetteData?: any;
}

/**
 * Load image from URL and return as ImageData
 */
async function loadImageData(url: string): Promise<ImageData> {
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
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };

    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Convert ImageData to grayscale array
 */
function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(imageData.width * imageData.height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return gray;
}

/**
 * Calculate average absolute difference in a region
 */
function calculateRegionDifference(
  gray1: Uint8ClampedArray,
  gray2: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  regionWidth: number,
  regionHeight: number
): number {
  let totalDiff = 0;
  let pixelCount = 0;

  for (let py = y; py < y + regionHeight && py < gray1.length / width; py++) {
    for (let px = x; px < x + regionWidth && px < width; px++) {
      const idx = py * width + px;
      if (idx < gray1.length && idx < gray2.length) {
        totalDiff += Math.abs(gray1[idx] - gray2[idx]);
        pixelCount++;
      }
    }
  }

  return pixelCount > 0 ? totalDiff / pixelCount : 0;
}

/**
 * Resize image to match reference dimensions
 */
function resizeImageData(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Create temporary canvas with source image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Failed to get temp canvas context');

  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);

  // Resize to target dimensions
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);

  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

/**
 * Main verification function
 */
export async function verifyTools(
  capturedImageUrl: string,
  emptyImageUrl: string,
  tools: ToolSilhouette[],
  threshold: number = 30 // Minimum average difference to consider tool present
): Promise<VerificationResult> {
  try {
    // Load images
    const capturedData = await loadImageData(capturedImageUrl);
    let emptyData = await loadImageData(emptyImageUrl);

    // Ensure images have same dimensions
    if (capturedData.width !== emptyData.width || capturedData.height !== emptyData.height) {
      console.log('Resizing empty image to match captured image dimensions');
      emptyData = resizeImageData(emptyData, capturedData.width, capturedData.height);
    }

    const width = capturedData.width;

    // Convert to grayscale
    const capturedGray = toGrayscale(capturedData);
    const emptyGray = toGrayscale(emptyData);

    const missingTools: string[] = [];
    const presentTools: string[] = [];
    let totalConfidence = 0;

    // Check each tool region
    for (const tool of tools) {
      const { x, y, width: w, height: h } = tool.position;

      // Scale positions if necessary (in case image was resized)
      const scaleX = width / capturedData.width;
      const scaleY = capturedData.height / emptyData.height;

      const scaledX = Math.floor(x * scaleX);
      const scaledY = Math.floor(y * scaleY);
      const scaledWidth = Math.floor(w * scaleX);
      const scaledHeight = Math.floor(h * scaleY);

      // Calculate difference in tool region
      const regionDiff = calculateRegionDifference(
        capturedGray,
        emptyGray,
        width,
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight
      );

      // If difference is significant, tool is present
      if (regionDiff > threshold) {
        presentTools.push(tool.id);
        totalConfidence += Math.min(100, (regionDiff / threshold) * 50);
      } else {
        missingTools.push(tool.id);
        totalConfidence += Math.max(0, 50 - (regionDiff / threshold) * 50);
      }
    }

    // Calculate overall confidence score
    const confidenceScore = tools.length > 0
      ? Math.round(totalConfidence / tools.length)
      : 0;

    return {
      missingTools,
      presentTools,
      confidenceScore,
      capturedImageUrl,
    };
  } catch (error) {
    console.error('Error in verification:', error);
    throw error;
  }
}

/**
 * Helper function to generate verification overlay image
 */
export async function generateVerificationOverlay(
  capturedImageUrl: string,
  tools: ToolSilhouette[],
  missingToolIds: string[]
): Promise<string> {
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

      // Draw captured image
      ctx.drawImage(img, 0, 0);

      // Draw red overlays for missing tools
      const missingTools = tools.filter(t => missingToolIds.includes(t.id));

      for (const tool of missingTools) {
        const { x, y, width, height } = tool.position;

        // Semi-transparent red fill
        ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
        ctx.fillRect(x, y, width, height);

        // Red border
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Tool name label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(x, y - 28, width, 28);

        ctx.fillStyle = 'rgba(220, 38, 38, 1)';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(tool.name, x + 8, y - 8);
      }

      // Draw green checkmarks for present tools
      const presentTools = tools.filter(t => !missingToolIds.includes(t.id));

      for (const tool of presentTools) {
        const { x, y, width } = tool.position;

        // Green checkmark
        ctx.strokeStyle = 'rgba(34, 197, 94, 1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + width - 30, y + 15);
        ctx.lineTo(x + width - 20, y + 25);
        ctx.lineTo(x + width - 10, y + 10);
        ctx.stroke();
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => reject(new Error('Failed to load captured image'));
    img.src = capturedImageUrl;
  });
}
