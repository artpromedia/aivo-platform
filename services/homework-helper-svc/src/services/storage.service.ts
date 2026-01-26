/**
 * Storage Service
 * Handles image upload to object storage (S3/GCS/MinIO)
 */

import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface StorageConfig {
  bucket: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  useSSL?: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  etag?: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// STORAGE SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class StorageService {
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly region: string;
  private readonly useSSL: boolean;
  private isConfigured: boolean;

  constructor(config?: StorageConfig) {
    const envConfig = this.loadFromEnv();

    this.bucket = config?.bucket ?? envConfig.bucket;
    this.endpoint = config?.endpoint ?? envConfig.endpoint;
    this.accessKey = config?.accessKey ?? envConfig.accessKey;
    this.secretKey = config?.secretKey ?? envConfig.secretKey;
    this.region = config?.region ?? envConfig.region;
    this.useSSL = config?.useSSL ?? envConfig.useSSL;

    this.isConfigured = !!(this.accessKey && this.secretKey && this.endpoint);
  }

  private loadFromEnv(): StorageConfig & { region: string; useSSL: boolean } {
    return {
      bucket: config.storageBucket,
      endpoint: config.storageEndpoint,
      accessKey: config.storageAccessKey,
      secretKey: config.storageSecretKey,
      region: process.env.STORAGE_REGION ?? 'us-east-1',
      useSSL: process.env.STORAGE_USE_SSL !== 'false',
    };
  }

  /**
   * Check if storage is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload an image to storage
   */
  async uploadImage(
    imageBuffer: Buffer,
    key: string,
    contentType?: string
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Storage service not configured');
    }

    // Detect content type if not provided
    const detectedContentType = contentType ?? this.detectContentType(imageBuffer);

    // Ensure key has proper extension
    const finalKey = this.ensureExtension(key, detectedContentType);

    try {
      // Use native fetch for S3-compatible API
      const url = await this.putObject(finalKey, imageBuffer, detectedContentType);
      return url;
    } catch (error) {
      throw new Error(
        `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a signed URL for accessing an object
   */
  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Storage service not configured');
    }

    // Generate a pre-signed URL
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const stringToSign = `GET\n\n\n${expires}\n/${this.bucket}/${key}`;

    const signature = await this.sign(stringToSign);
    const encodedSignature = encodeURIComponent(signature);

    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}/${this.bucket}/${key}?AWSAccessKeyId=${this.accessKey}&Expires=${expires}&Signature=${encodedSignature}`;
  }

  /**
   * Delete an object from storage
   */
  async deleteObject(key: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Storage service not configured');
    }

    const protocol = this.useSSL ? 'https' : 'http';
    const url = `${protocol}://${this.endpoint}/${this.bucket}/${key}`;

    const date = new Date().toUTCString();
    const stringToSign = `DELETE\n\n\n${date}\n/${this.bucket}/${key}`;
    const signature = await this.sign(stringToSign);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Date: date,
        Authorization: `AWS ${this.accessKey}:${signature}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete object: ${response.statusText}`);
    }
  }

  /**
   * Check if an object exists
   */
  async objectExists(key: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    const protocol = this.useSSL ? 'https' : 'http';
    const url = `${protocol}://${this.endpoint}/${this.bucket}/${key}`;

    const date = new Date().toUTCString();
    const stringToSign = `HEAD\n\n\n${date}\n/${this.bucket}/${key}`;
    const signature = await this.sign(stringToSign);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          Date: date,
          Authorization: `AWS ${this.accessKey}:${signature}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List objects with a given prefix
   */
  async listObjects(prefix: string, maxKeys: number = 1000): Promise<StorageObject[]> {
    if (!this.isConfigured) {
      throw new Error('Storage service not configured');
    }

    const protocol = this.useSSL ? 'https' : 'http';
    const url = `${protocol}://${this.endpoint}/${this.bucket}?prefix=${encodeURIComponent(prefix)}&max-keys=${maxKeys}`;

    const date = new Date().toUTCString();
    const stringToSign = `GET\n\n\n${date}\n/${this.bucket}/`;
    const signature = await this.sign(stringToSign);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Date: date,
        Authorization: `AWS ${this.accessKey}:${signature}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list objects: ${response.statusText}`);
    }

    const text = await response.text();
    return this.parseListResponse(text);
  }

  /**
   * Get the public URL for an object (if bucket is public)
   */
  getPublicUrl(key: string): string {
    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}/${this.bucket}/${key}`;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private async putObject(
    key: string,
    data: Buffer,
    contentType: string
  ): Promise<string> {
    const protocol = this.useSSL ? 'https' : 'http';
    const url = `${protocol}://${this.endpoint}/${this.bucket}/${key}`;

    const date = new Date().toUTCString();
    const contentMD5 = await this.md5(data);
    const stringToSign = `PUT\n${contentMD5}\n${contentType}\n${date}\n/${this.bucket}/${key}`;
    const signature = await this.sign(stringToSign);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-MD5': contentMD5,
        'Content-Length': data.length.toString(),
        Date: date,
        Authorization: `AWS ${this.accessKey}:${signature}`,
      },
      body: data,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return url;
  }

  private async sign(stringToSign: string): Promise<string> {
    // Use Node.js crypto for HMAC-SHA1 signing
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha1', this.secretKey);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  private async md5(data: Buffer): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('base64');
  }

  private detectContentType(buffer: Buffer): string {
    // Check magic bytes
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return 'image/jpeg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return 'image/png';
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49) {
      return 'image/gif';
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49) {
      return 'image/webp';
    }
    if (buffer[0] === 0x25 && buffer[1] === 0x50) {
      return 'application/pdf';
    }

    // Default to octet-stream if unknown
    return 'application/octet-stream';
  }

  private ensureExtension(key: string, contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };

    const ext = extensions[contentType];
    if (ext && !key.endsWith(ext)) {
      return `${key}${ext}`;
    }

    return key;
  }

  private parseListResponse(xml: string): StorageObject[] {
    const objects: StorageObject[] = [];

    // Simple XML parsing for ListBucketResult
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;

    while ((match = contentRegex.exec(xml)) !== null) {
      const content = match[1];

      const keyMatch = content.match(/<Key>(.*?)<\/Key>/);
      const sizeMatch = content.match(/<Size>(\d+)<\/Size>/);
      const lastModifiedMatch = content.match(/<LastModified>(.*?)<\/LastModified>/);

      if (keyMatch && sizeMatch) {
        objects.push({
          key: keyMatch[1],
          size: Number.parseInt(sizeMatch[1], 10),
          lastModified: lastModifiedMatch
            ? new Date(lastModifiedMatch[1])
            : new Date(),
        });
      }
    }

    return objects;
  }
}

// Export singleton instance
export const storageService = new StorageService();
