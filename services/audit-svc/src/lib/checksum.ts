/**
 * AIVO Audit Service - Checksum Utilities
 *
 * Provides integrity verification for audit logs using SHA-256 hashing.
 */

import * as crypto from 'node:crypto';

import type { CreateAuditLog } from '../types/index.js';

/**
 * Generates a SHA-256 checksum for an audit log entry.
 * This is used to verify the integrity of the log entry.
 */
export function generateChecksum(
  entry: CreateAuditLog & { tenantId: string; eventId: string }
): string {
  // Create a deterministic string representation of the entry
  const data = JSON.stringify({
    eventId: entry.eventId,
    eventType: entry.eventType,
    tenantId: entry.tenantId,
    category: entry.category,
    severity: entry.severity,
    outcome: entry.outcome,
    actorId: entry.actorId,
    actorType: entry.actorType,
    targetType: entry.targetType,
    targetId: entry.targetId,
    action: entry.action,
    description: entry.description,
    sourceService: entry.sourceService,
    occurredAt: entry.occurredAt,
    metadata: entry.metadata,
    previousState: entry.previousState,
    newState: entry.newState,
  });

  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verifies the checksum of an audit log entry.
 */
export function verifyChecksum(
  entry: CreateAuditLog & { tenantId: string; eventId: string },
  expectedChecksum: string
): boolean {
  const actualChecksum = generateChecksum(entry);
  return actualChecksum === expectedChecksum;
}

/**
 * Generates a hash that chains to the previous entry (blockchain-style).
 */
export function generateChainedHash(
  currentChecksum: string,
  previousHash: string | null
): string {
  const data = previousHash
    ? `${previousHash}:${currentChecksum}`
    : currentChecksum;

  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a Merkle tree root for a set of checksums.
 * Used for efficient batch verification.
 */
export function generateMerkleRoot(checksums: string[]): string {
  if (checksums.length === 0) {
    return '';
  }

  if (checksums.length === 1) {
    return checksums[0]!;
  }

  // Hash pairs of checksums
  const hashes = [...checksums];
  while (hashes.length > 1) {
    const newHashes: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i]!;
      const right = hashes[i + 1] || left; // Duplicate if odd number
      const combined = crypto
        .createHash('sha256')
        .update(`${left}${right}`)
        .digest('hex');
      newHashes.push(combined);
    }
    hashes.length = 0;
    hashes.push(...newHashes);
  }

  return hashes[0]!;
}
