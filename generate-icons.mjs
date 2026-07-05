import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';

const AVATAR_URL = 'https://avatars.githubusercontent.com/u/87264036?v=4';
const PUBLIC_DIR = './public';

// 0.5 for circle, 0.2 for rounded square (iOS style), 0 for sharp corners
const CORNER_ROUNDNESS = 0.2;

async function generateIcons() {
  console.log('Fetching avatar image...');
  const response = await fetch(AVATAR_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch avatar: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();

  const width = metadata.width || 512;
  const height = metadata.height || 512;
  const size = Math.min(width, height);

  console.log(`Source dimensions: ${width}x${height}. Targeting square size: ${size}px.`);

  const rx = size * CORNER_ROUNDNESS;
  const ry = size * CORNER_ROUNDNESS;

  const mask = Buffer.from(`
    <svg width="${size}" height="${size}">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" ry="${ry}" fill="#fff" />
    </svg>
  `);

  console.log('Applying mask...');
  const maskedImage = await sharp(buffer)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Ensure public/images directory exists
  const imagesDir = `${PUBLIC_DIR}/images`;
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Save the high-res masked version as your main logo
  console.log('Generating images/logo.png...');
  await sharp(maskedImage).png().toFile(`${imagesDir}/logo.png`);

  const targets = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'web-app-manifest-192x192.png', size: 192 },
    { name: 'web-app-manifest-512x512.png', size: 512 },
  ];

  for (const { name, size } of targets) {
    console.log(`Generating ${name}...`);
    await sharp(maskedImage)
      .resize(size, size, { kernel: 'lanczos3' })
      .png()
      .toFile(`${PUBLIC_DIR}/${name}`);
  }

  console.log('Generating favicon.ico...');
  await sharp(maskedImage)
    .resize(48, 48, { kernel: 'lanczos3' })
    .png()
    .toFile(`${PUBLIC_DIR}/favicon.ico`);

  console.log('Done!');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
