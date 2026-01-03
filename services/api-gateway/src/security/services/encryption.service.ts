/**
 * Encryption Service
 * Provides AES-256-GCM encryption with AWS KMS envelope encryption
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
  EncryptCommand,
} from '@aws-sdk/client-kms';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';
import { EncryptedData, EncryptionContext } from '../types';
import { ENCRYPTION } from '../constants';

interface DataKeyCache {
  plaintextKey: Buffer;
  encryptedKey: Buffer;
  createdAt: number;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly kmsClient: KMSClient;
  private readonly keyId: string;
  private dataKeyCache: DataKeyCache | null = null;
  private readonly keyRotationMs = ENCRYPTION.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000;
  
  constructor(private readonly configService: ConfigService) {
    this.kmsClient = new KMSClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
    });
    this.keyId = this.configService.getOrThrow('KMS_KEY_ID');
  }
  
  async onModuleInit(): Promise<void> {
    // Pre-generate a data key on startup
    await this.getOrCreateDataKey();
    this.logger.log('Encryption service initialized');
  }
  
  /**
   * Encrypt data using AES-256-GCM with envelope encryption
   */
  async encrypt(
    plaintext: string | Buffer,
    context?: EncryptionContext
  ): Promise<EncryptedData> {
    const dataKey = await this.getOrCreateDataKey();
    
    // Generate random IV
    const iv = randomBytes(ENCRYPTION.IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(
      ENCRYPTION.ALGORITHM,
      dataKey.plaintextKey,
      iv,
      { authTagLength: ENCRYPTION.TAG_LENGTH }
    );
    
    // Set additional authenticated data (AAD) for integrity
    if (context) {
      const aad = Buffer.from(JSON.stringify(context));
      cipher.setAAD(aad);
    }
    
    // Encrypt
    const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      keyId: dataKey.encryptedKey.toString('base64'),
      version: 1,
    };
  }
  
  /**
   * Decrypt data encrypted with encrypt()
   */
  async decrypt(
    encryptedData: EncryptedData,
    context?: EncryptionContext
  ): Promise<Buffer> {
    // Decrypt the data key using KMS
    const encryptedKey = Buffer.from(encryptedData.keyId, 'base64');
    const plaintextKey = await this.decryptDataKey(encryptedKey);
    
    // Create decipher
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    
    const decipher = createDecipheriv(
      ENCRYPTION.ALGORITHM,
      plaintextKey,
      iv,
      { authTagLength: ENCRYPTION.TAG_LENGTH }
    );
    
    // Set authentication tag
    decipher.setAuthTag(tag);
    
    // Set AAD if context was provided
    if (context) {
      const aad = Buffer.from(JSON.stringify(context));
      decipher.setAAD(aad);
    }
    
    // Decrypt
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    
    return decrypted;
  }
  
  /**
   * Decrypt to string (convenience method)
   */
  async decryptToString(
    encryptedData: EncryptedData,
    context?: EncryptionContext
  ): Promise<string> {
    const buffer = await this.decrypt(encryptedData, context);
    return buffer.toString('utf8');
  }
  
  /**
   * Encrypt a field value for database storage
   */
  async encryptField(
    value: any,
    fieldName: string,
    tenantId?: string
  ): Promise<string> {
    const context: EncryptionContext = {
      purpose: 'field_encryption',
      tenantId,
      resourceType: fieldName,
    };
    
    const stringValue = typeof value === 'string' 
      ? value 
      : JSON.stringify(value);
    
    const encrypted = await this.encrypt(stringValue, context);
    return JSON.stringify(encrypted);
  }
  
  /**
   * Decrypt a field value from database
   */
  async decryptField<T = string>(
    encryptedValue: string,
    fieldName: string,
    tenantId?: string
  ): Promise<T> {
    const context: EncryptionContext = {
      purpose: 'field_encryption',
      tenantId,
      resourceType: fieldName,
    };
    
    const encrypted: EncryptedData = JSON.parse(encryptedValue);
    const decrypted = await this.decryptToString(encrypted, context);
    
    // Try to parse as JSON if it looks like JSON
    if (decrypted.startsWith('{') || decrypted.startsWith('[')) {
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted as unknown as T;
      }
    }
    
    return decrypted as unknown as T;
  }
  
  /**
   * Generate or retrieve a cached data key
   */
  private async getOrCreateDataKey(): Promise<DataKeyCache> {
    // Check if we have a valid cached key
    if (this.dataKeyCache) {
      const age = Date.now() - this.dataKeyCache.createdAt;
      if (age < this.keyRotationMs) {
        return this.dataKeyCache;
      }
    }
    
    // Generate new data key using KMS
    const command = new GenerateDataKeyCommand({
      KeyId: this.keyId,
      KeySpec: 'AES_256',
    });
    
    const response = await this.kmsClient.send(command);
    
    if (!response.Plaintext || !response.CiphertextBlob) {
      throw new Error('Failed to generate data key');
    }
    
    this.dataKeyCache = {
      plaintextKey: Buffer.from(response.Plaintext),
      encryptedKey: Buffer.from(response.CiphertextBlob),
      createdAt: Date.now(),
    };
    
    this.logger.debug('Generated new data key');
    
    return this.dataKeyCache;
  }
  
  /**
   * Decrypt an encrypted data key using KMS
   */
  private async decryptDataKey(encryptedKey: Buffer): Promise<Buffer> {
    const command = new DecryptCommand({
      CiphertextBlob: encryptedKey,
      KeyId: this.keyId,
    });
    
    const response = await this.kmsClient.send(command);
    
    if (!response.Plaintext) {
      throw new Error('Failed to decrypt data key');
    }
    
    return Buffer.from(response.Plaintext);
  }
  
  /**
   * Generate a cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }
  
  /**
   * Generate a secure random bytes buffer
   */
  generateRandomBytes(length: number): Buffer {
    return randomBytes(length);
  }
}
