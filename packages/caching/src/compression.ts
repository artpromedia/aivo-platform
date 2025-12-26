import { gzipSync, gunzipSync } from 'zlib';

/**
 * Compress a string using gzip
 */
export function compress(data: string): string {
  const buffer = Buffer.from(data, 'utf-8');
  const compressed = gzipSync(buffer, { level: 6 });
  return compressed.toString('base64');
}

/**
 * Decompress a gzipped base64 string
 */
export function decompress(data: string): string {
  const buffer = Buffer.from(data, 'base64');
  const decompressed = gunzipSync(buffer);
  return decompressed.toString('utf-8');
}

/**
 * Check if compression would be beneficial
 */
export function shouldCompress(data: string, threshold: number = 1024): boolean {
  return Buffer.byteLength(data, 'utf-8') > threshold;
}

/**
 * Get compression ratio for monitoring
 */
export function getCompressionRatio(original: string, compressed: string): number {
  const originalSize = Buffer.byteLength(original, 'utf-8');
  const compressedSize = Buffer.byteLength(compressed, 'utf-8');
  return compressedSize / originalSize;
}
