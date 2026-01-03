/**
 * Type definitions for tenant-scoped file storage
 *
 * @module @aivo/ts-storage/types
 */
/**
 * Default category configurations
 */
export const FILE_CATEGORY_CONFIGS = {
    IEP_DOCUMENT: {
        category: 'IEP_DOCUMENT',
        maxSizeBytes: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['application/pdf'],
        defaultExpirationDays: null,
        requireVirusScan: true,
    },
    HOMEWORK_IMAGE: {
        category: 'HOMEWORK_IMAGE',
        maxSizeBytes: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
        defaultExpirationDays: 90,
        requireVirusScan: true,
    },
    ASSESSMENT_AUDIO: {
        category: 'ASSESSMENT_AUDIO',
        maxSizeBytes: 100 * 1024 * 1024, // 100MB
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/mp4'],
        defaultExpirationDays: null,
        requireVirusScan: true,
    },
    ASSESSMENT_VIDEO: {
        category: 'ASSESSMENT_VIDEO',
        maxSizeBytes: 500 * 1024 * 1024, // 500MB
        allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
        defaultExpirationDays: null,
        requireVirusScan: true,
    },
    AVATAR_IMAGE: {
        category: 'AVATAR_IMAGE',
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        defaultExpirationDays: null,
        requireVirusScan: true,
    },
    EXPORTED_REPORT: {
        category: 'EXPORTED_REPORT',
        maxSizeBytes: 25 * 1024 * 1024, // 25MB
        allowedMimeTypes: ['application/pdf'],
        defaultExpirationDays: 30,
        requireVirusScan: false, // Server-generated
    },
    ATTACHMENT: {
        category: 'ATTACHMENT',
        maxSizeBytes: 25 * 1024 * 1024, // 25MB
        allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'text/plain',
        ],
        defaultExpirationDays: null,
        requireVirusScan: true,
    },
    OTHER: {
        category: 'OTHER',
        maxSizeBytes: 25 * 1024 * 1024, // 25MB
        allowedMimeTypes: ['*/*'],
        defaultExpirationDays: 30,
        requireVirusScan: true,
    },
};
// ============================================================================
// Validation Helpers
// ============================================================================
/**
 * Validate file against category configuration
 */
export function validateFileForCategory(category, mimeType, size) {
    const config = FILE_CATEGORY_CONFIGS[category];
    // Check size
    if (size !== undefined && size > config.maxSizeBytes) {
        return {
            valid: false,
            error: `File size ${size} exceeds maximum ${config.maxSizeBytes} bytes for category ${category}`,
        };
    }
    // Check MIME type
    if (!config.allowedMimeTypes.includes('*/*')) {
        const normalizedMime = mimeType.toLowerCase();
        const isAllowed = config.allowedMimeTypes.some((allowed) => {
            if (allowed.endsWith('/*')) {
                return normalizedMime.startsWith(allowed.slice(0, -1));
            }
            return normalizedMime === allowed;
        });
        if (!isAllowed) {
            return {
                valid: false,
                error: `MIME type ${mimeType} not allowed for category ${category}. Allowed: ${config.allowedMimeTypes.join(', ')}`,
            };
        }
    }
    return { valid: true };
}
/**
 * Sanitize filename to prevent path traversal and other issues
 */
export function sanitizeFilename(filename) {
    // Remove path separators and null bytes
    let sanitized = filename.replace(/[/\\:\0]/g, '_');
    // Remove leading dots (hidden files)
    sanitized = sanitized.replace(/^\.+/, '');
    // Limit length
    if (sanitized.length > 255) {
        const ext = sanitized.slice(sanitized.lastIndexOf('.'));
        sanitized = sanitized.slice(0, 255 - ext.length) + ext;
    }
    // Fallback if empty
    if (!sanitized || sanitized === '.') {
        sanitized = 'file';
    }
    return sanitized;
}
//# sourceMappingURL=types.js.map