/**
 * AIVO Model Monitoring Service - Entry Point
 */

import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';

async function main() {
  try {
    const app = await createApp();

    // Start server
    await app.listen({ port: config.port, host: config.host });

    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║  🔍 AIVO Model Monitoring Service                                     ║
║  📊 Production ML Model Monitoring                                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Port:        ${config.port.toString().padEnd(58)} ║
║  Environment: ${config.environment.padEnd(58)} ║
║  Log Level:   ${config.logLevel.padEnd(58)} ║
╚═══════════════════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
