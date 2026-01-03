/**
 * PII Detection Service
 * Detects personally identifiable information in text and data
 */

import { Injectable, Logger } from '@nestjs/common';
import { PIIMatch } from '../types';
import { PII_PATTERNS } from '../constants';

interface PIIPattern {
  name: string;
  pattern: RegExp;
  confidence: number;
  validate?: (match: string) => boolean;
}

@Injectable()
export class PIIDetectionService {
  private readonly logger = new Logger(PIIDetectionService.name);
  
  private readonly patterns: PIIPattern[] = [
    {
      name: 'ssn',
      pattern: PII_PATTERNS.SSN,
      confidence: 0.95,
      validate: (match) => this.validateSSN(match),
    },
    {
      name: 'email',
      pattern: PII_PATTERNS.EMAIL,
      confidence: 0.9,
    },
    {
      name: 'phone',
      pattern: PII_PATTERNS.PHONE,
      confidence: 0.8,
      validate: (match) => this.validatePhone(match),
    },
    {
      name: 'credit_card',
      pattern: PII_PATTERNS.CREDIT_CARD,
      confidence: 0.9,
      validate: (match) => this.validateCreditCard(match),
    },
    {
      name: 'date_of_birth',
      pattern: PII_PATTERNS.DOB,
      confidence: 0.7,
    },
    {
      name: 'ip_address',
      pattern: PII_PATTERNS.IP_ADDRESS,
      confidence: 0.8,
    },
    {
      name: 'driver_license',
      pattern: /\b[A-Z]{1,2}\d{5,9}\b/,
      confidence: 0.6,
    },
    {
      name: 'passport',
      pattern: /\b[A-Z]{1,2}\d{6,9}\b/,
      confidence: 0.6,
    },
    {
      name: 'medical_record',
      pattern: /\bMRN[:\s]?\d{6,10}\b/i,
      confidence: 0.85,
    },
    {
      name: 'student_id',
      pattern: /\bSTU[:\s]?\d{6,10}\b/i,
      confidence: 0.85,
    },
  ];
  
  /**
   * Detect PII in text
   */
  detectPII(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, 'gi');
      let match: RegExpExecArray | null;
      
      while ((match = regex.exec(text)) !== null) {
        const value = match[0];
        
        // Run validation if available
        if (pattern.validate && !pattern.validate(value)) {
          continue;
        }
        
        matches.push({
          type: pattern.name,
          value,
          startIndex: match.index,
          endIndex: match.index + value.length,
          confidence: pattern.confidence,
        });
      }
    }
    
    // Remove overlapping matches (keep higher confidence)
    return this.removeOverlaps(matches);
  }
  
  /**
   * Check if text contains any PII
   */
  containsPII(text: string): boolean {
    return this.detectPII(text).length > 0;
  }
  
  /**
   * Detect PII in object (recursively)
   */
  detectPIIInObject(obj: any, path: string = ''): { path: string; matches: PIIMatch[] }[] {
    const results: { path: string; matches: PIIMatch[] }[] = [];
    
    if (obj === null || obj === undefined) {
      return results;
    }
    
    if (typeof obj === 'string') {
      const matches = this.detectPII(obj);
      if (matches.length > 0) {
        results.push({ path, matches });
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        results.push(...this.detectPIIInObject(item, `${path}[${index}]`));
      });
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        results.push(...this.detectPIIInObject(value, fieldPath));
      }
    }
    
    return results;
  }
  
  /**
   * Get summary of PII types in object
   */
  getPIISummary(obj: any): { hasPII: boolean; types: string[]; count: number } {
    const detections = this.detectPIIInObject(obj);
    const types = new Set<string>();
    let count = 0;
    
    detections.forEach(d => {
      d.matches.forEach(m => {
        types.add(m.type);
        count++;
      });
    });
    
    return {
      hasPII: count > 0,
      types: Array.from(types),
      count,
    };
  }
  
  /**
   * Validate SSN format
   */
  private validateSSN(ssn: string): boolean {
    // Remove formatting
    const digits = ssn.replace(/\D/g, '');
    
    if (digits.length !== 9) {
      return false;
    }
    
    // Invalid SSNs
    const invalidPatterns = [
      '000', // Area number cannot be 000
      '666', // Area number cannot be 666
      '9',   // Area number cannot start with 9
    ];
    
    const area = digits.substring(0, 3);
    if (invalidPatterns.some(p => area.startsWith(p))) {
      return false;
    }
    
    // Group number cannot be 00
    if (digits.substring(3, 5) === '00') {
      return false;
    }
    
    // Serial number cannot be 0000
    if (digits.substring(5) === '0000') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate phone number
   */
  private validatePhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    
    // US phone numbers are 10 or 11 digits (with country code)
    if (digits.length < 10 || digits.length > 11) {
      return false;
    }
    
    // Area code cannot start with 0 or 1
    const areaCode = digits.length === 11 ? digits.substring(1, 4) : digits.substring(0, 3);
    if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate credit card using Luhn algorithm
   */
  private validateCreditCard(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  /**
   * Remove overlapping matches, keeping higher confidence
   */
  private removeOverlaps(matches: PIIMatch[]): PIIMatch[] {
    if (matches.length <= 1) {
      return matches;
    }
    
    // Sort by start index
    const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex);
    const result: PIIMatch[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = result[result.length - 1];
      
      if (current.startIndex >= last.endIndex) {
        // No overlap
        result.push(current);
      } else if (current.confidence > last.confidence) {
        // Replace with higher confidence
        result[result.length - 1] = current;
      }
      // Otherwise, skip (keep higher confidence)
    }
    
    return result;
  }
}
