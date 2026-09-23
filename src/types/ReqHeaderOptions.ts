/**
 * What a generated header should contain: the first built-in value
 * (`'default'`), a random built-in value (`'random'`), or nothing (`'none'`).
 */
export type HeaderInc = 'default' | 'random' | 'none';

/**
 * Options for generating the request headers. When `headerOptions` is omitted
 * altogether, webstrip picks a random user agent and keeps the connection alive.
 *
 * @example
 * ```ts
 * const headerOptions: ReqHeaderOptions = { ua: 'random', referer: 'none', dnt: false };
 * ```
 */
export interface ReqHeaderOptions {
  /**
   * What the "Accept-Language" header contains. `'any'` sends `*`.
   * @defaultValue `'default'`
   */
  language?: HeaderInc | 'any';
  /**
   * What the "Accept-Encoding" header contains. `'any'` sends `*`. When not
   * set, an uncompressed (identity) response is requested. Compressed HTTP
   * responses (gzip, deflate, br) are decoded.
   * @defaultValue `undefined`
   */
  encoding?: HeaderInc | 'any';
  /**
   * What the "Accept" (MIME) header contains. `'any'` sends `*\/*`. When not
   * set, HTML, XML and text are accepted.
   * @defaultValue `undefined`
   */
  mime?: HeaderInc | 'any';
  /**
   * What the "User-Agent" header contains.
   * @defaultValue `'default'`
   */
  ua?: HeaderInc;
  /**
   * What the "Referer" header contains.
   * @defaultValue `'default'`
   */
  referer?: HeaderInc;
  /**
   * Whether to send the no-cache headers ("Cache-Control", "Pragma", "Expires").
   * @defaultValue `true`
   */
  noCache?: boolean;
  /**
   * Whether to send the "Upgrade-Insecure-Requests" header.
   * @defaultValue `true`
   */
  secure?: boolean;
  /**
   * Whether to send the "Do Not Track" (DNT) header.
   * @defaultValue `true`
   */
  dnt?: boolean;
  /**
   * Whether to keep the connection alive. `true` sends "Connection:
   * keep-alive", `false` sends "Connection: close", and leaving it out sends
   * no "Connection" header.
   * @defaultValue `undefined`
   */
  keepAlive?: boolean;
}
