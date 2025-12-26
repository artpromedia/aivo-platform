import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { gzipSync, brotliCompressSync, constants } from 'zlib';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  threshold: number; // Minimum size to compress (bytes)
  level: number; // Compression level (1-9 for gzip, 0-11 for brotli)
  preferBrotli: boolean;
  mimeTypes: string[];
}

const defaultConfig: CompressionConfig = {
  threshold: 1024, // 1KB
  level: 6,
  preferBrotli: true,
  mimeTypes: [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'application/javascript',
    'text/javascript',
    'application/xml',
    'text/xml',
  ],
};

/**
 * Response Compression Interceptor
 *
 * Compresses API responses using gzip or brotli based on:
 * - Client Accept-Encoding header
 * - Response size threshold
 * - Content type
 */
@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private config: CompressionConfig;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const acceptEncoding = request.headers['accept-encoding'] || '';
    const supportsBrotli = acceptEncoding.includes('br');
    const supportsGzip = acceptEncoding.includes('gzip');

    if (!supportsBrotli && !supportsGzip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Skip if no data
        if (!data) {
          return data;
        }

        // Serialize data
        const serialized =
          typeof data === 'string' ? data : JSON.stringify(data);
        const buffer = Buffer.from(serialized, 'utf-8');

        // Skip if below threshold
        if (buffer.length < this.config.threshold) {
          return data;
        }

        // Check content type
        const contentType = response.getHeader('content-type') as string;
        if (contentType && !this.shouldCompress(contentType)) {
          return data;
        }

        // Compress
        let compressed: Buffer;
        let encoding: string;

        if (supportsBrotli && this.config.preferBrotli) {
          compressed = brotliCompressSync(buffer, {
            params: {
              [constants.BROTLI_PARAM_QUALITY]: Math.min(
                this.config.level,
                11
              ),
            },
          });
          encoding = 'br';
        } else if (supportsGzip) {
          compressed = gzipSync(buffer, { level: this.config.level });
          encoding = 'gzip';
        } else {
          return data;
        }

        // Only use compression if it actually reduces size
        if (compressed.length >= buffer.length) {
          return data;
        }

        // Set compression headers
        response.setHeader('Content-Encoding', encoding);
        response.setHeader('Content-Length', compressed.length);
        response.setHeader('Vary', 'Accept-Encoding');

        // Remove any existing content-length
        response.removeHeader('content-length');

        // Return compressed buffer
        return compressed;
      })
    );
  }

  private shouldCompress(contentType: string): boolean {
    const lowerType = contentType.toLowerCase();
    return this.config.mimeTypes.some((type) => lowerType.includes(type));
  }
}

/**
 * Streaming compression for large responses
 */
export function createCompressionStream(
  acceptEncoding: string,
  config: Partial<CompressionConfig> = {}
): {
  stream: NodeJS.WritableStream | null;
  encoding: string | null;
} {
  const mergedConfig = { ...defaultConfig, ...config };

  const supportsBrotli = acceptEncoding.includes('br');
  const supportsGzip = acceptEncoding.includes('gzip');

  if (supportsBrotli && mergedConfig.preferBrotli) {
    const { createBrotliCompress } = require('zlib');
    return {
      stream: createBrotliCompress({
        params: {
          [constants.BROTLI_PARAM_QUALITY]: Math.min(mergedConfig.level, 11),
        },
      }),
      encoding: 'br',
    };
  }

  if (supportsGzip) {
    const { createGzip } = require('zlib');
    return {
      stream: createGzip({ level: mergedConfig.level }),
      encoding: 'gzip',
    };
  }

  return { stream: null, encoding: null };
}

/**
 * ETag generation for cache validation
 */
export function generateETag(content: string | Buffer): string {
  const { createHash } = require('crypto');
  const hash = createHash('md5')
    .update(content)
    .digest('hex')
    .slice(0, 16);
  return `"${hash}"`;
}

/**
 * ETag interceptor for conditional requests
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        if (!data || request.method !== 'GET') {
          return data;
        }

        const serialized =
          typeof data === 'string' ? data : JSON.stringify(data);
        const etag = generateETag(serialized);

        response.setHeader('ETag', etag);

        // Check If-None-Match
        const ifNoneMatch = request.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          response.status(304);
          return null;
        }

        return data;
      })
    );
  }
}
