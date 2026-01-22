/**
 * Code Execution Service
 *
 * Executes student code submissions in sandboxed Docker containers.
 * Provides time and memory limits, network isolation, and supports multiple languages.
 *
 * SECURITY: All code is executed in isolated Docker containers with resource limits.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ExecutionRequest {
  code: string;
  language: 'javascript' | 'python' | 'java' | 'cpp' | 'csharp' | 'sql';
  input?: string;
  timeoutSeconds?: number;
  memoryLimitMb?: number;
}

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  exitCode: number;
  timedOut: boolean;
}

interface LanguageConfig {
  image: string;
  fileExtension: string;
  compileCommand?: string;
  runCommand: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT_SECONDS = 10;
const DEFAULT_MEMORY_LIMIT_MB = 128;
const MAX_OUTPUT_LENGTH = 10000; // 10KB max output

// Docker images for each supported language
const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  javascript: {
    image: 'node:20-alpine',
    fileExtension: 'js',
    runCommand: 'node /sandbox/code.js',
  },
  python: {
    image: 'python:3.12-alpine',
    fileExtension: 'py',
    runCommand: 'python /sandbox/code.py',
  },
  java: {
    image: 'openjdk:17-alpine',
    fileExtension: 'java',
    compileCommand: 'javac /sandbox/Code.java',
    runCommand: 'java -cp /sandbox Code',
  },
  cpp: {
    image: 'gcc:13-alpine',
    fileExtension: 'cpp',
    compileCommand: 'g++ -o /sandbox/code /sandbox/code.cpp',
    runCommand: '/sandbox/code',
  },
  csharp: {
    image: 'mcr.microsoft.com/dotnet/sdk:8.0-alpine',
    fileExtension: 'cs',
    runCommand: 'dotnet script /sandbox/code.cs',
  },
  sql: {
    image: 'postgres:16-alpine',
    fileExtension: 'sql',
    runCommand: 'psql -f /sandbox/code.sql',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class CodeExecutor {
  private readonly enabled: boolean;

  constructor() {
    // Check if Docker is available
    this.enabled = process.env.CODE_EXECUTION_ENABLED === 'true';

    if (!this.enabled) {
      console.warn(
        '[CodeExecutor] Code execution is disabled. Set CODE_EXECUTION_ENABLED=true to enable.'
      );
    }
  }

  /**
   * Execute code in a sandboxed Docker container.
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.enabled) {
      throw new Error('Code execution is disabled. Enable with CODE_EXECUTION_ENABLED=true');
    }

    const config = LANGUAGE_CONFIGS[request.language];
    if (!config) {
      throw new Error(`Unsupported language: ${request.language}`);
    }

    const executionId = randomUUID();
    const workDir = join(tmpdir(), 'code-execution', executionId);
    const startTime = Date.now();

    try {
      // Create temporary directory for code
      await mkdir(workDir, { recursive: true });

      // Write code to file
      const fileName = request.language === 'java' ? 'Code' : 'code';
      const filePath = join(workDir, `${fileName}.${config.fileExtension}`);
      await writeFile(filePath, request.code);

      // Write input if provided
      if (request.input) {
        const inputPath = join(workDir, 'input.txt');
        await writeFile(inputPath, request.input);
      }

      // Compile if needed
      if (config.compileCommand) {
        const compileResult = await this.runDocker({
          image: config.image,
          workDir,
          command: config.compileCommand,
          timeoutSeconds: 30,
          memoryLimitMb: request.memoryLimitMb || DEFAULT_MEMORY_LIMIT_MB,
        });

        if (compileResult.exitCode !== 0) {
          return {
            output: '',
            error: `Compilation error:\n${compileResult.error || compileResult.output}`,
            executionTime: Date.now() - startTime,
            exitCode: compileResult.exitCode,
            timedOut: false,
          };
        }
      }

      // Execute code
      const result = await this.runDocker({
        image: config.image,
        workDir,
        command: config.runCommand,
        input: request.input,
        timeoutSeconds: request.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS,
        memoryLimitMb: request.memoryLimitMb || DEFAULT_MEMORY_LIMIT_MB,
      });

      const executionTime = Date.now() - startTime;

      return {
        output: this.truncateOutput(result.output),
        error: result.error ? this.truncateOutput(result.error) : undefined,
        executionTime,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
      };
    } finally {
      // Clean up temporary files
      await rm(workDir, { recursive: true, force: true }).catch((err) => {
        console.error(`[CodeExecutor] Failed to clean up ${workDir}:`, err);
      });
    }
  }

  /**
   * Run code in a Docker container with resource limits.
   */
  private runDocker(options: {
    image: string;
    workDir: string;
    command: string;
    input?: string;
    timeoutSeconds: number;
    memoryLimitMb: number;
  }): Promise<{ output: string; error: string; exitCode: number; timedOut: boolean }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const dockerArgs = [
        'run',
        '--rm', // Remove container after execution
        '--network',
        'none', // Disable network access
        '--memory',
        `${options.memoryLimitMb}m`, // Memory limit
        '--memory-swap',
        `${options.memoryLimitMb}m`, // No swap
        '--cpus',
        '1', // CPU limit
        '--pids-limit',
        '50', // Process limit
        '--read-only', // Read-only filesystem
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,size=10m', // Writable tmp with limits
        '-v',
        `${options.workDir}:/sandbox:ro`, // Mount code directory as read-only
        '-w',
        '/sandbox',
        options.image,
        'sh',
        '-c',
        options.command,
      ];

      const child = spawn('docker', dockerArgs, {
        timeout: options.timeoutSeconds * 1000,
      });

      // Send input if provided
      if (options.input && child.stdin) {
        child.stdin.write(options.input);
        child.stdin.end();
      }

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        resolve({
          output: stdout,
          error: `Docker error: ${error.message}\n${stderr}`,
          exitCode: -1,
          timedOut: false,
        });
      });

      child.on('exit', (code, signal) => {
        if (signal === 'SIGTERM') {
          timedOut = true;
        }

        resolve({
          output: stdout,
          error: stderr,
          exitCode: code ?? -1,
          timedOut,
        });
      });

      // Set timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, options.timeoutSeconds * 1000);

      child.on('close', () => {
        clearTimeout(timer);
      });
    });
  }

  /**
   * Truncate output to prevent excessive memory usage.
   */
  private truncateOutput(output: string): string {
    if (output.length <= MAX_OUTPUT_LENGTH) {
      return output;
    }

    return (
      output.slice(0, MAX_OUTPUT_LENGTH) +
      `\n... (output truncated after ${MAX_OUTPUT_LENGTH} characters)`
    );
  }

  /**
   * Check if Docker is available on the system.
   */
  async checkDocker(): Promise<boolean> {
    try {
      const result = await new Promise<boolean>((resolve) => {
        const child = spawn('docker', ['--version']);
        let output = '';

        child.stdout?.on('data', (data: Buffer) => {
          output += data.toString();
        });

        child.on('exit', (code) => {
          resolve(code === 0 && output.includes('Docker version'));
        });

        child.on('error', () => {
          resolve(false);
        });
      });

      return result;
    } catch {
      return false;
    }
  }

  /**
   * Pre-pull Docker images for faster execution.
   */
  async warmUp(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    console.log('[CodeExecutor] Warming up Docker images...');

    const images = Object.values(LANGUAGE_CONFIGS).map((config) => config.image);
    const uniqueImages = [...new Set(images)];

    for (const image of uniqueImages) {
      try {
        await new Promise<void>((resolve, reject) => {
          const child = spawn('docker', ['pull', image]);

          child.on('exit', (code) => {
            if (code === 0) {
              console.log(`[CodeExecutor] Pulled ${image}`);
              resolve();
            } else {
              reject(new Error(`Failed to pull ${image}`));
            }
          });

          child.on('error', reject);
        });
      } catch (error) {
        console.error(`[CodeExecutor] Failed to pull ${image}:`, error);
      }
    }

    console.log('[CodeExecutor] Warm-up complete');
  }
}

// Singleton instance
export const codeExecutor = new CodeExecutor();
