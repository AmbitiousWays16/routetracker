import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, renameSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function optimizeImage(inputPath, quality = 85) {
  try {
    const tempPath = inputPath + '.tmp';
    const info = await sharp(inputPath)
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toFile(tempPath);
    
    // Replace original with optimized version
    renameSync(tempPath, inputPath);
    
    console.log(`✓ Optimized ${inputPath}`);
    console.log(`  Size: ${(info.size / 1024).toFixed(2)} KB`);
    return info;
  } catch (error) {
    console.error(`✗ Failed to optimize ${inputPath}:`, error.message);
    throw error;
  }
}

async function main() {
  const images = [
    join(rootDir, 'src/assets/mileage-tracker-icon.jpg'),
    join(rootDir, 'public/favicon.jpg')
  ];

  console.log('Starting image optimization...\n');

  for (const imagePath of images) {
    if (existsSync(imagePath)) {
      await optimizeImage(imagePath, 85);
    } else {
      console.log(`⚠ Skipping ${imagePath} (file not found)`);
    }
  }

  console.log('\n✓ All images optimized!');
}

main().catch(console.error);
