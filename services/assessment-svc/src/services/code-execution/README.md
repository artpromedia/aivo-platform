# Code Execution Service

Sandboxed code execution for student code assessments using Docker containers.

## Features

- ✅ **Sandboxed Execution**: All code runs in isolated Docker containers
- ✅ **Resource Limits**: Configurable CPU, memory, and time limits
- ✅ **Network Isolation**: No network access from running code
- ✅ **Multiple Languages**: JavaScript, Python, Java, C++, C#, SQL
- ✅ **Security**: Read-only filesystems, process limits, no sudo access

## Supported Languages

| Language   | Docker Image                              | Notes                           |
| ---------- | ----------------------------------------- | ------------------------------- |
| JavaScript | `node:20-alpine`                          | Node.js 20 LTS                  |
| Python     | `python:3.12-alpine`                      | Python 3.12                     |
| Java       | `openjdk:17-alpine`                       | OpenJDK 17, compiles before run |
| C++        | `gcc:13-alpine`                           | GCC 13, compiles before run     |
| C#         | `mcr.microsoft.com/dotnet/sdk:8.0-alpine` | .NET 8 with dotnet-script       |
| SQL        | `postgres:16-alpine`                      | PostgreSQL 16                   |

## Configuration

### Environment Variables

```bash
# Enable code execution (required)
CODE_EXECUTION_ENABLED=true

# Optional: Override default resource limits
CODE_EXEC_TIMEOUT_SECONDS=10
CODE_EXEC_MEMORY_MB=128
```

### Docker Requirements

- Docker must be installed and running
- Docker daemon must be accessible to the Node.js process
- Required images will be automatically pulled on first use

## Usage

### Basic Example

```typescript
import { codeExecutor } from './services/code-execution';

// Execute Python code
const result = await codeExecutor.execute({
  code: 'print("Hello, World!")',
  language: 'python',
  timeoutSeconds: 5,
  memoryLimitMb: 64,
});

console.log(result.output); // "Hello, World!\n"
```

### With Input

```typescript
const result = await codeExecutor.execute({
  code: `
    n = int(input())
    print(n * 2)
  `,
  language: 'python',
  input: '21',
});

console.log(result.output); // "42\n"
```

### Error Handling

```typescript
try {
  const result = await codeExecutor.execute({
    code: 'print(undefined_variable)',
    language: 'python',
  });
} catch (error) {
  console.error(error.message);
  // Runtime error: NameError: name 'undefined_variable' is not defined
}
```

## Security

### Container Isolation

All code executes in Docker containers with:

- **No network access**: `--network none`
- **Read-only filesystem**: `--read-only`
- **Limited writable tmp**: `--tmpfs /tmp:rw,noexec,nosuid,size=10m`
- **Memory limit**: `--memory 128m --memory-swap 128m`
- **CPU limit**: `--cpus 1`
- **Process limit**: `--pids-limit 50`
- **Auto-cleanup**: `--rm` removes container after execution

### Resource Limits

- **Execution time**: 10 seconds default (configurable)
- **Memory**: 128MB default (configurable)
- **Output size**: 10KB maximum (truncated if exceeded)
- **Processes**: Maximum 50 processes per container

### Best Practices

1. **Always enable timeouts**: Prevent infinite loops
2. **Set memory limits**: Prevent memory exhaustion attacks
3. **Validate code**: Check for obvious malicious patterns before execution
4. **Monitor Docker**: Ensure Docker daemon is healthy
5. **Pull images ahead**: Use `warmUp()` to pre-pull images for faster execution

## API

### `execute(request: ExecutionRequest): Promise<ExecutionResult>`

Executes code in a sandboxed container.

**Parameters:**

```typescript
interface ExecutionRequest {
  code: string;
  language: 'javascript' | 'python' | 'java' | 'cpp' | 'csharp' | 'sql';
  input?: string;
  timeoutSeconds?: number;
  memoryLimitMb?: number;
}
```

**Returns:**

```typescript
interface ExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  exitCode: number;
  timedOut: boolean;
}
```

### `checkDocker(): Promise<boolean>`

Checks if Docker is available on the system.

### `warmUp(): Promise<void>`

Pre-pulls all Docker images for faster first execution.

## Deployment

### Development

```bash
# Enable code execution
export CODE_EXECUTION_ENABLED=true

# Start service (Docker must be running)
pnpm run dev
```

### Production

```bash
# Production environment variables
CODE_EXECUTION_ENABLED=true
CODE_EXEC_TIMEOUT_SECONDS=10
CODE_EXEC_MEMORY_MB=128

# Warm up Docker images on startup
node -e "require('./dist/services/code-execution').codeExecutor.warmUp()"

# Start service
node dist/main.js
```

### Docker Compose

```yaml
services:
  assessment-svc:
    build: .
    environment:
      - CODE_EXECUTION_ENABLED=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Required for Docker-in-Docker
```

## Monitoring

### Health Checks

```typescript
// Check if code execution is available
if (await codeExecutor.checkDocker()) {
  console.log('✅ Code execution ready');
} else {
  console.log('❌ Docker not available');
}
```

### Metrics to Monitor

- Execution time percentiles (p50, p95, p99)
- Timeout rate
- Error rate by language
- Docker container failures
- Memory usage patterns

## Troubleshooting

### "Code execution is disabled"

**Solution**: Set `CODE_EXECUTION_ENABLED=true` environment variable

### "Docker not found"

**Solution**: Install Docker and ensure it's running

### "Permission denied" on /var/run/docker.sock

**Solution**: Add Node.js process user to `docker` group:

```bash
sudo usermod -aG docker $USER
```

### Timeouts on First Run

**Solution**: Pre-pull images with `warmUp()`:

```typescript
await codeExecutor.warmUp();
```

### Out of Memory Errors

**Solution**: Increase `memoryLimitMb` or optimize student code

## Future Enhancements

- [ ] Support for more languages (Ruby, Go, Rust, etc.)
- [ ] Persistent compilation cache for compiled languages
- [ ] Custom test frameworks (JUnit, pytest, etc.)
- [ ] Code quality metrics (complexity, style violations)
- [ ] Integration with Judge0 API as fallback
- [ ] WebAssembly-based execution for client-side grading
- [ ] Real-time execution streaming for large outputs

## License

Internal use only - AIVO Platform
