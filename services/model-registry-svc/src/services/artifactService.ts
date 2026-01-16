/**
 * AIVO Model Registry Service - Artifact Service
 *
 * Business logic for model artifact management (files, weights, etc.)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '../config.js';
import { prisma } from '../prisma.js';
import type { InitiateUploadInput, ArtifactType } from '../types/index.js';

// Initialize S3 client
const s3Client = new S3Client({
  region: config.s3.region,
  ...(config.s3.endpoint && { endpoint: config.s3.endpoint }),
  ...(config.s3.accessKeyId && {
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey!,
    },
  }),
});

/**
 * Generate S3 key for an artifact.
 */
function generateS3Key(
  tenantId: string,
  modelId: string,
  versionId: string,
  artifactId: string,
  filename: string
): string {
  return `models/${tenantId}/${modelId}/${versionId}/${artifactId}/${filename}`;
}

/**
 * Initiate an artifact upload (returns presigned URL).
 */
export async function initiateUpload(
  tenantId: string,
  modelId: string,
  versionId: string,
  uploadedBy: string,
  input: InitiateUploadInput
) {
  // Validate file size
  if (input.sizeBytes > config.registry.maxArtifactSizeBytes) {
    throw new Error(
      `Artifact size ${input.sizeBytes} exceeds maximum allowed ${config.registry.maxArtifactSizeBytes}`
    );
  }

  // Check for duplicate artifact
  const existing = await prisma.artifact.findFirst({
    where: {
      versionId,
      type: input.type,
      name: input.name,
    },
  });

  if (existing) {
    throw new Error(`Artifact with type ${input.type} and name ${input.name} already exists`);
  }

  // Create artifact record (pending upload)
  const artifact = await prisma.artifact.create({
    data: {
      versionId,
      type: input.type,
      name: input.name,
      description: input.description,
      storageUri: '', // Will be set after upload
      storageBucket: config.s3.bucket,
      storageKey: '', // Will be set after upload
      sizeBytes: BigInt(input.sizeBytes),
      checksum: input.checksum,
      checksumAlgo: 'sha256',
      mimeType: input.mimeType,
      metadata: input.metadata || {},
      uploadedBy,
    },
  });

  // Generate S3 key
  const s3Key = generateS3Key(tenantId, modelId, versionId, artifact.id, input.name);

  // Generate presigned upload URL
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
    ContentLength: input.sizeBytes,
    ContentType: input.mimeType || 'application/octet-stream',
    ChecksumSHA256: input.checksum,
    Metadata: {
      'tenant-id': tenantId,
      'model-id': modelId,
      'version-id': versionId,
      'artifact-id': artifact.id,
      'artifact-type': input.type,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.registry.presignedUrlExpiresSec,
  });

  // Update artifact with storage location
  await prisma.artifact.update({
    where: { id: artifact.id },
    data: {
      storageUri: `s3://${config.s3.bucket}/${s3Key}`,
      storageKey: s3Key,
    },
  });

  const expiresAt = new Date(Date.now() + config.registry.presignedUrlExpiresSec * 1000);

  return {
    artifactId: artifact.id,
    uploadUrl,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Complete an artifact upload (verify and finalize).
 */
export async function completeUpload(artifactId: string) {
  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
    include: {
      version: {
        select: { modelId: true, model: { select: { tenantId: true } } },
      },
    },
  });

  if (!artifact) {
    throw new Error('Artifact not found');
  }

  // Verify file exists in S3
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: artifact.storageBucket!,
      Key: artifact.storageKey!,
    });

    const headResult = await s3Client.send(headCommand);

    // Verify size matches
    if (headResult.ContentLength !== Number(artifact.sizeBytes)) {
      throw new Error(
        `Size mismatch: expected ${artifact.sizeBytes}, got ${headResult.ContentLength}`
      );
    }

    return artifact;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      throw new Error('Artifact file not found in storage. Upload may not have completed.');
    }
    throw error;
  }
}

/**
 * Get download URL for an artifact.
 */
export async function getDownloadUrl(artifactId: string) {
  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
  });

  if (!artifact) {
    throw new Error('Artifact not found');
  }

  const command = new GetObjectCommand({
    Bucket: artifact.storageBucket!,
    Key: artifact.storageKey!,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.registry.presignedUrlExpiresSec,
  });

  const expiresAt = new Date(Date.now() + config.registry.presignedUrlExpiresSec * 1000);

  return {
    artifactId: artifact.id,
    downloadUrl,
    expiresAt: expiresAt.toISOString(),
    filename: artifact.name,
    sizeBytes: Number(artifact.sizeBytes),
    checksum: artifact.checksum,
    mimeType: artifact.mimeType,
  };
}

/**
 * List artifacts for a version.
 */
export async function listArtifacts(versionId: string, type?: ArtifactType) {
  const where: any = { versionId };

  if (type) {
    where.type = type;
  }

  return prisma.artifact.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  });
}

/**
 * Get artifact by ID.
 */
export async function getArtifactById(artifactId: string) {
  return prisma.artifact.findUnique({
    where: { id: artifactId },
    include: {
      version: {
        select: {
          id: true,
          version: true,
          modelId: true,
          model: {
            select: { name: true, tenantId: true },
          },
        },
      },
    },
  });
}

/**
 * Delete an artifact.
 */
export async function deleteArtifact(artifactId: string) {
  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
    include: {
      version: {
        select: { stage: true },
      },
    },
  });

  if (!artifact) {
    throw new Error('Artifact not found');
  }

  // Cannot delete artifacts from production versions
  if (artifact.version.stage === 'PRODUCTION') {
    throw new Error('Cannot delete artifacts from production versions');
  }

  // Delete from S3
  if (artifact.storageKey) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: artifact.storageBucket!,
        Key: artifact.storageKey,
      });
      await s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete artifact from S3:', error);
      // Continue with database deletion even if S3 fails
    }
  }

  // Delete from database
  return prisma.artifact.delete({
    where: { id: artifactId },
  });
}

/**
 * Get total artifact size for a version.
 */
export async function getVersionArtifactSize(versionId: string) {
  const result = await prisma.artifact.aggregate({
    where: { versionId },
    _sum: { sizeBytes: true },
    _count: true,
  });

  return {
    totalSizeBytes: Number(result._sum.sizeBytes || 0),
    artifactCount: result._count,
  };
}
