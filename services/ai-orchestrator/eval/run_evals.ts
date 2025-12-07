import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ExpectedProperties {
  mustInclude?: string[];
  mustNotInclude?: string[];
  maxWords?: number;
}

interface BaseTestCase {
  id: string;
  expectedProperties: ExpectedProperties;
}

interface BaselineTestCase extends BaseTestCase {
  grade: string;
  domain: string;
  promptContext: string;
}

interface TutorTestCase extends BaseTestCase {
  subject: string;
  problem: string;
  targetDifficulty: string;
}

type AgentType = 'BASELINE' | 'TUTOR';

type TestCase = BaselineTestCase | TutorTestCase;

interface AgentVersions {
  current?: string | undefined;
  candidate?: string | undefined;
}

interface CallResult {
  content: string;
  tokensUsed: number;
  safetyStatus: string;
  safetyReason?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

interface CaseResult {
  id: string;
  pass: boolean;
  reasons: string[];
  safetyStatus: string;
  safetyReason?: string | undefined;
  tokensUsed: number;
  configVersion?: string | undefined;
  contentPreview: string;
}

interface SuiteResult {
  agentType: AgentType;
  versionLabel: string;
  results: CaseResult[];
  summary: {
    total: number;
    passed: number;
    passRate: number;
    safetyViolations: number;
    avgTokens: number;
  };
}

interface AgentApiResponse {
  response: {
    content: string;
    tokensUsed: number;
    safetyStatus?: string;
    safetyReason?: string;
    metadata?: {
      configVersion?: string;
      [key: string]: unknown;
    };
  };
}

const ORCH_URL = process.env.AI_ORCH_URL ?? 'http://localhost:4010/internal';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'dev-internal-key';
const EVAL_TENANT_ID = process.env.EVAL_TENANT_ID ?? 'eval-tenant';

// __dirname is not defined in ESM; recreate it for tsx runtime
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION_ENV: Record<AgentType, AgentVersions> = {
  BASELINE: {
    current: process.env.AI_AGENT_BASELINE_VERSION,
    candidate: process.env.AI_AGENT_BASELINE_VERSION_CANDIDATE,
  },
  TUTOR: {
    current: process.env.AI_AGENT_TUTOR_VERSION,
    candidate: process.env.AI_AGENT_TUTOR_VERSION_CANDIDATE,
  },
};

async function main() {
  const agentArg = process.argv[2];
  if (agentArg !== 'baseline' && agentArg !== 'tutor') {
    console.error('Usage: pnpm run eval:baseline | pnpm run eval:tutor');
    process.exit(1);
  }

  const agentType: AgentType = agentArg === 'baseline' ? 'BASELINE' : 'TUTOR';
  const datasetPath = path.join(
    __dirname,
    agentType === 'BASELINE' ? './baseline_test_set.json' : './tutor_test_set.json'
  );

  const testCases = readTestSet(datasetPath);
  const versions = VERSION_ENV[agentType];

  const results: SuiteResult[] = [];
  const currentVersionLabel = versions.current ?? 'active';
  results.push(await runSuite(agentType, currentVersionLabel, versions.current, testCases));

  if (versions.candidate) {
    results.push(await runSuite(agentType, 'candidate', versions.candidate, testCases));
  }

  const outputPath = path.join(
    __dirname,
    'results',
    `${agentType.toLowerCase()}_eval_summary.json`
  );
  writeSummary(outputPath, results, versions);
}

function readTestSet(filePath: string): TestCase[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array of test cases in ${filePath}`);
  }

  return parsed as TestCase[];
}

async function runSuite(
  agentType: AgentType,
  versionLabel: string,
  versionHint: string | undefined,
  testCases: TestCase[]
): Promise<SuiteResult> {
  const results: CaseResult[] = [];

  for (const testCase of testCases) {
    const call = await callAgent(agentType, testCase, versionHint);
    const evaluation = evaluateCase(agentType, testCase, call, versionHint);
    results.push(evaluation);
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const safetyViolations = results.filter((r) => r.safetyStatus !== 'OK').length;
  const avgTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0) / Math.max(1, total);

  return {
    agentType,
    versionLabel,
    results,
    summary: {
      total,
      passed,
      passRate: Number(((passed / Math.max(1, total)) * 100).toFixed(2)),
      safetyViolations,
      avgTokens: Number(avgTokens.toFixed(2)),
    },
  };
}

async function callAgent(
  agentType: AgentType,
  testCase: TestCase,
  versionHint?: string
): Promise<CallResult> {
  const payload = buildPayload(agentType, testCase);
  const body = {
    tenantId: EVAL_TENANT_ID,
    agentType,
    payload,
    metadata: {
      evalRun: true,
      testId: testCase.id,
      requestedVersion: versionHint,
    },
  };

  const res = await fetch(`${ORCH_URL}/ai/test-agent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-api-key': INTERNAL_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Request failed ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as AgentApiResponse;
  const { response } = json;

  return {
    content: response.content,
    tokensUsed: response.tokensUsed,
    safetyStatus: response.safetyStatus ?? 'UNKNOWN',
    safetyReason: response.safetyReason,
    metadata: response.metadata,
  };
}

function buildPayload(agentType: AgentType, testCase: TestCase): Record<string, unknown> {
  if (agentType === 'BASELINE') {
    const base = testCase as BaselineTestCase;
    return {
      grade: base.grade,
      domain: base.domain,
      promptContext: base.promptContext,
      expectedProperties: base.expectedProperties,
    };
  }
  const tutor = testCase as TutorTestCase;
  return {
    subject: tutor.subject,
    problem: tutor.problem,
    targetDifficulty: tutor.targetDifficulty,
    expectedProperties: tutor.expectedProperties,
  };
}

function evaluateCase(
  agentType: AgentType,
  testCase: TestCase,
  call: CallResult,
  expectedVersion?: string
): CaseResult {
  const reasons: string[] = [];
  const contentLower = call.content.toLowerCase();
  const words = call.content.trim().length ? call.content.trim().split(/\s+/).length : 0;

  const props = testCase.expectedProperties;

  if (props.maxWords && words > props.maxWords) {
    reasons.push(`too long: ${words} words > ${props.maxWords}`);
  }

  if (props.mustInclude) {
    for (const kw of props.mustInclude) {
      if (!contentLower.includes(kw.toLowerCase())) {
        reasons.push(`missing keyword: ${kw}`);
      }
    }
  }

  if (props.mustNotInclude) {
    for (const kw of props.mustNotInclude) {
      if (contentLower.includes(kw.toLowerCase())) {
        reasons.push(`should not include: ${kw}`);
      }
    }
  }

  if (call.safetyStatus !== 'OK') {
    reasons.push(
      `safety=${call.safetyStatus}${call.safetyReason ? ` (${call.safetyReason})` : ''}`
    );
  }

  const configVersion = (call.metadata?.configVersion as string | undefined) ?? undefined;
  if (expectedVersion && configVersion && expectedVersion !== configVersion) {
    reasons.push(`version-mismatch expected=${expectedVersion} got=${configVersion}`);
  }

  const pass = reasons.length === 0;

  return {
    id: testCase.id,
    pass,
    reasons,
    safetyStatus: call.safetyStatus,
    safetyReason: call.safetyReason,
    tokensUsed: call.tokensUsed,
    configVersion,
    contentPreview: call.content.slice(0, 120),
  };
}

function writeSummary(outputPath: string, suites: SuiteResult[], versions: AgentVersions) {
  const report = {
    generatedAt: new Date().toISOString(),
    orchestrator: ORCH_URL,
    suites,
    versions,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  // Also log a concise summary
  for (const suite of suites) {
    console.log(
      `[${suite.agentType}][${suite.versionLabel}] passRate=${suite.summary.passRate}% ` +
        `safetyViolations=${suite.summary.safetyViolations}/${suite.summary.total} avgTokens=${suite.summary.avgTokens}`
    );
  }

  console.log(`Detailed report written to ${outputPath}`);
}

void main();
