// core modules
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';

// own modules
import { decodeBody } from '../src/utils/body.js';

describe('decodeBody()', () => {
  const text = '<p>çğıöşü 🔆</p>';
  const raw = Buffer.from(text);
  const decode = (body: Buffer, encoding?: string): string =>
    decodeBody(body, encoding).toString('utf8');

  test('decodes gzip, x-gzip, deflate and br', () => {
    expect(decode(gzipSync(raw), 'gzip')).toBe(text);
    expect(decode(gzipSync(raw), 'x-gzip')).toBe(text);
    expect(decode(deflateSync(raw), 'deflate')).toBe(text);
    expect(decode(brotliCompressSync(raw), 'br')).toBe(text);
  });

  test('is case- and whitespace-insensitive', () => {
    expect(decode(gzipSync(raw), ' GZip ')).toBe(text);
  });

  test('returns other bodies as they are', () => {
    expect(decodeBody(raw)).toBe(raw);
    expect(decodeBody(raw, 'identity')).toBe(raw);
    expect(decodeBody(raw, 'zstd-unknown')).toBe(raw);
  });

  test('throws on a corrupt body', () => {
    expect(() => decodeBody(raw, 'gzip')).toThrow();
  });
});
