import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3010', 10);

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Device Management Service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
