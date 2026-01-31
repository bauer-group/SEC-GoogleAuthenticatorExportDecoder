/**
 * PWA Icon Generator
 * Generates professional PWA icons for the Google Authenticator Export Decoder app.
 * Creates a modern QR-code inspired design with security elements.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');

// Ensure public directory exists
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// Color palette - Modern blue gradient
const COLORS = {
  primary: { r: 59, g: 130, b: 246 },      // Blue-500
  primaryDark: { r: 37, g: 99, b: 235 },   // Blue-600
  accent: { r: 99, g: 102, b: 241 },       // Indigo-500
  white: { r: 255, g: 255, b: 255 },
  dark: { r: 30, g: 41, b: 59 },           // Slate-800
};

/**
 * Creates a PNG file with a professional QR-code inspired icon
 */
function createPNG(size) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // CRC32 calculation
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // Create PNG chunk
  function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([length, typeAndData, crc]);
  }

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = createChunk('IHDR', ihdrData);

  // Create image data
  const rawData = [];
  const padding = Math.floor(size * 0.1);
  const iconArea = size - (padding * 2);
  const unit = Math.floor(iconArea / 7);
  const cornerSize = unit * 3;
  const cornerInner = unit;

  // Rounded corner radius
  const cornerRadius = Math.floor(size * 0.12);

  for (let y = 0; y < size; y++) {
    rawData.push(0); // Filter type: None
    for (let x = 0; x < size; x++) {
      let color = COLORS.white;

      // Create rounded rectangle background
      const isInRoundedRect = isInsideRoundedRect(x, y, size, cornerRadius);

      if (isInRoundedRect) {
        // Gradient background (top-left to bottom-right)
        const gradientFactor = (x + y) / (size * 2);
        color = lerpColor(COLORS.primary, COLORS.primaryDark, gradientFactor);

        // Translate to icon coordinate system
        const ix = x - padding;
        const iy = y - padding;

        // Draw QR-code pattern elements
        if (ix >= 0 && ix < iconArea && iy >= 0 && iy < iconArea) {
          // Top-left position finder pattern
          if (isPositionFinderPattern(ix, iy, 0, 0, cornerSize, cornerInner, unit)) {
            color = COLORS.white;
          }
          // Top-right position finder pattern
          else if (isPositionFinderPattern(ix, iy, iconArea - cornerSize, 0, cornerSize, cornerInner, unit)) {
            color = COLORS.white;
          }
          // Bottom-left position finder pattern
          else if (isPositionFinderPattern(ix, iy, 0, iconArea - cornerSize, cornerSize, cornerInner, unit)) {
            color = COLORS.white;
          }
          // Center lock/key symbol
          else if (isCenterSymbol(ix, iy, iconArea, unit)) {
            color = COLORS.white;
          }
          // Decorative data modules
          else if (isDataModule(ix, iy, iconArea, unit, cornerSize)) {
            color = COLORS.white;
          }
        }
      }

      rawData.push(color.r, color.g, color.b);
    }
  }

  // Compress and create IDAT
  const rawBuffer = Buffer.from(rawData);
  const compressedData = deflateUncompressed(rawBuffer);
  const idat = createChunk('IDAT', compressedData);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Check if point is inside a rounded rectangle
 */
function isInsideRoundedRect(x, y, size, radius) {
  // Check corners
  if (x < radius && y < radius) {
    return Math.sqrt((radius - x) ** 2 + (radius - y) ** 2) <= radius;
  }
  if (x >= size - radius && y < radius) {
    return Math.sqrt((x - (size - radius)) ** 2 + (radius - y) ** 2) <= radius;
  }
  if (x < radius && y >= size - radius) {
    return Math.sqrt((radius - x) ** 2 + (y - (size - radius)) ** 2) <= radius;
  }
  if (x >= size - radius && y >= size - radius) {
    return Math.sqrt((x - (size - radius)) ** 2 + (y - (size - radius)) ** 2) <= radius;
  }
  return true;
}

/**
 * QR Code position finder pattern (the three corner squares)
 */
function isPositionFinderPattern(x, y, ox, oy, size, inner, unit) {
  const lx = x - ox;
  const ly = y - oy;

  if (lx < 0 || lx >= size || ly < 0 || ly >= size) return false;

  // Outer border
  const isOuterBorder = lx < unit || lx >= size - unit || ly < unit || ly >= size - unit;
  // Inner square
  const isInnerSquare = lx >= inner && lx < size - inner && ly >= inner && ly < size - inner;

  return isOuterBorder || isInnerSquare;
}

/**
 * Center lock symbol (simplified)
 */
function isCenterSymbol(x, y, areaSize, unit) {
  const centerX = areaSize / 2;
  const centerY = areaSize / 2;
  const dx = x - centerX;
  const dy = y - centerY;

  const lockWidth = unit * 1.2;
  const lockHeight = unit * 1.5;
  const archRadius = unit * 0.8;
  const archThickness = unit * 0.3;

  // Lock body (rounded rectangle)
  const inBody = Math.abs(dx) <= lockWidth && dy >= 0 && dy <= lockHeight;

  // Lock arch (semi-circle outline)
  const archCenterY = 0;
  const distFromArchCenter = Math.sqrt(dx * dx + (dy - archCenterY) * (dy - archCenterY));
  const inArch = dy <= archCenterY &&
                 distFromArchCenter >= archRadius - archThickness &&
                 distFromArchCenter <= archRadius + archThickness;

  return inBody || inArch;
}

/**
 * Decorative data modules around the icon
 */
function isDataModule(x, y, areaSize, unit, cornerSize) {
  const modulePositions = [
    // Right side timing pattern
    { x: areaSize - unit * 1.5, y: cornerSize + unit },
    { x: areaSize - unit * 1.5, y: cornerSize + unit * 2.5 },
    // Bottom timing pattern
    { x: cornerSize + unit, y: areaSize - unit * 1.5 },
    { x: cornerSize + unit * 2.5, y: areaSize - unit * 1.5 },
    // Scattered modules
    { x: areaSize - unit * 1.5, y: areaSize - cornerSize - unit * 1.5 },
    { x: cornerSize + unit * 1.5, y: cornerSize + unit * 1.5 },
  ];

  const moduleRadius = unit * 0.4;

  for (const pos of modulePositions) {
    const dx = x - pos.x;
    const dy = y - pos.y;
    if (dx * dx + dy * dy <= moduleRadius * moduleRadius) {
      return true;
    }
  }

  return false;
}

/**
 * Linear interpolation between two colors
 */
function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

/**
 * DEFLATE compression (uncompressed blocks)
 */
function deflateUncompressed(data) {
  const chunks = [];
  const maxBlockSize = 65535;
  let offset = 0;

  chunks.push(Buffer.from([0x78, 0x01]));

  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, maxBlockSize);
    const isFinalBlock = offset + blockSize >= data.length;

    const header = isFinalBlock ? 0x01 : 0x00;
    chunks.push(Buffer.from([header]));

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt16LE(blockSize, 0);
    lenBuf.writeUInt16LE(blockSize ^ 0xFFFF, 2);
    chunks.push(lenBuf);

    chunks.push(data.subarray(offset, offset + blockSize));
    offset += blockSize;
  }

  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler32 = ((b << 16) | a) >>> 0;
  const adlerBuf = Buffer.alloc(4);
  adlerBuf.writeUInt32BE(adler32, 0);
  chunks.push(adlerBuf);

  return Buffer.concat(chunks);
}

// Generate icons
console.log('Generating PWA icons...');

const sizes = [192, 512];

for (const size of sizes) {
  const icon = createPNG(size);
  const filename = `icon-${size}x${size}.png`;
  writeFileSync(join(publicDir, filename), icon);
  console.log(`✓ Created public/${filename}`);
}

console.log('\nPWA icons generated successfully!');
