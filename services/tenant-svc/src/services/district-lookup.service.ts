/**
 * District Lookup Service
 *
 * Provides ZIP code to district mapping and state curriculum standards lookup.
 * Used for auto-detecting a learner's school district based on their location.
 *
 * @module services/district-lookup.service
 */

import type { PrismaClient } from '../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface DistrictInfo {
  ncesDistrictId: string;
  districtName: string;
  stateCode: string;
  stateName: string;
  city?: string;
  gradeSpan?: string;
  enrollmentCount?: number;
  schoolCount?: number;
  website?: string;
}

export interface StateCurriculumInfo {
  stateCode: string;
  stateName: string;
  mathFramework: string;
  elaFramework: string;
  scienceFramework: string;
  socialStudiesFramework: string;
  additionalFrameworks: string[];
  curriculumStandards: string[]; // Combined list for TenantConfig
}

export interface DistrictLookupResult {
  success: boolean;
  districts: DistrictInfo[];
  primaryDistrict?: DistrictInfo;
  stateCurriculum?: StateCurriculumInfo;
  message?: string;
}

export interface LocationInput {
  zipCode: string;
  stateCode?: string;
  city?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════════════════════

export class DistrictLookupService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Look up districts by ZIP code
   * Returns matching districts and the state's curriculum standards
   */
  async lookupByZipCode(zipCode: string): Promise<DistrictLookupResult> {
    // Normalize ZIP code (take first 5 digits)
    const normalizedZip = zipCode.replace(/\D/g, '').slice(0, 5);

    if (normalizedZip.length !== 5) {
      return {
        success: false,
        districts: [],
        message: 'Invalid ZIP code format. Please provide a 5-digit ZIP code.',
      };
    }

    // Look up ZIP code to district mapping
    const zipMapping = await this.prisma.zipCodeDistrict.findUnique({
      where: { zipCode: normalizedZip },
    });

    if (!zipMapping) {
      return {
        success: false,
        districts: [],
        message: `No school districts found for ZIP code ${normalizedZip}. Please check the ZIP code or contact support.`,
      };
    }

    // Get district details
    const districts = await this.prisma.districtLookup.findMany({
      where: {
        ncesDistrictId: { in: zipMapping.ncesDistrictIds },
      },
    });

    if (districts.length === 0) {
      return {
        success: false,
        districts: [],
        message: 'District information not available for this ZIP code.',
      };
    }

    // Find primary district
    const primaryDistrict = zipMapping.primaryDistrictId
      ? districts.find((d) => d.ncesDistrictId === zipMapping.primaryDistrictId)
      : districts[0];

    // Get state curriculum standards
    const stateCurriculum = await this.getStateCurriculum(zipMapping.stateCode);

    return {
      success: true,
      districts: districts.map((d) => ({
        ncesDistrictId: d.ncesDistrictId,
        districtName: d.districtName,
        stateCode: d.stateCode,
        stateName: d.stateName,
        city: d.city ?? undefined,
        gradeSpan: d.gradeSpan ?? undefined,
        enrollmentCount: d.enrollmentCount ?? undefined,
        schoolCount: d.schoolCount ?? undefined,
        website: d.website ?? undefined,
      })),
      primaryDistrict: primaryDistrict
        ? {
            ncesDistrictId: primaryDistrict.ncesDistrictId,
            districtName: primaryDistrict.districtName,
            stateCode: primaryDistrict.stateCode,
            stateName: primaryDistrict.stateName,
            city: primaryDistrict.city ?? undefined,
            gradeSpan: primaryDistrict.gradeSpan ?? undefined,
            enrollmentCount: primaryDistrict.enrollmentCount ?? undefined,
            schoolCount: primaryDistrict.schoolCount ?? undefined,
            website: primaryDistrict.website ?? undefined,
          }
        : undefined,
      stateCurriculum: stateCurriculum ?? undefined,
    };
  }

  /**
   * Look up districts by state code
   */
  async lookupByState(
    stateCode: string,
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<{ districts: DistrictInfo[]; total: number; stateCurriculum?: StateCurriculumInfo }> {
    const { limit = 50, offset = 0, search } = options ?? {};
    const normalizedState = stateCode.toUpperCase();

    const where = {
      stateCode: normalizedState,
      ...(search && {
        districtName: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [districts, total] = await Promise.all([
      this.prisma.districtLookup.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { districtName: 'asc' },
      }),
      this.prisma.districtLookup.count({ where }),
    ]);

    const stateCurriculum = await this.getStateCurriculum(normalizedState);

    return {
      districts: districts.map((d) => ({
        ncesDistrictId: d.ncesDistrictId,
        districtName: d.districtName,
        stateCode: d.stateCode,
        stateName: d.stateName,
        city: d.city ?? undefined,
        gradeSpan: d.gradeSpan ?? undefined,
        enrollmentCount: d.enrollmentCount ?? undefined,
        schoolCount: d.schoolCount ?? undefined,
        website: d.website ?? undefined,
      })),
      total,
      stateCurriculum: stateCurriculum ?? undefined,
    };
  }

  /**
   * Get district by NCES ID
   */
  async getDistrictByNcesId(ncesDistrictId: string): Promise<DistrictInfo | null> {
    const district = await this.prisma.districtLookup.findUnique({
      where: { ncesDistrictId },
    });

    if (!district) return null;

    return {
      ncesDistrictId: district.ncesDistrictId,
      districtName: district.districtName,
      stateCode: district.stateCode,
      stateName: district.stateName,
      city: district.city ?? undefined,
      gradeSpan: district.gradeSpan ?? undefined,
      enrollmentCount: district.enrollmentCount ?? undefined,
      schoolCount: district.schoolCount ?? undefined,
      website: district.website ?? undefined,
    };
  }

  /**
   * Get state curriculum standards
   */
  async getStateCurriculum(stateCode: string): Promise<StateCurriculumInfo | null> {
    const standards = await this.prisma.stateCurriculumStandards.findUnique({
      where: { stateCode: stateCode.toUpperCase() },
    });

    if (!standards) {
      // Return default Common Core if state not found
      return this.getDefaultCurriculum(stateCode);
    }

    // Build combined curriculum standards list for TenantConfig
    const curriculumStandards = this.buildCurriculumStandardsList(standards);

    return {
      stateCode: standards.stateCode,
      stateName: standards.stateName,
      mathFramework: standards.mathFramework,
      elaFramework: standards.elaFramework,
      scienceFramework: standards.scienceFramework,
      socialStudiesFramework: standards.socialStudiesFramework,
      additionalFrameworks: standards.additionalFrameworks,
      curriculumStandards,
    };
  }

  /**
   * Get all state curriculum standards
   */
  async getAllStateCurriculumStandards(): Promise<StateCurriculumInfo[]> {
    const allStandards = await this.prisma.stateCurriculumStandards.findMany({
      orderBy: { stateName: 'asc' },
    });

    return allStandards.map((standards) => ({
      stateCode: standards.stateCode,
      stateName: standards.stateName,
      mathFramework: standards.mathFramework,
      elaFramework: standards.elaFramework,
      scienceFramework: standards.scienceFramework,
      socialStudiesFramework: standards.socialStudiesFramework,
      additionalFrameworks: standards.additionalFrameworks,
      curriculumStandards: this.buildCurriculumStandardsList(standards),
    }));
  }

  /**
   * Auto-detect district and curriculum from location
   * This is the main method used during onboarding
   */
  async autoDetectFromLocation(location: LocationInput): Promise<{
    district?: DistrictInfo;
    curriculum: StateCurriculumInfo;
    tenantConfigUpdates: {
      curriculumStandards: string[];
      stateCode: string;
      zipCode: string;
    };
  }> {
    const lookupResult = await this.lookupByZipCode(location.zipCode);

    // Get curriculum - either from state lookup or default
    const curriculum =
      lookupResult.stateCurriculum ??
      (await this.getStateCurriculum(location.stateCode ?? '')) ??
      this.getDefaultCurriculum(location.stateCode ?? 'US');

    return {
      district: lookupResult.primaryDistrict,
      curriculum,
      tenantConfigUpdates: {
        curriculumStandards: curriculum.curriculumStandards,
        stateCode: lookupResult.primaryDistrict?.stateCode ?? location.stateCode ?? '',
        zipCode: location.zipCode,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ════════════════════════════════════════════════════════════════════════════

  private buildCurriculumStandardsList(standards: {
    mathFramework: string;
    elaFramework: string;
    scienceFramework: string;
    socialStudiesFramework: string;
    additionalFrameworks: string[];
  }): string[] {
    const standardsList = new Set<string>();

    // Add primary frameworks
    standardsList.add(standards.mathFramework);
    standardsList.add(standards.elaFramework);
    standardsList.add(standards.scienceFramework);
    standardsList.add(standards.socialStudiesFramework);

    // Add additional frameworks
    for (const framework of standards.additionalFrameworks) {
      standardsList.add(framework);
    }

    return Array.from(standardsList);
  }

  private getDefaultCurriculum(stateCode: string): StateCurriculumInfo {
    // Texas uses TEKS
    if (stateCode === 'TX') {
      return {
        stateCode: 'TX',
        stateName: 'Texas',
        mathFramework: 'TEKS',
        elaFramework: 'TEKS',
        scienceFramework: 'TEKS',
        socialStudiesFramework: 'TEKS',
        additionalFrameworks: [],
        curriculumStandards: ['TEKS'],
      };
    }

    // Virginia uses SOL
    if (stateCode === 'VA') {
      return {
        stateCode: 'VA',
        stateName: 'Virginia',
        mathFramework: 'STATE_SPECIFIC',
        elaFramework: 'STATE_SPECIFIC',
        scienceFramework: 'STATE_SPECIFIC',
        socialStudiesFramework: 'STATE_SPECIFIC',
        additionalFrameworks: [],
        curriculumStandards: ['STATE_SPECIFIC'],
      };
    }

    // Default to Common Core for most states
    return {
      stateCode: stateCode || 'US',
      stateName: 'United States',
      mathFramework: 'COMMON_CORE',
      elaFramework: 'COMMON_CORE',
      scienceFramework: 'NGSS',
      socialStudiesFramework: 'C3',
      additionalFrameworks: [],
      curriculumStandards: ['COMMON_CORE', 'NGSS', 'C3'],
    };
  }
}
