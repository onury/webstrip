// core modules
import { randomInt } from 'node:crypto';
import type { OutgoingHttpHeaders } from 'node:http';

// own modules
import type { HeaderInc, ReqHeaderOptions } from '../types/ReqHeaderOptions.js';

// constants
export const REDIRECT_CODES = [301, 302, 303, 307, 308];
/**
 * Special list of user agents for emulating a browser and avoiding getting
 * blocked.
 */
export const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.81',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux i686; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/116.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/126.0.2592.113',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edge/44.18363.8131',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/126.0.2592.113',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0'
];

export const referers = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://www.yahoo.com/',
  'https://duckduckgo.com/',
  'https://search.brave.com/',
  'https://www.facebook.com/',
  'https://www.twitter.com/',
  'https://www.linkedin.com/',
  'https://www.youtube.com/',
  'https://www.yandex.com/',
  'https://www.baidu.com/',
  'https://www.wikipedia.org/'
];

// regex for matching language codes:
export const acceptLanguages = [
  'en-US,en;q=0.9, tr;q=0.8, de;q=0.7, es;q=0.6, *;q=0.5',
  'en-US,en;q=0.9',
  'en-US,en;q=0.9, it;q=0.8',
  'en-US,en;q=0.9, ru;q=0.8, de;q=0.7',
  'en-US,en;q=0.9, tr;q=0.8, de;q=0.7, es;q=0.6'
];

export const acceptEncodings = [
  'gzip, deflate, br;q=1.0, identity;q=0.5, *;q=0.25',
  'gzip, deflate, br',
  'gzip, deflate, sdch',
  'gzip, deflate, sdch, br',
  'gzip, deflate, sdch, br;q=1.0, *;q=0.8',
  'gzip, deflate, sdch, br;q=1.0, *;q=0.7',
  'gzip'
];

export const acceptMimes = [
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/png,image/webp,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/png,image/webp,*/*',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/*'
];

/**
 * Returns a random item from the given list.
 *
 * @param list - The list of items to pick from.
 * @returns A uniformly chosen item of `list`.
 *
 * @example
 * ```ts
 * randomItem(['a', 'b', 'c']); // → 'b'
 * ```
 */
export function randomItem<T>(list: readonly T[]): T {
  // randomInt's upper bound is exclusive
  return list[randomInt(list.length)] as T;
}

/**
 * Returns a random "User-Agent" header value for emulating a browser.
 *
 * @returns One of the built-in user agent strings.
 */
export function getRandomUserAgent(): string {
  return randomItem(userAgents);
}

/**
 * Returns a random "Accept-Language" header value for emulating a browser.
 *
 * @returns One of the built-in language lists.
 */
export function getRandomAcceptLanguage(): string {
  return randomItem(acceptLanguages);
}

/**
 * Returns a random "Accept-Encoding" header value for emulating a browser.
 *
 * @returns One of the built-in encoding lists.
 */
export function getRandomAcceptEncoding(): string {
  return randomItem(acceptEncodings);
}

/**
 * Returns a random "Accept" (MIME) header value for emulating a browser.
 *
 * @returns One of the built-in MIME lists.
 */
export function getRandomAccept(): string {
  return randomItem(acceptMimes);
}

function getHeaderValue(
  list: readonly string[],
  inclusion?: HeaderInc | 'any',
  anyValue?: string
): string | undefined {
  if (!inclusion || inclusion === 'default') return list[0];
  if (inclusion === 'random') return randomItem(list);
  return inclusion === 'any' ? anyValue : undefined;
}

/**
 * Returns a set of request headers for emulating a browser and avoiding
 * getting blocked. Headers that resolve to nothing (e.g. `'none'`) are left out.
 *
 * @param opts - Request header options.
 * @returns The generated request headers.
 *
 * @example
 * ```ts
 * getReqHeaders({ ua: 'random', dnt: false, keepAlive: true });
 * ```
 */
export function getReqHeaders(opts: ReqHeaderOptions = {}): OutgoingHttpHeaders {
  const noCache = opts.noCache !== false;
  const headers: Record<string, string | undefined> = {
    'Accept-Language': getHeaderValue(acceptLanguages, opts.language, '*'),
    'Accept-Encoding': getHeaderValue(acceptEncodings, opts.encoding, '*'),
    Accept: getHeaderValue(acceptMimes, opts.mime, '*/*'),
    'User-Agent': getHeaderValue(userAgents, opts.ua),
    Referer: getHeaderValue(referers, opts.referer),
    'Upgrade-Insecure-Requests': opts.secure === false ? undefined : '1',
    DNT: opts.dnt === false ? undefined : '1',
    Connection: opts.keepAlive === undefined ? undefined : opts.keepAlive ? 'keep-alive' : 'close',
    'Cache-Control': noCache ? 'no-cache, no-store, must-revalidate, max-age=0' : undefined,
    Pragma: noCache ? 'no-cache' : undefined,
    Expires: noCache ? '0' : undefined
  };
  // leave out the headers that resolved to nothing
  return Object.fromEntries(Object.entries(headers).filter(([, value]) => value));
}

/** The "Accept" value sent when the `mime` option is not set. */
export const DEFAULT_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,text/*';

/**
 * Builds the headers that webstrip sends. When `reqOptions` is omitted, it
 * picks a random user agent and keeps the connection alive. Unless the
 * `encoding` or `mime` option is set, it asks for an uncompressed (identity)
 * text response.
 *
 * @param reqOptions - Request header options.
 * @returns The request headers to send.
 */
export function buildReqHeaders(reqOptions?: ReqHeaderOptions): OutgoingHttpHeaders {
  const opts = reqOptions ?? { ua: 'random', keepAlive: true };
  const headers = getReqHeaders(opts);
  if (!opts.encoding) headers['Accept-Encoding'] = 'identity';
  if (!opts.mime) headers.Accept = DEFAULT_ACCEPT;
  return headers;
}
