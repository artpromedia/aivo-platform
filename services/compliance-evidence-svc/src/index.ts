// ════════════════════════════════════════════════════════════════
// compliance-evidence-svc — Entry Point
// ════════════════════════════════════════════════════════════════

import { createApp } from './app.js';
import { config } from './config.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';

// Import all collector implementations to register them
import './collectors/access-review.js';
import './collectors/change-management.js';
import './collectors/vulnerability-scan.js';
import './collectors/backup-verification.js';
import './collectors/uptime.js';
import './collectors/audit-logs.js';
import './collectors/encryption-config.js';
import './collectors/monitoring-config.js';
import './collectors/network-config.js';
import './collectors/incident-history.js';
import './collectors/privacy-evidence.js';
import './collectors/org-policies.js';
import './collectors/auth-config.js';
import './collectors/cicd-evidence.js';
import './collectors/infra-config.js';
import './collectors/data-quality.js';

async function main() {
  const app = createApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      stopScheduler();
      await app.close();
      app.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`compliance-evidence-svc running on port ${config.port}`);

    // Start cron scheduler after server is ready
    await startScheduler(app.prisma, app.log);
    app.log.info('Evidence collection scheduler started');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
