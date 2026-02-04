import { promises as fs } from 'node:fs';
import path from 'node:path';

const runtimeDir = path.resolve(process.cwd(), 'generated/prisma-client/runtime');

const stripSourceMap = (contents) =>
  contents.replace(/\n?\/\/# sourceMappingURL=.*$/gm, '');

const run = async () => {
  let entries;
  try {
    entries = await fs.readdir(runtimeDir, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .map(async (entry) => {
        const filePath = path.join(runtimeDir, entry.name);
        const contents = await fs.readFile(filePath, 'utf8');
        const updated = stripSourceMap(contents);
        if (updated !== contents) {
          await fs.writeFile(filePath, updated);
        }
      })
  );
};

await run();
