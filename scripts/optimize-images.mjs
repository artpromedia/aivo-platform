import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const QUALITY_WEBP = 85;
const QUALITY_THUMB = 80;
const MAX_WIDTH = 1920;
const THUMB_WIDTH = 400;

async function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

async function optimizeImage(filePath) {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const outputDir = dirname(filePath);
    
    // Skip if already a WebP file
    if (filePath.endsWith('.webp')) {
      console.log(`Skipping already optimized: ${filePath}`);
      return;
    }
    
    // Create optimized WebP version
    if (metadata.width > MAX_WIDTH) {
      await image
        .resize(MAX_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY_WEBP })
        .toFile(filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
      console.log(`Resized and converted: ${filePath}`);
    } else {
      await image
        .webp({ quality: QUALITY_WEBP })
        .toFile(filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
      console.log(`Converted: ${filePath}`);
    }
    
    // Create thumbnail
    await image
      .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY_THUMB })
      .toFile(filePath.replace(/\.(jpg|jpeg|png)$/i, '-thumb.webp'));
    console.log(`Created thumbnail: ${filePath}`);
    
  } catch (error) {
    console.error(`Error optimizing ${filePath}:`, error.message);
  }
}

async function processDirectory(dir) {
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = join(dir, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        await processDirectory(filePath);
      } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
        await optimizeImage(filePath);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Directory not found: ${dir} - skipping`);
    } else {
      throw error;
    }
  }
}

// Process learner-app images
const imageDirs = [
  './apps/learner-app/public/images',
  './apps/learner-app/public/assets',
];

console.log('Starting image optimization...\n');

for (const dir of imageDirs) {
  console.log(`Processing: ${dir}`);
  await processDirectory(dir);
}

console.log('\nImage optimization complete!');
