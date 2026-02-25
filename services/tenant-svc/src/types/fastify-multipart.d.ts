/**
 * Type augmentation for @fastify/multipart.
 *
 * We declare a minimal subset here because pnpm's strict node_modules
 * prevents TypeScript from resolving the transitive @fastify/busboy
 * types that @fastify/multipart/types/index.d.ts imports.
 */
import 'fastify';

interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  file: NodeJS.ReadableStream;
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  fields: Record<string, unknown>;
}

declare module 'fastify' {
  interface FastifyRequest {
    file: () => Promise<MultipartFile | undefined>;
    files: () => AsyncIterableIterator<MultipartFile>;
    isMultipart: () => boolean;
  }
}
