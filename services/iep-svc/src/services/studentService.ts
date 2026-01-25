/**
 * AIVO IEP Service - Student Management Service
 */

import { prisma } from '../prisma.js';

export async function createStudent(tenantId: string, input: any) {
  return prisma.student.create({
    data: {
      tenantId,
      studentId: input.studentId,
      stateId: input.stateId,
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName,
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      grade: input.grade,
      school: input.school,
      district: input.district,
      enrollmentDate: input.enrollmentDate ? new Date(input.enrollmentDate) : null,
      primaryLanguage: input.primaryLanguage || 'English',
      homeLanguage: input.homeLanguage,
      eligibilityDate: input.eligibilityDate ? new Date(input.eligibilityDate) : null,
      primaryDisability: input.primaryDisability,
      secondaryDisabilities: input.secondaryDisabilities || [],
      status: 'ACTIVE',
      metadata: input.metadata,
    },
  });
}

export async function getStudent(tenantId: string, studentId: string) {
  return prisma.student.findFirst({
    where: { id: studentId, tenantId },
    include: {
      ieps: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          iepNumber: true,
          iepType: true,
          status: true,
          effectiveDate: true,
          annualReviewDate: true,
        },
      },
      teamMembers: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          isPrimaryContact: true,
        },
      },
      evaluations: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          evaluationType: true,
          status: true,
          evaluationDate: true,
        },
      },
    },
  });
}

export async function listStudents(tenantId: string, query: any) {
  const { status, school, grade, search, page = 1, pageSize = 20 } = query;

  const where: any = {
    tenantId,
    ...(status && { status }),
    ...(school && { school }),
    ...(grade && { grade }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const skip = (page - 1) * pageSize;

  const [students, totalItems] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { lastName: 'asc' },
      skip,
      take: pageSize,
      include: {
        _count: { select: { ieps: true } },
        ieps: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: { id: true, status: true, annualReviewDate: true },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return {
    data: students,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

export async function updateStudent(tenantId: string, studentId: string, input: any) {
  const existing = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!existing) throw new Error('Student not found');

  return prisma.student.update({
    where: { id: studentId },
    data: {
      ...input,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      enrollmentDate: input.enrollmentDate ? new Date(input.enrollmentDate) : undefined,
      eligibilityDate: input.eligibilityDate ? new Date(input.eligibilityDate) : undefined,
      exitDate: input.exitDate ? new Date(input.exitDate) : undefined,
    },
  });
}

export async function addTeamMember(tenantId: string, studentId: string, input: any) {
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!student) throw new Error('Student not found');

  return prisma.teamMember.create({
    data: {
      tenantId,
      studentId,
      userId: input.userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      title: input.title,
      organization: input.organization,
      relationToStudent: input.relationToStudent,
      isPrimaryContact: input.isPrimaryContact ?? false,
      isActive: true,
    },
  });
}

export async function getTeamMembers(tenantId: string, studentId: string) {
  return prisma.teamMember.findMany({
    where: { tenantId, studentId, isActive: true },
    orderBy: [{ isPrimaryContact: 'desc' }, { name: 'asc' }],
  });
}

export async function createEvaluation(tenantId: string, studentId: string, userId: string, input: any) {
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!student) throw new Error('Student not found');

  return prisma.evaluation.create({
    data: {
      tenantId,
      studentId,
      evaluationType: input.evaluationType,
      referralDate: input.referralDate ? new Date(input.referralDate) : null,
      areasEvaluated: input.areasEvaluated || [],
      status: 'PENDING',
      createdBy: userId,
    },
  });
}

export async function updateEvaluation(tenantId: string, evaluationId: string, input: any) {
  const evaluation = await prisma.evaluation.findFirst({ where: { id: evaluationId, tenantId } });
  if (!evaluation) throw new Error('Evaluation not found');

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: input.status,
      consentDate: input.consentDate ? new Date(input.consentDate) : null,
      evaluationDate: input.evaluationDate ? new Date(input.evaluationDate) : null,
      reportDate: input.reportDate ? new Date(input.reportDate) : null,
      areasEvaluated: input.areasEvaluated,
      eligibilityDetermined: input.eligibilityDetermined,
      eligibilityCategory: input.eligibilityCategory,
      findings: input.findings,
      recommendations: input.recommendations,
      evaluators: input.evaluators,
    },
  });
}
