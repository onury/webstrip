// core modules
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';

/**
 * Decodes a response body according to its "Content-Encoding" header. Bodies
 * with no encoding, `identity`, or an encoding Node cannot decode are returned
 * as they are.
 *
 * @param body - The raw response body.
 * @param encoding - The value of the "Content-Encoding" response header.
 * @returns The decoded body.
 *
 * @example
 * ```ts
 * decodeBody(gzipSync('<p>hi</p>'), 'gzip').toString(); // → '<p>hi</p>'
 * ```
 */
export function decodeBody(body: Buffer, encoding?: string): Buffer {
  switch (encoding?.trim().toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return gunzipSync(body);
    case 'deflate':
      return inflateSync(body);
    case 'br':
      return brotliDecompressSync(body);
    default:
      return body;
  }
}
