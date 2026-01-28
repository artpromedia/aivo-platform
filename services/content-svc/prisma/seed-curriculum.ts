import 'dotenv/config';
import { PrismaClient, CurriculumFrameworkCode, StandardizedSubject } from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding curriculum framework data...');

  // ═══════════════════════════════════════════════════════════════════════════
  // CURRICULUM FRAMEWORKS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('Creating curriculum frameworks...');
  
  const frameworks = [
    // United States
    {
      code: CurriculumFrameworkCode.COMMON_CORE,
      name: 'Common Core State Standards',
      shortName: 'CCSS',
      description: 'Standards for English language arts and mathematics adopted by most US states',
      countryCode: 'US',
      gradeSystem: 'K-12',
      minGrade: 0,
      maxGrade: 12,
      officialUrl: 'http://www.corestandards.org/',
      lastUpdatedVersion: '2010',
    },
    {
      code: CurriculumFrameworkCode.NGSS,
      name: 'Next Generation Science Standards',
      shortName: 'NGSS',
      description: 'K-12 science content standards developed by states',
      countryCode: 'US',
      gradeSystem: 'K-12',
      minGrade: 0,
      maxGrade: 12,
      officialUrl: 'https://www.nextgenscience.org/',
      lastUpdatedVersion: '2013',
    },
    {
      code: CurriculumFrameworkCode.C3,
      name: 'College, Career, and Civic Life Framework',
      shortName: 'C3',
      description: 'Framework for social studies state standards',
      countryCode: 'US',
      gradeSystem: 'K-12',
      minGrade: 0,
      maxGrade: 12,
      officialUrl: 'https://www.socialstudies.org/c3',
      lastUpdatedVersion: '2013',
    },
    {
      code: CurriculumFrameworkCode.TEKS,
      name: 'Texas Essential Knowledge and Skills',
      shortName: 'TEKS',
      description: 'Texas state curriculum standards for all subjects',
      countryCode: 'US',
      regionCode: 'TX',
      gradeSystem: 'K-12',
      minGrade: 0,
      maxGrade: 12,
      officialUrl: 'https://tea.texas.gov/curriculum/teks/',
      lastUpdatedVersion: '2024',
    },
    
    // United Kingdom
    {
      code: CurriculumFrameworkCode.UK_NATIONAL_CURRICULUM,
      name: 'National Curriculum for England',
      shortName: 'NC England',
      description: 'Statutory programmes of study for maintained schools in England',
      countryCode: 'GB',
      regionCode: 'ENG',
      gradeSystem: 'Year 1-13',
      minGrade: 1,
      maxGrade: 13,
      officialUrl: 'https://www.gov.uk/national-curriculum',
      lastUpdatedVersion: '2014',
    },
    {
      code: CurriculumFrameworkCode.CURRICULUM_FOR_EXCELLENCE,
      name: 'Curriculum for Excellence',
      shortName: 'CfE',
      description: 'Scottish national curriculum from age 3 to 18',
      countryCode: 'GB',
      regionCode: 'SCT',
      gradeSystem: 'Early-Senior',
      minGrade: 0,
      maxGrade: 12,
      officialUrl: 'https://education.gov.scot/curriculum-for-excellence/',
      lastUpdatedVersion: '2010',
    },
    {
      code: CurriculumFrameworkCode.CURRICULUM_WALES,
      name: 'Curriculum for Wales',
      shortName: 'CfW',
      description: 'Welsh curriculum for 3 to 16 year olds',
      countryCode: 'GB',
      regionCode: 'WLS',
      gradeSystem: 'Year 1-11',
      minGrade: 1,
      maxGrade: 11,
      officialUrl: 'https://hwb.gov.wales/curriculum-for-wales/',
      lastUpdatedVersion: '2022',
    },
    
    // International Baccalaureate
    {
      code: CurriculumFrameworkCode.IB_PYP,
      name: 'International Baccalaureate Primary Years Programme',
      shortName: 'IB PYP',
      description: 'Transdisciplinary curriculum for ages 3-12',
      countryCode: 'XX', // International
      gradeSystem: 'PYP 1-6',
      minGrade: 0,
      maxGrade: 5,
      officialUrl: 'https://www.ibo.org/programmes/primary-years-programme/',
      lastUpdatedVersion: '2018',
    },
    {
      code: CurriculumFrameworkCode.IB_MYP,
      name: 'International Baccalaureate Middle Years Programme',
      shortName: 'IB MYP',
      description: 'Challenging curriculum for ages 11-16',
      countryCode: 'XX',
      gradeSystem: 'MYP 1-5',
      minGrade: 6,
      maxGrade: 10,
      officialUrl: 'https://www.ibo.org/programmes/middle-years-programme/',
      lastUpdatedVersion: '2020',
    },
    {
      code: CurriculumFrameworkCode.IB_DP,
      name: 'International Baccalaureate Diploma Programme',
      shortName: 'IB DP',
      description: 'Academically challenging programme for ages 16-19',
      countryCode: 'XX',
      gradeSystem: 'DP 1-2',
      minGrade: 11,
      maxGrade: 12,
      officialUrl: 'https://www.ibo.org/programmes/diploma-programme/',
      lastUpdatedVersion: '2021',
    },
    
    // Cambridge International
    {
      code: CurriculumFrameworkCode.CAMBRIDGE_PRIMARY,
      name: 'Cambridge Primary',
      shortName: 'Cambridge Primary',
      description: 'International primary curriculum for ages 5-11',
      countryCode: 'XX',
      gradeSystem: 'Stage 1-6',
      minGrade: 0,
      maxGrade: 5,
      officialUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-primary/',
      lastUpdatedVersion: '2023',
    },
    {
      code: CurriculumFrameworkCode.CAMBRIDGE_SECONDARY,
      name: 'Cambridge Lower Secondary & IGCSE',
      shortName: 'Cambridge Secondary',
      description: 'International secondary curriculum for ages 11-16',
      countryCode: 'XX',
      gradeSystem: 'Stage 7-11',
      minGrade: 6,
      maxGrade: 10,
      officialUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-secondary-1/',
      lastUpdatedVersion: '2023',
    },
    
    // Australia & New Zealand
    {
      code: CurriculumFrameworkCode.AUSTRALIAN_CURRICULUM,
      name: 'Australian Curriculum',
      shortName: 'AC',
      description: 'National curriculum for Foundation to Year 10',
      countryCode: 'AU',
      gradeSystem: 'F-10',
      minGrade: 0,
      maxGrade: 10,
      officialUrl: 'https://www.australiancurriculum.edu.au/',
      lastUpdatedVersion: '2024',
    },
    {
      code: CurriculumFrameworkCode.NEW_ZEALAND_CURRICULUM,
      name: 'The New Zealand Curriculum',
      shortName: 'NZC',
      description: 'Curriculum for English-medium schools in New Zealand',
      countryCode: 'NZ',
      gradeSystem: 'Year 1-13',
      minGrade: 1,
      maxGrade: 13,
      officialUrl: 'https://nzcurriculum.tki.org.nz/',
      lastUpdatedVersion: '2007',
    },
    
    // India
    {
      code: CurriculumFrameworkCode.CBSE,
      name: 'Central Board of Secondary Education',
      shortName: 'CBSE',
      description: 'National level board of education in India',
      countryCode: 'IN',
      gradeSystem: 'Class 1-12',
      minGrade: 1,
      maxGrade: 12,
      officialUrl: 'https://www.cbse.gov.in/',
      lastUpdatedVersion: '2023',
    },
    {
      code: CurriculumFrameworkCode.ICSE,
      name: 'Indian Certificate of Secondary Education',
      shortName: 'ICSE',
      description: 'Private board of school education in India',
      countryCode: 'IN',
      gradeSystem: 'Class 1-12',
      minGrade: 1,
      maxGrade: 12,
      officialUrl: 'https://cisce.org/',
      lastUpdatedVersion: '2023',
    },
    
    // Middle East
    {
      code: CurriculumFrameworkCode.UAE_MOE,
      name: 'UAE Ministry of Education Curriculum',
      shortName: 'UAE MOE',
      description: 'National curriculum of the United Arab Emirates',
      countryCode: 'AE',
      gradeSystem: 'Grade 1-12',
      minGrade: 1,
      maxGrade: 12,
      officialUrl: 'https://www.moe.gov.ae/',
      lastUpdatedVersion: '2023',
    },
    {
      code: CurriculumFrameworkCode.SAUDI_MOE,
      name: 'Saudi Arabia Ministry of Education Curriculum',
      shortName: 'Saudi MOE',
      description: 'National curriculum of Saudi Arabia',
      countryCode: 'SA',
      gradeSystem: 'Grade 1-12',
      minGrade: 1,
      maxGrade: 12,
      officialUrl: 'https://www.moe.gov.sa/',
      lastUpdatedVersion: '2023',
    },
    
    // Africa
    {
      code: CurriculumFrameworkCode.CAPS,
      name: 'Curriculum and Assessment Policy Statement',
      shortName: 'CAPS',
      description: 'South African national curriculum',
      countryCode: 'ZA',
      gradeSystem: 'Grade R-12',
      minGrade: 0,
      maxGrade: 12,
      officialUrl: 'https://www.education.gov.za/',
      lastUpdatedVersion: '2011',
    },
    
    // Canada
    {
      code: CurriculumFrameworkCode.ONTARIO_CURRICULUM,
      name: 'Ontario Curriculum',
      shortName: 'Ontario',
      description: 'Provincial curriculum of Ontario, Canada',
      countryCode: 'CA',
      regionCode: 'ON',
      gradeSystem: 'Grade 1-12',
      minGrade: 1,
      maxGrade: 12,
      officialUrl: 'https://www.dcp.edu.gov.on.ca/en/curriculum',
      lastUpdatedVersion: '2023',
    },
    {
      code: CurriculumFrameworkCode.BC_CURRICULUM,
      name: 'British Columbia Curriculum',
      shortName: 'BC',
      description: 'Provincial curriculum of British Columbia, Canada',
      countryCode: 'CA',
      regionCode: 'BC',
      gradeSystem: 'K-12',
      minGrade: 0,
      maxGrade: 12,
      officialUrl: 'https://curriculum.gov.bc.ca/',
      lastUpdatedVersion: '2023',
    },
  ];

  for (const framework of frameworks) {
    await prisma.curriculumFramework.upsert({
      where: { code: framework.code },
      update: framework,
      create: framework,
    });
  }
  console.log(`Created ${frameworks.length} curriculum frameworks`);

  // Get framework IDs for relations
  const frameworkMap = new Map<CurriculumFrameworkCode, string>();
  const dbFrameworks = await prisma.curriculumFramework.findMany();
  for (const f of dbFrameworks) {
    frameworkMap.set(f.code, f.id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GRADE EQUIVALENCIES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('Creating grade equivalencies...');

  // Standardized levels: 0=K/Foundation, 1-12=Grade 1-12, 13=Post-secondary
  
  const gradeEquivalencies = [
    // US Common Core (K-12)
    ...Array.from({ length: 13 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.COMMON_CORE)!,
      gradeLevel: i,
      gradeLabel: i === 0 ? 'Kindergarten' : `Grade ${i}`,
      gradeCode: i === 0 ? 'K' : `G${i}`,
      typicalAgeMin: i + 5,
      typicalAgeMax: i + 6,
      standardizedLevel: i,
      educationStage: i <= 5 ? 'PRIMARY' : i <= 8 ? 'MIDDLE' : 'HIGH',
    })),
    
    // UK National Curriculum (Year 1-13)
    ...Array.from({ length: 13 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.UK_NATIONAL_CURRICULUM)!,
      gradeLevel: i + 1,
      gradeLabel: `Year ${i + 1}`,
      gradeCode: `Y${i + 1}`,
      typicalAgeMin: i + 5,
      typicalAgeMax: i + 6,
      standardizedLevel: i,
      educationStage: i <= 5 ? 'PRIMARY' : i <= 8 ? 'KEY_STAGE_3' : i <= 10 ? 'KEY_STAGE_4' : 'SIXTH_FORM',
    })),
    
    // Australia (Foundation-10)
    ...Array.from({ length: 11 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.AUSTRALIAN_CURRICULUM)!,
      gradeLevel: i,
      gradeLabel: i === 0 ? 'Foundation' : `Year ${i}`,
      gradeCode: i === 0 ? 'F' : `Y${i}`,
      typicalAgeMin: i + 5,
      typicalAgeMax: i + 6,
      standardizedLevel: i,
      educationStage: i <= 6 ? 'PRIMARY' : 'SECONDARY',
    })),
    
    // India CBSE (Class 1-12)
    ...Array.from({ length: 12 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.CBSE)!,
      gradeLevel: i + 1,
      gradeLabel: `Class ${i + 1}`,
      gradeCode: `CL${i + 1}`,
      typicalAgeMin: i + 6,
      typicalAgeMax: i + 7,
      standardizedLevel: i + 1,
      educationStage: i <= 4 ? 'PRIMARY' : i <= 7 ? 'UPPER_PRIMARY' : i <= 9 ? 'SECONDARY' : 'SENIOR_SECONDARY',
    })),
    
    // Cambridge Primary (Stage 1-6)
    ...Array.from({ length: 6 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.CAMBRIDGE_PRIMARY)!,
      gradeLevel: i + 1,
      gradeLabel: `Stage ${i + 1}`,
      gradeCode: `CP${i + 1}`,
      typicalAgeMin: i + 5,
      typicalAgeMax: i + 6,
      standardizedLevel: i,
      educationStage: 'PRIMARY',
    })),
    
    // IB PYP (0-5)
    ...Array.from({ length: 6 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.IB_PYP)!,
      gradeLevel: i,
      gradeLabel: `PYP Year ${i + 1}`,
      gradeCode: `PYP${i + 1}`,
      typicalAgeMin: i + 5,
      typicalAgeMax: i + 6,
      standardizedLevel: i,
      educationStage: 'PRIMARY',
    })),
    
    // IB MYP (6-10)
    ...Array.from({ length: 5 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.IB_MYP)!,
      gradeLevel: i + 6,
      gradeLabel: `MYP Year ${i + 1}`,
      gradeCode: `MYP${i + 1}`,
      typicalAgeMin: i + 11,
      typicalAgeMax: i + 12,
      standardizedLevel: i + 6,
      educationStage: 'MIDDLE',
    })),
    
    // IB DP (11-12)
    ...Array.from({ length: 2 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.IB_DP)!,
      gradeLevel: i + 11,
      gradeLabel: `DP Year ${i + 1}`,
      gradeCode: `DP${i + 1}`,
      typicalAgeMin: i + 16,
      typicalAgeMax: i + 17,
      standardizedLevel: i + 11,
      educationStage: 'HIGH',
    })),
    
    // South Africa CAPS (Grade R-12)
    ...Array.from({ length: 13 }, (_, i) => ({
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.CAPS)!,
      gradeLevel: i,
      gradeLabel: i === 0 ? 'Grade R' : `Grade ${i}`,
      gradeCode: i === 0 ? 'GR' : `G${i}`,
      typicalAgeMin: i + 5,
      typicalAgeMax: i + 6,
      standardizedLevel: i,
      educationStage: i <= 3 ? 'FOUNDATION' : i <= 6 ? 'INTERMEDIATE' : i <= 9 ? 'SENIOR' : 'FET',
    })),
  ].filter(g => g.frameworkId); // Filter out any with missing framework IDs

  for (const grade of gradeEquivalencies) {
    await prisma.gradeEquivalency.upsert({
      where: {
        frameworkId_gradeLevel: {
          frameworkId: grade.frameworkId,
          gradeLevel: grade.gradeLevel,
        },
      },
      update: grade,
      create: grade,
    });
  }
  console.log(`Created ${gradeEquivalencies.length} grade equivalencies`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBJECT MAPPINGS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('Creating subject mappings...');

  const subjectMappings = [
    // US Common Core
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.COMMON_CORE)!,
      standardizedSubject: StandardizedSubject.MATHEMATICS,
      localSubjectCode: 'MATH',
      localSubjectName: 'Mathematics',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.COMMON_CORE)!,
      standardizedSubject: StandardizedSubject.ENGLISH_LANGUAGE_ARTS,
      localSubjectCode: 'ELA',
      localSubjectName: 'English Language Arts',
      isCore: true,
      priority: 100,
    },
    
    // UK National Curriculum
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.UK_NATIONAL_CURRICULUM)!,
      standardizedSubject: StandardizedSubject.MATHEMATICS,
      localSubjectCode: 'MA',
      localSubjectName: 'Mathematics',
      localSubjectNameNative: 'Maths',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.UK_NATIONAL_CURRICULUM)!,
      standardizedSubject: StandardizedSubject.ENGLISH_LANGUAGE_ARTS,
      localSubjectCode: 'EN',
      localSubjectName: 'English',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.UK_NATIONAL_CURRICULUM)!,
      standardizedSubject: StandardizedSubject.SCIENCE,
      localSubjectCode: 'SC',
      localSubjectName: 'Science',
      isCore: true,
      priority: 90,
    },
    
    // Australian Curriculum
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.AUSTRALIAN_CURRICULUM)!,
      standardizedSubject: StandardizedSubject.MATHEMATICS,
      localSubjectCode: 'MATH',
      localSubjectName: 'Mathematics',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.AUSTRALIAN_CURRICULUM)!,
      standardizedSubject: StandardizedSubject.ENGLISH_LANGUAGE_ARTS,
      localSubjectCode: 'ENG',
      localSubjectName: 'English',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.AUSTRALIAN_CURRICULUM)!,
      standardizedSubject: StandardizedSubject.SCIENCE,
      localSubjectCode: 'SCI',
      localSubjectName: 'Science',
      isCore: true,
      priority: 90,
    },
    
    // CBSE India
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.CBSE)!,
      standardizedSubject: StandardizedSubject.MATHEMATICS,
      localSubjectCode: 'MATH',
      localSubjectName: 'Mathematics',
      localSubjectNameNative: 'गणित',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.CBSE)!,
      standardizedSubject: StandardizedSubject.ENGLISH_LANGUAGE_ARTS,
      localSubjectCode: 'ENG',
      localSubjectName: 'English',
      localSubjectNameNative: 'अंग्रेज़ी',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.CBSE)!,
      standardizedSubject: StandardizedSubject.SCIENCE,
      localSubjectCode: 'SCI',
      localSubjectName: 'Science',
      localSubjectNameNative: 'विज्ञान',
      isCore: true,
      priority: 90,
    },
    
    // IB PYP (transdisciplinary)
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.IB_PYP)!,
      standardizedSubject: StandardizedSubject.MATHEMATICS,
      localSubjectCode: 'MATH',
      localSubjectName: 'Mathematics',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.IB_PYP)!,
      standardizedSubject: StandardizedSubject.ENGLISH_LANGUAGE_ARTS,
      localSubjectCode: 'LANG',
      localSubjectName: 'Language',
      isCore: true,
      priority: 100,
    },
    {
      frameworkId: frameworkMap.get(CurriculumFrameworkCode.IB_PYP)!,
      standardizedSubject: StandardizedSubject.SOCIAL_EMOTIONAL_LEARNING,
      localSubjectCode: 'PSE',
      localSubjectName: 'Personal, Social and Physical Education',
      isCore: true,
      priority: 80,
    },
  ].filter(m => m.frameworkId);

  for (const mapping of subjectMappings) {
    await prisma.subjectMapping.upsert({
      where: {
        frameworkId_standardizedSubject: {
          frameworkId: mapping.frameworkId,
          standardizedSubject: mapping.standardizedSubject,
        },
      },
      update: mapping,
      create: mapping,
    });
  }
  console.log(`Created ${subjectMappings.length} subject mappings`);

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING STANDARDS (Sample - Common Core Math Grade 3)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('Creating sample learning standards...');

  const ccssFrameworkId = frameworkMap.get(CurriculumFrameworkCode.COMMON_CORE)!;
  
  // Get math subject mapping
  const ccMathMapping = await prisma.subjectMapping.findFirst({
    where: {
      frameworkId: ccssFrameworkId,
      standardizedSubject: StandardizedSubject.MATHEMATICS,
    },
  });

  if (ccMathMapping) {
    // Create domain-level standard
    const oaDomain = await prisma.learningStandard.upsert({
      where: {
        frameworkId_standardCode: {
          frameworkId: ccssFrameworkId,
          standardCode: 'CCSS.MATH.CONTENT.3.OA',
        },
      },
      update: {},
      create: {
        frameworkId: ccssFrameworkId,
        subjectMappingId: ccMathMapping.id,
        standardCode: 'CCSS.MATH.CONTENT.3.OA',
        fullCode: 'CCSS.MATH.CONTENT.3.OA',
        hierarchyLevel: 0,
        hierarchyPath: 'MATH/3/OA',
        title: 'Operations & Algebraic Thinking',
        description: 'Represent and solve problems involving multiplication and division.',
        gradeLevel: 3,
        gradeBand: '3-5',
        keywords: ['multiplication', 'division', 'algebra', 'operations'],
        cognitiveLevel: 'APPLY',
      },
    });

    // Create cluster-level standards
    const oaClusterA = await prisma.learningStandard.upsert({
      where: {
        frameworkId_standardCode: {
          frameworkId: ccssFrameworkId,
          standardCode: 'CCSS.MATH.CONTENT.3.OA.A',
        },
      },
      update: {},
      create: {
        frameworkId: ccssFrameworkId,
        subjectMappingId: ccMathMapping.id,
        parentStandardId: oaDomain.id,
        standardCode: 'CCSS.MATH.CONTENT.3.OA.A',
        fullCode: 'CCSS.MATH.CONTENT.3.OA.A',
        hierarchyLevel: 1,
        hierarchyPath: 'MATH/3/OA/A',
        title: 'Represent and solve problems involving multiplication and division',
        description: 'Use multiplication and division within 100 to solve word problems.',
        gradeLevel: 3,
        gradeBand: '3-5',
        keywords: ['multiplication', 'division', 'word problems'],
        cognitiveLevel: 'APPLY',
      },
    });

    // Create specific standards
    const standards = [
      {
        standardCode: 'CCSS.MATH.CONTENT.3.OA.A.1',
        fullCode: 'CCSS.MATH.CONTENT.3.OA.A.1',
        hierarchyLevel: 2,
        hierarchyPath: 'MATH/3/OA/A/1',
        title: 'Interpret products of whole numbers',
        description: 'Interpret products of whole numbers, e.g., interpret 5 × 7 as the total number of objects in 5 groups of 7 objects each.',
        keywords: ['multiplication', 'products', 'groups', 'arrays'],
        cognitiveLevel: 'UNDERSTAND',
      },
      {
        standardCode: 'CCSS.MATH.CONTENT.3.OA.A.2',
        fullCode: 'CCSS.MATH.CONTENT.3.OA.A.2',
        hierarchyLevel: 2,
        hierarchyPath: 'MATH/3/OA/A/2',
        title: 'Interpret whole-number quotients',
        description: 'Interpret whole-number quotients of whole numbers, e.g., interpret 56 ÷ 8 as the number of objects in each share when 56 objects are partitioned equally into 8 shares.',
        keywords: ['division', 'quotients', 'sharing', 'partitioning'],
        cognitiveLevel: 'UNDERSTAND',
      },
      {
        standardCode: 'CCSS.MATH.CONTENT.3.OA.A.3',
        fullCode: 'CCSS.MATH.CONTENT.3.OA.A.3',
        hierarchyLevel: 2,
        hierarchyPath: 'MATH/3/OA/A/3',
        title: 'Use multiplication and division to solve word problems',
        description: 'Use multiplication and division within 100 to solve word problems in situations involving equal groups, arrays, and measurement quantities.',
        keywords: ['multiplication', 'division', 'word problems', 'equal groups', 'arrays'],
        cognitiveLevel: 'APPLY',
      },
      {
        standardCode: 'CCSS.MATH.CONTENT.3.OA.A.4',
        fullCode: 'CCSS.MATH.CONTENT.3.OA.A.4',
        hierarchyLevel: 2,
        hierarchyPath: 'MATH/3/OA/A/4',
        title: 'Determine the unknown whole number',
        description: 'Determine the unknown whole number in a multiplication or division equation relating three whole numbers.',
        keywords: ['multiplication', 'division', 'unknown', 'equations'],
        cognitiveLevel: 'APPLY',
      },
    ];

    for (const standard of standards) {
      await prisma.learningStandard.upsert({
        where: {
          frameworkId_standardCode: {
            frameworkId: ccssFrameworkId,
            standardCode: standard.standardCode,
          },
        },
        update: {},
        create: {
          ...standard,
          frameworkId: ccssFrameworkId,
          subjectMappingId: ccMathMapping.id,
          parentStandardId: oaClusterA.id,
          gradeLevel: 3,
          gradeBand: '3-5',
        },
      });
    }
    
    console.log(`Created ${standards.length + 2} learning standards for CCSS Math Grade 3`);
  }

  console.log('Curriculum framework seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
