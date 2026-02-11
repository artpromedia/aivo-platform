// test-prisma.js - Test Prisma client loading
const { PrismaClient } = require('/app/generated/prisma-client');
const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://test:test@localhost:5432/test' } }
});

p.$connect()
  .then(() => console.log('Connected OK'))
  .catch(e => {
    console.log('ERROR TYPE:', e.constructor.name);
    console.log('ERROR CODE:', e.code || e.errorCode);
    console.log('ERROR MSG:', e.message.substring(0, 500));
    process.exit(1);
  });
