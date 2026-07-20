type Rgb = {
  r: number;
  g: number;
  b: number;
};

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function colorDistance(left: Rgb, right: Rgb) {
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isLightPixel(r: number, g: number, b: number, threshold = 205) {
  return (r + g + b) / 3 >= threshold;
}

function readPixel(data: Uint8ClampedArray, index: number): Rgb {
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
  };
}

function estimateEdgeBackground(data: Uint8ClampedArray, width: number, height: number) {
  const samples: Rgb[] = [];
  const sampleLimit = Math.max(8, Math.floor(Math.min(width, height) / 24));

  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / sampleLimit))) {
    const topIndex = x * 4;
    const bottomIndex = ((height - 1) * width + x) * 4;
    samples.push(readPixel(data, topIndex));
    samples.push(readPixel(data, bottomIndex));
  }

  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / sampleLimit))) {
    const leftIndex = y * width * 4;
    const rightIndex = (y * width + (width - 1)) * 4;
    samples.push(readPixel(data, leftIndex));
    samples.push(readPixel(data, rightIndex));
  }

  const lightSamples = samples.filter((pixel) => isLightPixel(pixel.r, pixel.g, pixel.b, 180));
  const pool = lightSamples.length ? lightSamples : samples;

  if (!pool.length) {
    return { r: 255, g: 255, b: 255 };
  }

  const total = pool.reduce(
    (acc, pixel) => {
      acc.r += pixel.r;
      acc.g += pixel.g;
      acc.b += pixel.b;
      return acc;
    },
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: clampByte(total.r / pool.length),
    g: clampByte(total.g / pool.length),
    b: clampByte(total.b / pool.length),
  };
}

function isBackgroundPixel(pixel: Rgb, alpha: number, background: Rgb) {
  if (alpha === 0) {
    return true;
  }

  if (!isLightPixel(pixel.r, pixel.g, pixel.b, 170)) {
    return false;
  }

  return colorDistance(pixel, background) <= 52;
}

function getNeighborIndexes(index: number, width: number, height: number) {
  const pixelIndex = index / 4;
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  const neighbors: number[] = [];

  if (x > 0) {
    neighbors.push(index - 4);
  }
  if (x < width - 1) {
    neighbors.push(index + 4);
  }
  if (y > 0) {
    neighbors.push(index - width * 4);
  }
  if (y < height - 1) {
    neighbors.push(index + width * 4);
  }

  return neighbors;
}

async function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    image.src = sourceUrl;
  });
}

export async function createTransparentBackgroundDataUrl(sourceUrl: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return sourceUrl;
  }

  const normalizedSource = String(sourceUrl || '').trim();
  if (!normalizedSource) {
    return sourceUrl;
  }

  try {
    const image = await loadImage(normalizedSource);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width || 1;
    canvas.height = image.naturalHeight || image.height || 1;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return sourceUrl;
    }

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const background = estimateEdgeBackground(data, canvas.width, canvas.height);
    const visited = new Uint8Array(canvas.width * canvas.height);
    const queue: number[] = [];

    for (let x = 0; x < canvas.width; x += 1) {
      queue.push(x * 4);
      queue.push(((canvas.height - 1) * canvas.width + x) * 4);
    }
    for (let y = 0; y < canvas.height; y += 1) {
      queue.push(y * canvas.width * 4);
      queue.push((y * canvas.width + (canvas.width - 1)) * 4);
    }

    while (queue.length) {
      const index = queue.pop() as number;
      const pixelIndex = Math.floor(index / 4);
      if (visited[pixelIndex]) {
        continue;
      }
      visited[pixelIndex] = 1;

      const alpha = data[index + 3] || 0;
      const pixel = readPixel(data, index);
      if (!isBackgroundPixel(pixel, alpha, background)) {
        continue;
      }

      data[index + 3] = 0;

      const neighbors = getNeighborIndexes(index, canvas.width, canvas.height);
      for (const neighbor of neighbors) {
        const neighborIndex = Math.floor(neighbor / 4);
        if (!visited[neighborIndex]) {
          queue.push(neighbor);
        }
      }
    }

    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return sourceUrl;
  }
}

export function shouldAttemptTransparentCutout(prompt: string) {
  return /透明底|透明背景|抠图|去背景|去白底|白底去除|无背景/.test(String(prompt || ''));
}
