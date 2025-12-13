# @aivo/ts-storage

Tenant-scoped file storage service for the AIVO learning platform.

## Features

- **Tenant Isolation**: All files stored in tenant-specific paths with S3 key prefixes
- **Presigned URLs**: Secure upload/download via time-limited presigned URLs
- **Virus Scanning**: Automatic malware scanning before storage
- **Access Control**: Role-based file access with parent/guardian permissions
- **File Tracking**: Database records for all stored files with audit trail
- **Automatic Cleanup**: Background job for expired and orphaned files

## Installation

```bash
pnpm add @aivo/ts-storage
```

## Usage

### Basic Setup

```typescript
import { StorageService } from '@aivo/ts-storage';

const storage = new StorageService({
  bucket: 'aivo-files',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  // Optional: S3-compatible endpoint (MinIO, R2, etc.)
  endpoint: process.env.S3_ENDPOINT,
});
```

### Upload Flow (Client-side Upload)

```typescript
// 1. Get presigned upload URL
const { uploadUrl, key, fileId } = await storage.getPresignedUploadUrl({
  tenantId: 'tenant-123',
  uploadedById: 'user-456',
  ownerId: 'learner-789',
  ownerType: 'learner',
  category: 'HOMEWORK_IMAGE',
  filename: 'homework.jpg',
  mimeType: 'image/jpeg',
});

// 2. Client uploads directly to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileData,
  headers: { 'Content-Type': 'image/jpeg' },
});

// 3. Finalize upload (virus scan + record update)
const storedFile = await storage.finalizeUpload(fileId, 'tenant-123');
```

### Download Flow

```typescript
// Get presigned download URL
const downloadUrl = await storage.getPresignedDownloadUrl(
  fileId,
  tenantId,
  userId,
  { expiresInSeconds: 3600 }
);
```

## File Categories

| Category | Description | Max Size | Allowed Types |
|----------|-------------|----------|---------------|
| `IEP_DOCUMENT` | Individualized Education Programs | 50MB | PDF |
| `HOMEWORK_IMAGE` | Photos of homework | 10MB | JPEG, PNG, HEIC |
| `ASSESSMENT_AUDIO` | Speech assessment recordings | 100MB | MP3, WAV, M4A |
| `ASSESSMENT_VIDEO` | Video assessments | 500MB | MP4, MOV |
| `AVATAR_IMAGE` | Profile pictures | 5MB | JPEG, PNG |
| `EXPORTED_REPORT` | Generated PDF reports | 25MB | PDF |
| `ATTACHMENT` | General attachments | 25MB | Various |

## S3 Key Structure

Files are stored with tenant isolation enforced at the key level:

```
{tenantId}/{ownerType}/{ownerId}/{category}/{uuid}/{filename}

Example:
tenant-abc123/learner/learner-xyz789/HOMEWORK_IMAGE/f47ac10b-58cc-4372-a567-0e02b2c3d479/homework.jpg
```

## Security

- **Tenant Isolation**: S3 keys always include tenant ID as the first path segment
- **Presigned URLs**: Time-limited access (default 1 hour)
- **Virus Scanning**: All uploads scanned before finalization
- **Access Control**: Role-based permissions checked before URL generation
- **Audit Logging**: All file operations logged for compliance

## Environment Variables

```env
# Required
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
STORAGE_BUCKET=aivo-files
STORAGE_REGION=us-east-1

# Optional (for S3-compatible services)
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true

# Virus scanning
VIRUS_SCANNER_PROVIDER=clamav|virustotal|mock
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
VIRUSTOTAL_API_KEY=your-api-key
```

## License

Private - AIVO Platform
