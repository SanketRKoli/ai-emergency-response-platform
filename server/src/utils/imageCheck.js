// Real image files start with fixed "magic bytes". The type is decided from them, never from the file name or the
// type the browser claims, so a renamed .exe or .html is rejected.
export function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}
export const hasImageSignature = (buf) => detectImageType(buf) !== null;
