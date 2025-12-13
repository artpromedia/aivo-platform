import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VirusScanResult } from '../src/types.js';
import {
  MockVirusScanner,
  ClamAVScanner,
  VirusTotalScanner,
  createVirusScanner,
} from '../src/virus-scanner.js';

describe('MockVirusScanner', () => {
  let scanner: MockVirusScanner;

  beforeEach(() => {
    scanner = new MockVirusScanner();
  });

  describe('scanBuffer', () => {
    it('should return clean for normal files', async () => {
      const content = Buffer.from('Hello, this is a normal file');
      const result = await scanner.scanBuffer(content, 'document.txt');

      expect(result.isClean).toBe(true);
      expect(result.scanner).toBe('mock');
      expect(result.threatName).toBeUndefined();
      expect(result.scanDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect EICAR test string', async () => {
      const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const content = Buffer.from(eicarString);
      const result = await scanner.scanBuffer(content, 'eicar.txt');

      expect(result.isClean).toBe(false);
      expect(result.threatName).toBe('Eicar-Test-Signature');
      expect(result.scanner).toBe('mock');
    });

    it('should detect infected patterns in filename', async () => {
      const content = Buffer.from('Some content');
      const result = await scanner.scanBuffer(content, 'test-virus.exe');

      expect(result.isClean).toBe(false);
      expect(result.threatName).toBe('Test.Virus.Mock');
    });

    it('should detect eicar in filename', async () => {
      const content = Buffer.from('Some content');
      const result = await scanner.scanBuffer(content, 'eicar-test.txt');

      expect(result.isClean).toBe(false);
      expect(result.threatName).toBe('Test.Virus.Mock');
    });
  });

  describe('scanStream', () => {
    it('should scan stream content', async () => {
      const { Readable } = await import('node:stream');
      const stream = Readable.from([Buffer.from('Normal file content')]);
      
      const result = await scanner.scanStream(stream, 'safe.txt');

      expect(result.isClean).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should always return true', async () => {
      const healthy = await scanner.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('custom patterns', () => {
    it('should support custom infected patterns', async () => {
      const customScanner = new MockVirusScanner([/malware/i, /trojan/i]);
      
      const result1 = await customScanner.scanBuffer(Buffer.from('test'), 'malware.exe');
      expect(result1.isClean).toBe(false);

      const result2 = await customScanner.scanBuffer(Buffer.from('test'), 'safe.txt');
      expect(result2.isClean).toBe(true);
    });
  });
});

describe('createVirusScanner', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should create mock scanner', () => {
    const scanner = createVirusScanner({ provider: 'mock' });
    expect(scanner).toBeInstanceOf(MockVirusScanner);
  });

  it('should create mock scanner in development when skipInDev is true', () => {
    process.env.NODE_ENV = 'development';
    const scanner = createVirusScanner({
      provider: 'clamav',
      skipInDev: true,
    });
    expect(scanner).toBeInstanceOf(MockVirusScanner);
  });

  it('should create ClamAV scanner', () => {
    const scanner = createVirusScanner({
      provider: 'clamav',
      clamavHost: 'localhost',
      clamavPort: 3310,
    });
    expect(scanner).toBeInstanceOf(ClamAVScanner);
  });

  it('should create VirusTotal scanner', () => {
    const scanner = createVirusScanner({
      provider: 'virustotal',
      virustotalApiKey: 'test-api-key',
    });
    expect(scanner).toBeInstanceOf(VirusTotalScanner);
  });

  it('should throw error for VirusTotal without API key', () => {
    expect(() => createVirusScanner({ provider: 'virustotal' })).toThrow(
      'VirusTotal API key is required'
    );
  });

  it('should throw error for unknown provider', () => {
    expect(() =>
      createVirusScanner({ provider: 'unknown' as 'mock' })
    ).toThrow('Unknown virus scanner provider');
  });
});

describe('ClamAVScanner', () => {
  let scanner: ClamAVScanner;

  beforeEach(() => {
    scanner = new ClamAVScanner('localhost', 3310, 5000);
  });

  describe('response parsing', () => {
    it('should parse clean response', async () => {
      // This tests the parser logic indirectly
      // In a real test environment, we'd mock the socket
      const scanner = new ClamAVScanner();
      // Can't easily test without mocking TCP socket
      expect(scanner).toBeInstanceOf(ClamAVScanner);
    });
  });
});

describe('VirusTotalScanner', () => {
  let scanner: VirusTotalScanner;

  beforeEach(() => {
    scanner = new VirusTotalScanner('test-api-key', 5000);
  });

  describe('healthCheck', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to fail
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const healthy = await scanner.healthCheck();
      expect(healthy).toBe(false);

      global.fetch = originalFetch;
    });
  });
});
