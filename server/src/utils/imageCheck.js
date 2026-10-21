import fs from 'node:fs/promises';

// Real image files start with fixed "magic bytes". Checking them stops a renamed .exe or .html
// from being accepted just because its name ends in .jpg.
export function hasImageSignature(buf) {
  const jpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return jpeg || png;
}

export async function fileHasImageSignature(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buf, 0, 8, 0);
    return hasImageSignature(buf.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}
