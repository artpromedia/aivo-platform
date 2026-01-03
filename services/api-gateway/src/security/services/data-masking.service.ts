/**
 * Data Masking Service
 * Masks sensitive data for logging and display
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataClassification } from '../types';
import { DATA_CLASSIFICATION } from '../constants';
import { PIIDetectionService } from './pii-detection.service';

export interface MaskingOptions {
  preserveLength?: boolean;
  maskChar?: string;
  showFirst?: number;
  showLast?: number;
}

@Injectable()
export class DataMaskingService {
  private readonly logger = new Logger(DataMaskingService.name);
  private readonly defaultMaskChar = '*';
  
  // Fields that should always be fully masked
  private readonly fullMaskFields = new Set([
    'password',
    'passwordHash',
    'secret',
    'apiKey',
    'privateKey',
    'accessToken',
    'refreshToken',
    'ssn',
    'socialSecurityNumber',
  ]);
  
  // Fields that should be partially masked
  private readonly partialMaskFields: Record<string, MaskingOptions> = {
    email: { showFirst: 2, showLast: 0 },
    phone: { showLast: 4 },
    phoneNumber: { showLast: 4 },
    creditCard: { showLast: 4 },
    cardNumber: { showLast: 4 },
    accountNumber: { showLast: 4 },
    dob: { preserveLength: true },
    dateOfBirth: { preserveLength: true },
    address: { showFirst: 5 },
  };
  
  constructor(private readonly piiDetection: PIIDetectionService) {}
  
  /**
   * Mask a single value
   */
  maskValue(value: string, options: MaskingOptions = {}): string {
    const {
      preserveLength = true,
      maskChar = this.defaultMaskChar,
      showFirst = 0,
      showLast = 0,
    } = options;
    
    if (!value || value.length === 0) {
      return value;
    }
    
    const length = value.length;
    const maskLength = preserveLength ? length - showFirst - showLast : 8;
    
    if (showFirst + showLast >= length) {
      return maskChar.repeat(preserveLength ? length : 8);
    }
    
    const prefix = value.substring(0, showFirst);
    const suffix = value.substring(length - showLast);
    const mask = maskChar.repeat(Math.max(maskLength, 1));
    
    return `${prefix}${mask}${suffix}`;
  }
  
  /**
   * Mask an email address
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return this.maskValue(email);
    }
    
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  }
  
  /**
   * Mask a phone number
   */
  maskPhone(phone: string): string {
    // Keep last 4 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) {
      return '*'.repeat(phone.length);
    }
    
    const visiblePart = digits.slice(-4);
    const maskedPart = '*'.repeat(digits.length - 4);
    
    // Try to preserve original formatting
    let result = phone;
    let digitIndex = 0;
    
    for (let i = 0; i < result.length; i++) {
      if (/\d/.test(result[i])) {
        if (digitIndex < maskedPart.length) {
          result = result.substring(0, i) + '*' + result.substring(i + 1);
        }
        digitIndex++;
      }
    }
    
    return result;
  }
  
  /**
   * Mask a credit card number
   */
  maskCreditCard(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 4) {
      return '*'.repeat(cardNumber.length);
    }
    
    const lastFour = digits.slice(-4);
    return `****-****-****-${lastFour}`;
  }
  
  /**
   * Mask SSN
   */
  maskSSN(ssn: string): string {
    // Always fully mask SSN
    return '***-**-****';
  }
  
  /**
   * Mask an object's sensitive fields
   */
  maskObject<T extends Record<string, any>>(obj: T, depth: number = 0): T {
    if (depth > 10) {
      return obj; // Prevent infinite recursion
    }
    
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item, depth + 1)) as unknown as T;
    }
    
    if (typeof obj !== 'object') {
      return obj;
    }
    
    const masked: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Full mask for highly sensitive fields
      if (this.fullMaskFields.has(lowerKey)) {
        masked[key] = typeof value === 'string' 
          ? this.maskValue(value, { preserveLength: false })
          : '[REDACTED]';
        continue;
      }
      
      // Partial mask for known fields
      if (this.partialMaskFields[lowerKey] && typeof value === 'string') {
        masked[key] = this.maskValue(value, this.partialMaskFields[lowerKey]);
        continue;
      }
      
      // Special handling for email
      if ((lowerKey.includes('email') || lowerKey.includes('mail')) && typeof value === 'string') {
        masked[key] = this.maskEmail(value);
        continue;
      }
      
      // Special handling for phone
      if ((lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('tel')) && typeof value === 'string') {
        masked[key] = this.maskPhone(value);
        continue;
      }
      
      // Recursively mask nested objects
      if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskObject(value, depth + 1);
        continue;
      }
      
      // Check string values for PII
      if (typeof value === 'string') {
        masked[key] = this.maskStringWithPII(value);
        continue;
      }
      
      // Pass through other values
      masked[key] = value;
    }
    
    return masked as T;
  }
  
  /**
   * Mask PII found in a string
   */
  maskStringWithPII(text: string): string {
    const matches = this.piiDetection.detectPII(text);
    
    if (matches.length === 0) {
      return text;
    }
    
    // Sort by start index (descending) to replace from end
    const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
    
    let result = text;
    
    for (const match of sortedMatches) {
      const masked = this.maskByType(match.type, match.value);
      result = result.substring(0, match.startIndex) + masked + result.substring(match.endIndex);
    }
    
    return result;
  }
  
  /**
   * Mask value based on PII type
   */
  private maskByType(type: string, value: string): string {
    switch (type) {
      case 'ssn':
        return this.maskSSN(value);
      case 'email':
        return this.maskEmail(value);
      case 'phone':
        return this.maskPhone(value);
      case 'credit_card':
        return this.maskCreditCard(value);
      case 'ip_address':
        return this.maskValue(value, { showFirst: 0, showLast: 0 });
      default:
        return this.maskValue(value);
    }
  }
  
  /**
   * Create a safe version of an object for logging
   */
  toSafeLog<T extends Record<string, any>>(obj: T): T {
    return this.maskObject(obj);
  }
}
