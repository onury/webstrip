/* eslint-disable max-len */

// core modules
import { OutgoingHttpHeaders } from 'node:http';
import { randomInt } from 'node:crypto';

// own modules
import { HeaderInc, ReqHeaderOptions } from './types/ReqHeaderOptions.js';

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
 * @param list - The list of items.
 */
export function randomItem<T>(list: T[]): T {
  return list[randomInt(0, list.length - 1)];
}

/**
 * Returns a random "User-Agent" header string for emulating a browser and
 * avoiding getting blocked.
 */
export function getRandomUserAgent(): string {
  return randomItem(userAgents);
}

/**
 * Returns a random "Accept-Language" header string for emulating a browser.
 */
export function getRandomAcceptLanguage(): string {
  return randomItem(acceptLanguages);
}

/**
 * Returns a random "Accept-Encoding" header string for emulating a browser.
 */
export function getRandomAcceptEncoding(): string {
  return randomItem(acceptEncodings);
}

/**
 * Returns a random "Accept" (MIME) header string for emulating a browser.
 */
export function getRandomAccept(): string {
  return randomItem(acceptMimes);
}

function getHeaderValue(list: string[], inclusion?: HeaderInc | 'any', anyValue?: string): string | undefined {
  if (!inclusion || inclusion === 'default') return list[0];
  if (inclusion === 'any' && anyValue) return anyValue;
  if (inclusion === 'random') return randomItem(list);
  return undefined;
}

/**
 * Returns a set of request headers for emulating a browser and avoiding
 * getting blocked.
 * @param [opts] - Request header options.
 */
export function getReqHeaders(opts: ReqHeaderOptions = {}): OutgoingHttpHeaders {
  let headers: OutgoingHttpHeaders = {
    'Accept-Language': getHeaderValue(acceptLanguages, opts.language, '*'),
    'Accept-Encoding': getHeaderValue(acceptEncodings, opts.encoding, '*'),
    'Accept': getHeaderValue(acceptMimes, opts.mime, '*/*'),
    'User-Agent': getHeaderValue(userAgents, opts.ua),
    'Referer': getHeaderValue(referers, opts.referer),
    'Upgrade-Insecure-Requests': opts.secure === false ? undefined : '1',
    'DNT': opts.dnt === false ? undefined : '1',
    'Connection': opts.keepAlive === true
      ? 'keep-alive'
      : opts.keepAlive === false
        ? 'close'
        : undefined
  };

  if (opts.noCache !== false) {
    headers = {
      ...headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  // remove undefined or empty headers
  Object.keys(headers).forEach(key => !headers[key] && delete headers[key]);
  return headers as Record<string, string>;
}

/**
 * Builds the request headers for HTTP requests.
 * @param [reqOptions] - Optional request header options.
 */
export function buildReqHeaders(reqOptions?: ReqHeaderOptions): OutgoingHttpHeaders {
  return {
    ...getReqHeaders(reqOptions ?? { ua: 'random', keepAlive: true }),
    'Accept-Encoding': 'identity',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/*'
  };
}
