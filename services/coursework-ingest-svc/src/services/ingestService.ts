import { prisma } from '../prisma.js';

// Define enums locally since they may not be exported from @prisma/client
type IngestStatus = 'PENDING' | 'PROCESSING' | 'EXTRACTING' | 'ANALYZING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type ContentType = 'DOCUMENT' | 'PRESENTATION' | 'SPREADSHEET' | 'VIDEO' | 'AUDIO' | 'SCORM' | 'IMAGE' | 'LINK' | 'OTHER';
type SourceType = 'UPLOAD' | 'URL' | 'LMS_IMPORT' | 'CLOUD_STORAGE' | 'API';

// Job Management
export async function createJob(tenantId: string, data: {
  name: string;
  description?: string;
  sourceType: SourceType;
  sourceUrl?: string;
  sourceConfig?: Record<string, any>;
  targetCourseId?: string;
  targetModuleId?: string;
  options?: Record<string, any>;
  createdBy: string;
}) {
  // Check quota
  await checkQuota(tenantId);

  return prisma.ingestJob.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      sourceConfig: data.sourceConfig,
      targetCourseId: data.targetCourseId,
      targetModuleId: data.targetModuleId,
      options: data.options,
      createdBy: data.createdBy,
      status: 'PENDING',
    },
  });
}

export async function getJob(tenantId: string, jobId: string) {
  return prisma.ingestJob.findFirst({
    where: { id: jobId, tenantId },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      logs: { orderBy: { timestamp: 'desc' }, take: 100 },
    },
  });
}

export async function listJobs(tenantId: string, filters?: {
  status?: IngestStatus;
  createdBy?: string;
  limit?: number;
}) {
  return prisma.ingestJob.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.createdBy && { createdBy: filters.createdBy }),
    },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });
}

export async function cancelJob(tenantId: string, jobId: string) {
  return prisma.ingestJob.update({
    where: { id: jobId, tenantId },
    data: { status: 'CANCELLED' },
  });
}

// Item Management
export async function addItem(tenantId: string, jobId: string, data: {
  originalName: string;
  contentType: ContentType;
  mimeType?: string;
  fileSize?: number;
  sourceUrl?: string;
  storagePath?: string;
}) {
  await prisma.ingestJob.update({
    where: { id: jobId },
    data: { totalItems: { increment: 1 } },
  });

  return prisma.ingestItem.create({
    data: {
      tenantId,
      jobId,
      originalName: data.originalName,
      contentType: data.contentType,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      sourceUrl: data.sourceUrl,
      storagePath: data.storagePath,
      status: 'PENDING',
    },
  });
}

export async function getItem(tenantId: string, itemId: string) {
  return prisma.ingestItem.findFirst({
    where: { id: itemId, tenantId },
    include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
  });
}

// Processing
export async function startProcessing(tenantId: string, jobId: string) {
  await prisma.ingestJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  const items = await prisma.ingestItem.findMany({
    where: { jobId, status: 'PENDING' },
  });

  for (const item of items) {
    await processItem(tenantId, item);
  }

  // Check if all done
  const pending = await prisma.ingestItem.count({
    where: { jobId, status: { in: ['PENDING', 'PROCESSING', 'EXTRACTING', 'ANALYZING'] } },
  });

  if (pending === 0) {
    await prisma.ingestJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }
}

async function processItem(tenantId: string, item: any) {
  const startTime = Date.now();

  try {
    await prisma.ingestItem.update({
      where: { id: item.id },
      data: { status: 'PROCESSING' },
    });

    // Extract text based on content type
    let extractedText = '';
    let metadata: Record<string, any> = {};
    let structure: Record<string, any> = {};

    switch (item.contentType) {
      case 'DOCUMENT':
        const docResult = await extractDocument(item);
        extractedText = docResult.text;
        metadata = docResult.metadata;
        structure = docResult.structure;
        break;

      case 'PRESENTATION':
        const pptResult = await extractPresentation(item);
        extractedText = pptResult.text;
        metadata = pptResult.metadata;
        structure = pptResult.structure;
        break;

      case 'SPREADSHEET':
        const xlsResult = await extractSpreadsheet(item);
        extractedText = xlsResult.text;
        metadata = xlsResult.metadata;
        structure = xlsResult.structure;
        break;

      case 'VIDEO':
      case 'AUDIO':
        // Would integrate with transcription service
        metadata = { duration: 0, hasTranscript: false };
        break;

      case 'SCORM':
        const scormResult = await extractScorm(item);
        metadata = scormResult.metadata;
        structure = scormResult.structure;
        break;

      default:
        extractedText = item.sourceUrl || '';
    }

    await prisma.ingestItem.update({
      where: { id: item.id },
      data: { status: 'EXTRACTING', extractedText, metadata, structure },
    });

    // Chunk the content
    if (extractedText) {
      await chunkContent(tenantId, item.id, extractedText, structure);
    }

    // Analyze content
    await prisma.ingestItem.update({
      where: { id: item.id },
      data: { status: 'ANALYZING' },
    });

    const analysis = await analyzeContent(extractedText, metadata);

    await prisma.ingestItem.update({
      where: { id: item.id },
      data: {
        status: 'COMPLETED',
        topics: analysis.topics,
        keywords: analysis.keywords,
        difficulty: analysis.difficulty,
        estimatedTime: analysis.estimatedTime,
        processingTime: Date.now() - startTime,
      },
    });

    await prisma.ingestJob.update({
      where: { id: item.jobId },
      data: { processedItems: { increment: 1 } },
    });

    await addLog(tenantId, item.jobId, item.id, 'info', `Successfully processed ${item.originalName}`);
  } catch (error: any) {
    await prisma.ingestItem.update({
      where: { id: item.id },
      data: {
        status: 'FAILED',
        error: error.message,
        processingTime: Date.now() - startTime,
      },
    });

    await prisma.ingestJob.update({
      where: { id: item.jobId },
      data: { failedItems: { increment: 1 } },
    });

    await addLog(tenantId, item.jobId, item.id, 'error', `Failed to process ${item.originalName}: ${error.message}`);
  }
}

async function extractDocument(item: any): Promise<{ text: string; metadata: any; structure: any }> {
  // Simplified - real impl would use mammoth, pdf-parse, etc.
  return {
    text: 'Extracted document text...',
    metadata: {
      pageCount: 1,
      author: '',
      createdAt: new Date().toISOString(),
    },
    structure: {
      headings: [],
      paragraphs: [],
      lists: [],
      tables: [],
    },
  };
}

async function extractPresentation(item: any): Promise<{ text: string; metadata: any; structure: any }> {
  return {
    text: 'Extracted presentation text...',
    metadata: { slideCount: 0 },
    structure: { slides: [] },
  };
}

async function extractSpreadsheet(item: any): Promise<{ text: string; metadata: any; structure: any }> {
  return {
    text: 'Extracted spreadsheet text...',
    metadata: { sheetCount: 0 },
    structure: { sheets: [] },
  };
}

async function extractScorm(item: any): Promise<{ metadata: any; structure: any }> {
  return {
    metadata: { version: '1.2', title: '' },
    structure: { items: [] },
  };
}

async function chunkContent(tenantId: string, itemId: string, text: string, structure: any) {
  const chunks = splitIntoChunks(text, 1000); // 1000 char chunks

  for (let i = 0; i < chunks.length; i++) {
    await prisma.contentChunk.create({
      data: {
        tenantId,
        itemId,
        chunkIndex: i,
        chunkType: 'paragraph',
        content: chunks[i],
      },
    });
  }
}

function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function analyzeContent(text: string, metadata: any): Promise<{
  topics: string[];
  keywords: string[];
  difficulty: string;
  estimatedTime: number;
}> {
  // Simplified - real impl would use NLP/AI
  const wordCount = text.split(/\s+/).length;
  const estimatedTime = Math.ceil(wordCount / 200); // 200 wpm

  return {
    topics: [],
    keywords: [],
    difficulty: 'intermediate',
    estimatedTime,
  };
}

// Templates
export async function createTemplate(tenantId: string, data: {
  name: string;
  description?: string;
  contentType: ContentType;
  mappingRules: Record<string, any>;
  transformers?: Record<string, any>;
  validators?: Record<string, any>;
  isDefault?: boolean;
  createdBy: string;
}) {
  if (data.isDefault) {
    // Unset other defaults for this content type
    await prisma.contentTemplate.updateMany({
      where: { tenantId, contentType: data.contentType, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.contentTemplate.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      contentType: data.contentType,
      mappingRules: data.mappingRules,
      transformers: data.transformers ?? undefined,
      validators: data.validators ?? undefined,
      isDefault: data.isDefault || false,
      createdBy: data.createdBy,
    },
  });
}

export async function listTemplates(tenantId: string, contentType?: ContentType) {
  return prisma.contentTemplate.findMany({
    where: {
      tenantId,
      ...(contentType && { contentType }),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

// Import Mappings
export async function createImportMapping(tenantId: string, data: {
  name: string;
  sourceSystem: string;
  contentType: ContentType;
  fieldMappings: Record<string, any>;
  transformers?: Record<string, any>;
}) {
  return prisma.importMapping.create({
    data: {
      tenantId,
      name: data.name,
      sourceSystem: data.sourceSystem,
      contentType: data.contentType,
      fieldMappings: data.fieldMappings,
      transformers: data.transformers ?? undefined,
    },
  });
}

export async function getImportMappings(tenantId: string, sourceSystem?: string) {
  return prisma.importMapping.findMany({
    where: {
      tenantId,
      ...(sourceSystem && { sourceSystem }),
      isActive: true,
    },
  });
}

// Quota Management
async function checkQuota(tenantId: string) {
  let quota = await prisma.ingestQuota.findUnique({
    where: { tenantId },
  });

  if (!quota) {
    quota = await prisma.ingestQuota.create({
      data: { tenantId },
    });
  }

  // Reset daily if needed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (quota.lastResetDaily < today) {
    await prisma.ingestQuota.update({
      where: { tenantId },
      data: { usedToday: 0, lastResetDaily: today },
    });
    quota.usedToday = 0;
  }

  // Reset monthly if needed
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  if (quota.lastResetMonthly < monthStart) {
    await prisma.ingestQuota.update({
      where: { tenantId },
      data: { usedThisMonth: 0, lastResetMonthly: monthStart },
    });
    quota.usedThisMonth = 0;
  }

  if (quota.usedToday >= quota.dailyLimit) {
    throw new Error('Daily ingest quota exceeded');
  }

  if (quota.usedThisMonth >= quota.monthlyLimit) {
    throw new Error('Monthly ingest quota exceeded');
  }

  // Increment usage
  await prisma.ingestQuota.update({
    where: { tenantId },
    data: {
      usedToday: { increment: 1 },
      usedThisMonth: { increment: 1 },
    },
  });
}

export async function getQuota(tenantId: string) {
  let quota = await prisma.ingestQuota.findUnique({
    where: { tenantId },
  });

  if (!quota) {
    quota = await prisma.ingestQuota.create({
      data: { tenantId },
    });
  }

  return quota;
}

export async function updateQuota(tenantId: string, data: {
  dailyLimit?: number;
  monthlyLimit?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
}) {
  return prisma.ingestQuota.update({
    where: { tenantId },
    data,
  });
}

// Logging
async function addLog(tenantId: string, jobId: string, itemId: string | null, level: string, message: string, details?: any) {
  return prisma.ingestLog.create({
    data: { tenantId, jobId, itemId, level, message, details },
  });
}

export async function getJobLogs(tenantId: string, jobId: string, limit = 100) {
  return prisma.ingestLog.findMany({
    where: { tenantId, jobId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

// Webhooks
export async function createWebhook(tenantId: string, data: {
  name: string;
  url: string;
  events: string[];
}) {
  const secret = generateSecret();

  return prisma.webhookEndpoint.create({
    data: {
      tenantId,
      name: data.name,
      url: data.url,
      events: data.events,
      secret,
    },
  });
}

export async function listWebhooks(tenantId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { tenantId, isActive: true },
  });
}

function generateSecret(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');
}
