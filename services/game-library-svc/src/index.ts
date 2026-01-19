import { startApp } from './app.js';

startApp().catch((err: unknown) => {
  console.error('Failed to start Game Library Service:', err);
  process.exit(1);
});
