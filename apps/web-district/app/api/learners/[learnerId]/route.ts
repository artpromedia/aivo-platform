import { NextResponse } from 'next/server';

interface LearnerDto {
  id: string;
  tenant_id: string;
  name: string;
  grade?: number;
  progress?: number;
}

// Stubbed dataset standing in for learner-svc GET /learners/:id
const mockLearners: Record<string, LearnerDto> = {
  'learner-100': {
    id: 'learner-100',
    tenant_id: 'tenant-1',
    name: 'Avery Stone',
    grade: 3,
    progress: 0.42,
  },
  'learner-200': {
    id: 'learner-200',
    tenant_id: 'tenant-1',
    name: 'Jordan Lake',
    grade: 7,
    progress: 0.65,
  },
  'learner-300': {
    id: 'learner-300',
    tenant_id: 'tenant-1',
    name: 'Sam Rivers',
    grade: 11,
    progress: 0.58,
  },
};

export async function GET(_: Request, { params }: { params: { learnerId: string } }) {
  const learner: LearnerDto = mockLearners[params.learnerId] ?? {
    id: params.learnerId,
    tenant_id: 'tenant-1',
    name: 'Fallback Learner',
    grade: 6,
  };

  return NextResponse.json(learner, { status: 200 });
}
