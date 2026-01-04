import { startApp } from './app.js';

startApp().catch((err) => {
  console.error('Failed to start Game Library Service:', err);
  process.exit(1);
});
