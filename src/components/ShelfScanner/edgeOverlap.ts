// Static-photo overlap check: compares the trailing edge strip of the
// previous photo against the leading edge strip of the next one. Both
// images are downsampled to a tiny canvas before diffing, so this is a
// one-off pixel comparison between two JPEGs — never a continuous video
// analysis loop.
const EDGE_STRIP_FRACTION = 0.18;
const SAMPLE_WIDTH = 24;
const SAMPLE_HEIGHT = 48;

// "15-20% variance allowed" from the product brief, expressed as a
// normalized (0-1) average channel difference across the sampled strip.
export const MAX_OVERLAP_VARIANCE = 0.18;

export interface EdgeOverlapResult {
  isMatch: boolean;
  variance: number;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load frame for edge overlap check"));
    img.src = dataUrl;
  });
}

function sampleEdgeStrip(img: HTMLImageElement, edge: "left" | "right"): Uint8ClampedArray | null {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const stripWidth = img.naturalWidth * EDGE_STRIP_FRACTION;
  const sourceX = edge === "right" ? img.naturalWidth - stripWidth : 0;

  ctx.drawImage(img, sourceX, 0, stripWidth, img.naturalHeight, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  return ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
}

export async function checkEdgeOverlap(
  previousFrameUrl: string,
  nextFrameUrl: string,
): Promise<EdgeOverlapResult> {
  const [previousImg, nextImg] = await Promise.all([loadImage(previousFrameUrl), loadImage(nextFrameUrl)]);

  const previousStrip = sampleEdgeStrip(previousImg, "right");
  const nextStrip = sampleEdgeStrip(nextImg, "left");

  if (!previousStrip || !nextStrip || previousStrip.length !== nextStrip.length) {
    return { isMatch: false, variance: 1 };
  }

  let diffSum = 0;
  for (let i = 0; i < previousStrip.length; i += 4) {
    diffSum += Math.abs(previousStrip[i] - nextStrip[i]);
    diffSum += Math.abs(previousStrip[i + 1] - nextStrip[i + 1]);
    diffSum += Math.abs(previousStrip[i + 2] - nextStrip[i + 2]);
  }

  const channelSamples = (previousStrip.length / 4) * 3;
  const variance = diffSum / channelSamples / 255;

  return { isMatch: variance <= MAX_OVERLAP_VARIANCE, variance };
}
