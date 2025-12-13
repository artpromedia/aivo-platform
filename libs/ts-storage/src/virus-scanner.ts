/**
 * Virus Scanner for File Uploads
 *
 * Supports multiple scanning backends:
 * - ClamAV (self-hosted)
 * - VirusTotal (cloud API)
 * - Mock (for testing/development)
 *
 * @module @aivo/ts-storage/virus-scanner
 */

import type { Readable } from 'node:stream';
import { Socket } from 'node:net';
import type { VirusScannerConfig, VirusScanResult } from './types.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a readable stream to a buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

// ============================================================================
// Scanner Interface
// ============================================================================

/**
 * Base interface for virus scanners
 */
export interface IVirusScanner {
  /**
   * Scan a buffer for viruses
   */
  scanBuffer(content: Buffer, filename: string): Promise<VirusScanResult>;

  /**
   * Scan a stream for viruses
   */
  scanStream(stream: Readable, filename: string): Promise<VirusScanResult>;

  /**
   * Check scanner health/availability
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// ClamAV Scanner
// ============================================================================

/**
 * ClamAV scanner implementation using clamd protocol
 */
export class ClamAVScanner implements IVirusScanner {
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;

  constructor(host = 'localhost', port = 3310, timeout = 30000) {
    this.host = host;
    this.port = port;
    this.timeout = timeout;
  }

  async scanBuffer(content: Buffer, filename: string): Promise<VirusScanResult> {
    const startTime = Date.now();

    try {
      const result = await this.sendToClam(content);
      const scanDurationMs = Date.now() - startTime;

      return this.parseResult(result, scanDurationMs, filename);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isClean: false,
        scanDurationMs: Date.now() - startTime,
        scanner: 'clamav',
        threatName: `Scan error: ${errorMessage}`,
      };
    }
  }

  async scanStream(stream: Readable, filename: string): Promise<VirusScanResult> {
    const buffer = await streamToBuffer(stream);
    return this.scanBuffer(buffer, filename);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.sendCommand('PING');
      return result.trim() === 'PONG';
    } catch {
      return false;
    }
  }

  private sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let response = '';

      socket.setTimeout(this.timeout);

      socket.on('connect', () => {
        socket.write(`z${command}\0`);
      });

      socket.on('data', (data) => {
        response += data.toString();
      });

      socket.on('end', () => {
        resolve(response);
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('ClamAV connection timeout'));
      });

      socket.connect(this.port, this.host);
    });
  }

  private sendToClam(content: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let response = '';

      socket.setTimeout(this.timeout);

      socket.on('connect', () => {
        // INSTREAM command format: zINSTREAM\0<size><data>...<0000>
        socket.write('zINSTREAM\0');

        // Send data in chunks with size prefixes
        const chunkSize = 2048;
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.subarray(i, Math.min(i + chunkSize, content.length));
          const sizeBuffer = Buffer.alloc(4);
          sizeBuffer.writeUInt32BE(chunk.length);
          socket.write(sizeBuffer);
          socket.write(chunk);
        }

        // End stream with zero-length chunk
        const endBuffer = Buffer.alloc(4);
        endBuffer.writeUInt32BE(0);
        socket.write(endBuffer);
      });

      socket.on('data', (data) => {
        response += data.toString();
      });

      socket.on('end', () => {
        resolve(response);
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('ClamAV scan timeout'));
      });

      socket.connect(this.port, this.host);
    });
  }

  private parseResult(response: string, scanDurationMs: number, _filename: string): VirusScanResult {
    // ClamAV response format: "stream: OK" or "stream: <virus_name> FOUND"
    const trimmed = response.trim().replaceAll(/\0/g, '');

    if (trimmed.endsWith('OK')) {
      return {
        isClean: true,
        scanDurationMs,
        scanner: 'clamav',
      };
    }

    const foundMatch = /: (.+) FOUND$/.exec(trimmed);
    if (foundMatch?.[1]) {
      return {
        isClean: false,
        threatName: foundMatch[1],
        scanDurationMs,
        scanner: 'clamav',
      };
    }

    // Unknown response - treat as error
    return {
      isClean: false,
      threatName: `Unknown ClamAV response: ${trimmed}`,
      scanDurationMs,
      scanner: 'clamav',
    };
  }
}

// ============================================================================
// VirusTotal Scanner
// ============================================================================

/**
 * VirusTotal API scanner implementation
 */
export class VirusTotalScanner implements IVirusScanner {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.virustotal.com/api/v3';
  private readonly timeout: number;

  constructor(apiKey: string, timeout = 60000) {
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  async scanBuffer(content: Buffer, filename: string): Promise<VirusScanResult> {
    const startTime = Date.now();

    try {
      // Upload file for scanning
      const uploadId = await this.uploadFile(content, filename);

      // Poll for results
      const result = await this.waitForResult(uploadId);

      const scanResult: VirusScanResult = {
        isClean: result.isClean,
        scanDurationMs: Date.now() - startTime,
        scanner: 'virustotal',
        rawResponse: result.raw,
      };
      if (result.threatName) {
        scanResult.threatName = result.threatName;
      }
      return scanResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isClean: false,
        threatName: `Scan error: ${errorMessage}`,
        scanDurationMs: Date.now() - startTime,
        scanner: 'virustotal',
      };
    }
  }

  async scanStream(stream: Readable, filename: string): Promise<VirusScanResult> {
    const buffer = await streamToBuffer(stream);
    return this.scanBuffer(buffer, filename);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'GET',
        headers: {
          'x-apikey': this.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 403; // 403 means API key works but no access
    } catch {
      return false;
    }
  }

  private async uploadFile(content: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    const uint8Array = new Uint8Array(content);
    formData.append('file', new Blob([uint8Array]), filename);

    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'x-apikey': this.apiKey,
      },
      body: formData,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`VirusTotal upload failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { data: { id: string } };
    return data.data.id;
  }

  private async waitForResult(
    analysisId: string,
    maxAttempts = 30
  ): Promise<{ isClean: boolean; threatName?: string; raw: unknown }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const analysisResult = await this.fetchAnalysis(analysisId);
      if (analysisResult) {
        return analysisResult;
      }
      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error('VirusTotal analysis timeout');
  }

  private async fetchAnalysis(
    analysisId: string
  ): Promise<{ isClean: boolean; threatName?: string; raw: unknown } | null> {
    const response = await fetch(`${this.baseUrl}/analyses/${analysisId}`, {
      headers: {
        'x-apikey': this.apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`VirusTotal analysis failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      data: {
        attributes: {
          status: string;
          stats: {
            malicious: number;
            suspicious: number;
          };
          results: Record<string, { category: string; result: string | null }>;
        };
      };
    };

    if (data.data.attributes.status !== 'completed') {
      return null;
    }

    const stats = data.data.attributes.stats;
    const isClean = stats.malicious === 0 && stats.suspicious === 0;

    if (isClean) {
      return { isClean: true, raw: data };
    }

    // Find first detected threat
    const results = data.data.attributes.results;
    for (const [engine, result] of Object.entries(results)) {
      if (result.category === 'malicious' && result.result) {
        return { isClean: false, threatName: `${engine}: ${result.result}`, raw: data };
      }
    }

    return { isClean: false, threatName: 'Unknown threat', raw: data };
  }
}

// ============================================================================
// Mock Scanner (for testing)
// ============================================================================

/**
 * Mock scanner for testing and development
 */
export class MockVirusScanner implements IVirusScanner {
  private readonly infectedPatterns: RegExp[];
  private readonly simulateDelay: number;

  constructor(
    infectedPatterns: RegExp[] = [/eicar/i, /test.?virus/i],
    simulateDelay = 100
  ) {
    this.infectedPatterns = infectedPatterns;
    this.simulateDelay = simulateDelay;
  }

  async scanBuffer(content: Buffer, filename: string): Promise<VirusScanResult> {
    const startTime = Date.now();

    // Simulate scanning delay
    await new Promise((resolve) => setTimeout(resolve, this.simulateDelay));

    // Check content for EICAR test string FIRST (higher priority)
    const contentStr = content.toString('utf-8');
    const eicarPattern = String.raw`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR`;
    if (contentStr.includes(eicarPattern)) {
      return {
        isClean: false,
        threatName: 'Eicar-Test-Signature',
        scanDurationMs: Date.now() - startTime,
        scanner: 'mock',
      };
    }

    // Then check filename for test patterns
    for (const pattern of this.infectedPatterns) {
      if (pattern.test(filename)) {
        return {
          isClean: false,
          threatName: 'Test.Virus.Mock',
          scanDurationMs: Date.now() - startTime,
          scanner: 'mock',
        };
      }
    }

    return {
      isClean: true,
      scanDurationMs: Date.now() - startTime,
      scanner: 'mock',
    };
  }

  async scanStream(stream: Readable, filename: string): Promise<VirusScanResult> {
    return this.scanStreamToBuffer(stream, filename);
  }

  private async scanStreamToBuffer(stream: Readable, filename: string): Promise<VirusScanResult> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    return this.scanBuffer(buffer, filename);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a virus scanner based on configuration
 */
export function createVirusScanner(config: VirusScannerConfig): IVirusScanner {
  // Skip scanning in development if configured
  if (config.skipInDev && process.env.NODE_ENV === 'development') {
    console.warn('[VirusScanner] Using mock scanner in development mode');
    return new MockVirusScanner();
  }

  switch (config.provider) {
    case 'clamav':
      return new ClamAVScanner(config.clamavHost ?? 'localhost', config.clamavPort ?? 3310);

    case 'virustotal':
      if (!config.virustotalApiKey) {
        throw new Error('VirusTotal API key is required');
      }
      return new VirusTotalScanner(config.virustotalApiKey);

    case 'mock':
      return new MockVirusScanner();

    default:
      throw new Error(`Unknown virus scanner provider: ${config.provider as string}`);
  }
}

// ============================================================================
// Exports
// ============================================================================

export type { VirusScannerConfig, VirusScanResult } from './types.js';
