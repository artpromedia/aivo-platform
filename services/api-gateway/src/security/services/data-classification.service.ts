/**
 * Data Classification Service
 * Classifies data sensitivity levels for compliance
 */

import { Injectable, Logger } from '@nestjs/common';
import { ClassificationResult, DataClassification } from '../types';
import { DATA_CLASSIFICATION, COMPLIANCE } from '../constants';
import { PIIDetectionService } from './pii-detection.service';

interface FieldClassification {
  field: string;
  classification: DataClassification;
  reasons: string[];
}

@Injectable()
export class DataClassificationService {
  private readonly logger = new Logger(DataClassificationService.name);
  
  // Fields that are always classified at specific levels
  private readonly fieldClassifications: Record<string, DataClassification> = {
    // Restricted (FERPA education records)
    grades: 'restricted',
    gpa: 'restricted',
    transcript: 'restricted',
    disciplinaryRecord: 'restricted',
    iep: 'restricted',
    '504plan': 'restricted',
    learningDisability: 'restricted',
    specialEducation: 'restricted',
    
    // Confidential (PII)
    ssn: 'confidential',
    socialSecurityNumber: 'confidential',
    dateOfBirth: 'confidential',
    dob: 'confidential',
    address: 'confidential',
    phoneNumber: 'confidential',
    email: 'confidential',
    password: 'confidential',
    passwordHash: 'confidential',
    
    // Internal
    userId: 'internal',
    tenantId: 'internal',
    sessionId: 'internal',
    createdAt: 'internal',
    updatedAt: 'internal',
  };
  
  constructor(private readonly piiDetection: PIIDetectionService) {}
  
  /**
   * Classify a data object
   */
  classifyData(data: Record<string, any>): ClassificationResult {
    const reasons: string[] = [];
    const piiTypes: string[] = [];
    const regulations: Set<string> = new Set();
    
    let highestLevel: DataClassification = 'public';
    let educationalRecord = false;
    
    // Check each field
    for (const [field, value] of Object.entries(data)) {
      const fieldResult = this.classifyField(field, value);
      
      if (this.isHigherClassification(fieldResult.classification, highestLevel)) {
        highestLevel = fieldResult.classification;
      }
      
      reasons.push(...fieldResult.reasons);
      
      // Check for PII in string values
      if (typeof value === 'string') {
        const piiMatches = this.piiDetection.detectPII(value);
        piiMatches.forEach(match => {
          if (!piiTypes.includes(match.type)) {
            piiTypes.push(match.type);
          }
        });
      }
    }
    
    // Determine applicable regulations
    if (this.isEducationalRecord(data)) {
      educationalRecord = true;
      regulations.add(COMPLIANCE.REGULATIONS.FERPA);
    }
    
    if (this.isChildData(data)) {
      regulations.add(COMPLIANCE.REGULATIONS.COPPA);
    }
    
    if (piiTypes.length > 0) {
      regulations.add(COMPLIANCE.REGULATIONS.GDPR);
      regulations.add(COMPLIANCE.REGULATIONS.CCPA);
    }
    
    return {
      classification: highestLevel,
      reasons: [...new Set(reasons)],
      piiDetected: piiTypes.length > 0,
      piiTypes,
      educationalRecord,
      requiresEncryption: highestLevel === 'restricted' || highestLevel === 'confidential',
      requiresAuditLog: highestLevel !== 'public',
      retentionPeriod: this.getRetentionPeriod(highestLevel),
      regulations: Array.from(regulations),
    };
  }
  
  /**
   * Classify a single field
   */
  classifyField(fieldName: string, value: any): FieldClassification {
    const normalizedName = fieldName.toLowerCase();
    const reasons: string[] = [];
    let classification: DataClassification = 'public';
    
    // Check known field classifications
    for (const [knownField, level] of Object.entries(this.fieldClassifications)) {
      if (normalizedName.includes(knownField.toLowerCase())) {
        classification = level;
        reasons.push(`Field "${fieldName}" matches known ${level} pattern`);
        break;
      }
    }
    
    // Check for sensitive field name patterns
    if (DATA_CLASSIFICATION.SENSITIVE_FIELDS.some(f => normalizedName.includes(f.toLowerCase()))) {
      if (this.isHigherClassification('confidential', classification)) {
        classification = 'confidential';
        reasons.push(`Field "${fieldName}" contains sensitive data pattern`);
      }
    }
    
    // Check value for PII if string
    if (typeof value === 'string' && value.length > 0) {
      const piiMatches = this.piiDetection.detectPII(value);
      if (piiMatches.length > 0) {
        if (this.isHigherClassification('confidential', classification)) {
          classification = 'confidential';
          reasons.push(`Value contains PII: ${piiMatches.map(m => m.type).join(', ')}`);
        }
      }
    }
    
    return {
      field: fieldName,
      classification,
      reasons,
    };
  }
  
  /**
   * Check if one classification is higher than another
   */
  isHigherClassification(a: DataClassification, b: DataClassification): boolean {
    const order: DataClassification[] = ['public', 'internal', 'confidential', 'restricted'];
    return order.indexOf(a) > order.indexOf(b);
  }
  
  /**
   * Get retention period for classification level
   */
  getRetentionPeriod(level: DataClassification): number {
    return DATA_CLASSIFICATION.RETENTION_DAYS[level.toUpperCase() as keyof typeof DATA_CLASSIFICATION.RETENTION_DAYS];
  }
  
  /**
   * Check if data appears to be an educational record
   */
  private isEducationalRecord(data: Record<string, any>): boolean {
    const educationalFields = [
      'grade', 'gpa', 'transcript', 'assessment', 'score',
      'attendance', 'behavior', 'iep', '504', 'curriculum',
      'course', 'enrollment', 'disciplinary',
    ];
    
    const fields = Object.keys(data).map(f => f.toLowerCase());
    
    return educationalFields.some(ef => 
      fields.some(f => f.includes(ef))
    );
  }
  
  /**
   * Check if data belongs to a child (under 13)
   */
  private isChildData(data: Record<string, any>): boolean {
    // Check for explicit minor flag
    if (data.isMinor === true) {
      return true;
    }
    
    // Check for age
    if (data.age && data.age < COMPLIANCE.AGE_THRESHOLDS.COPPA_MINOR) {
      return true;
    }
    
    // Check for date of birth
    if (data.dateOfBirth || data.dob || data.birthDate) {
      const dob = new Date(data.dateOfBirth || data.dob || data.birthDate);
      const age = this.calculateAge(dob);
      return age < COMPLIANCE.AGE_THRESHOLDS.COPPA_MINOR;
    }
    
    // Check for grade level indicating K-6 (typically under 13)
    if (data.gradeLevel) {
      const grade = parseInt(data.gradeLevel.toString().replace(/\D/g, ''));
      return !isNaN(grade) && grade <= 6;
    }
    
    return false;
  }
  
  /**
   * Calculate age from date of birth
   */
  private calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  }
}
