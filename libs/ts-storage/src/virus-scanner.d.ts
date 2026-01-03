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
import type { VirusScannerConfig, VirusScanResult } from './types.js';
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
/**
 * ClamAV scanner implementation using clamd protocol
 */
export declare class ClamAVScanner implements IVirusScanner {
    private readonly host;
    private readonly port;
    private readonly timeout;
    constructor(host?: string, port?: number, timeout?: number);
    scanBuffer(content: Buffer, filename: string): Promise<VirusScanResult>;
    scanStream(stream: Readable, filename: string): Promise<VirusScanResult>;
    healthCheck(): Promise<boolean>;
    private sendCommand;
    private sendToClam;
    private parseResult;
}
/**
 * VirusTotal API scanner implementation
 */
export declare class VirusTotalScanner implements IVirusScanner {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    constructor(apiKey: string, timeout?: number);
    scanBuffer(content: Buffer, filename: string): Promise<VirusScanResult>;
    scanStream(stream: Readable, filename: string): Promise<VirusScanResult>;
    healthCheck(): Promise<boolean>;
    private uploadFile;
    private waitForResult;
    private fetchAnalysis;
}
/**
 * Mock scanner for testing and development
 */
export declare class MockVirusScanner implements IVirusScanner {
    private readonly infectedPatterns;
    private readonly simulateDelay;
    constructor(infectedPatterns?: RegExp[], simulateDelay?: number);
    scanBuffer(content: Buffer, filename: string): Promise<VirusScanResult>;
    scanStream(stream: Readable, filename: string): Promise<VirusScanResult>;
    private scanStreamToBuffer;
    healthCheck(): Promise<boolean>;
}
/**
 * Create a virus scanner based on configuration
 */
export declare function createVirusScanner(config: VirusScannerConfig): IVirusScanner;
export type { VirusScannerConfig, VirusScanResult } from './types.js';
//# sourceMappingURL=virus-scanner.d.ts.map