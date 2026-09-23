// core modules
import http from 'node:http';
import https from 'node:https';

// dep modules
import type { Browser, HTTPResponse, Page } from 'puppeteer';

// own modules
import type { ReqOptions } from './types/ReqOptions.js';
import type { WebstripOptions } from './types/WebstripOptions.js';
import type { WebstripResult } from './types/WebstripResult.js';
import { buildReqHeaders, decodeBody, REDIRECT_CODES } from './utils/index.js';

/** Error message thrown when no URL is given. */
export const ERR_NO_URL = 'No URL is provided!';
/** Error message thrown when the redirect limit is reached and `redirectError` is on. */
export const ERR_REDIRECT = 'Too many redirects!';
/** Error message prefix (followed by the URL) thrown when no response is received. */
export const ERR_NO_RESPONSE = 'No response from ';
/** Error message prefix (followed by the URL) thrown when the host cannot be resolved. */
export const ERR_NOT_FOUND = 'Address not found at ';
/** Maximum number of redirects followed by default. */
export const DEFAULT_REDIRECTS = 10;

/** Gets the maximum number of redirects to follow. */
function getMaxRedirects(followRedirects?: boolean | number): number {
  if (typeof followRedirects === 'number' && followRedirects >= 0) return followRedirects;
  return followRedirects === false ? 0 : DEFAULT_REDIRECTS;
}

/** Maps low-level request/navigation errors to webstrip's error messages. */
function getError(e: unknown, url: string): Error {
  const err = e as NodeJS.ErrnoException;
  const msg = `${err.code} ${err.message}`;
  if (/ERR_INVALID_(URL|PROTOCOL)/i.test(msg)) return new Error(ERR_NO_RESPONSE + url);
  if (/ENOTFOUND|ERR_NAME_NOT_RESOLVED/i.test(msg)) return new Error(ERR_NOT_FOUND + url);
  return err;
}

function getNavInfo(navigate?: WebstripOptions['navigate']): { time: number; enabled: boolean } {
  const time = typeof navigate === 'number' && navigate > 0 ? navigate * 1_000 : 0;
  return { time, enabled: navigate === true || time > 0 };
}

/**
 * Strips the given URL and returns its content along with the response
 * details. A plain HTTP(S) request is used by default. A Chromium browser
 * (via Puppeteer) is used instead when `waitUntil`, `navigate`,
 * `onPageLoaded` or `onPageClosed` is set.
 *
 * @param url - The URL to strip.
 * @param options - Request, header and browser options.
 * @returns A promise that resolves to the webstrip result.
 * @throws If no URL is given, the host cannot be resolved, no response is
 * received, or the redirect limit is reached while `redirectError` is on.
 *
 * @example
 * ```ts
 * import { webstrip } from 'webstrip';
 *
 * const { statusCode, data } = await webstrip('https://example.com');
 * const rendered = await webstrip('https://example.com', { waitUntil: 'networkidle' });
 * ```
 */
export async function webstrip(url: string, options?: WebstripOptions): Promise<WebstripResult> {
  if (!url) throw new Error(ERR_NO_URL);
  const opts = options ?? {};
  const useBrowser =
    getNavInfo(opts.navigate).enabled ||
    Boolean(opts.waitUntil) ||
    typeof opts.onPageLoaded === 'function' ||
    typeof opts.onPageClosed === 'function';
  return useBrowser ? stripWithBrowser(url, opts) : stripWithRequest(url, opts);
}

/** Strips the given URL with a plain HTTP(S) request, following redirects. */
function stripWithRequest(url: string, options: ReqOptions): Promise<WebstripResult> {
  // generate the headers once so that every hop sends (and the result reports) the same set
  const reqHeaders = buildReqHeaders(options.headerOptions);
  return request(url, options, reqHeaders, 0);
}

function request(
  url: string,
  options: ReqOptions,
  reqHeaders: WebstripResult['reqHeaders'],
  redirectCount: number
): Promise<WebstripResult> {
  return new Promise((resolve, reject) => {
    const fail = (e: unknown): void => reject(getError(e, url));
    try {
      const client = new URL(url).protocol === 'http:' ? http : https;
      client
        .get(url, { headers: reqHeaders }, (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('error', fail);
          response.on('end', () => {
            const { statusCode = 0, headers } = response;
            if (headers.location && REDIRECT_CODES.includes(statusCode)) {
              if (redirectCount < getMaxRedirects(options.followRedirects)) {
                // Location may be relative to the current URL
                const next = new URL(headers.location, url).href;
                request(next, options, reqHeaders, redirectCount + 1).then(resolve, reject);
                return;
              }
              if (options.redirectError !== false) {
                reject(new Error(ERR_REDIRECT));
                return;
              }
              // else continue with the last response
            }
            try {
              const body = decodeBody(Buffer.concat(chunks), headers['content-encoding']);
              resolve({
                reqHeaders,
                statusCode,
                headers,
                data: body.toString('utf8'),
                url,
                redirectCount
              });
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', fail);
    } catch (e) {
      fail(e);
    }
  });
}

/**
 * Resolves when the page is closed (e.g. by the user) or the browser is
 * disconnected (e.g. by the auto-close timer).
 */
function waitForClose(browser: Browser, page: Page): Promise<void> {
  return new Promise<void>((resolve) => {
    page.once('close', () => resolve());
    browser.once('disconnected', () => resolve());
  });
}

/** Strips the given URL by navigating to it in a Chromium browser. */
async function stripWithBrowser(url: string, options: WebstripOptions): Promise<WebstripResult> {
  const nav = getNavInfo(options.navigate);
  // loaded lazily so that plain HTTP stripping never pays for Puppeteer
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: !nav.enabled,
    args: ['--no-sandbox'],
    defaultViewport: null
  });
  const close = (): Promise<void> => browser.close().catch(() => undefined);

  try {
    const [page] = (await browser.pages()) as [Page];
    const reqHeaders = buildReqHeaders(options.headerOptions);
    await page.setExtraHTTPHeaders(reqHeaders as Record<string, string>);

    const { followRedirects } = options;
    if (followRedirects !== undefined && followRedirects !== true) {
      const maxRedirects = getMaxRedirects(followRedirects);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (!req.isNavigationRequest()) return req.continue();
        return req.redirectChain().length > maxRedirects ? req.abort('aborted') : req.continue();
      });
    }

    // networkidle0 rather than networkidle2; see
    // https://github.com/puppeteer/puppeteer/issues/1552#issuecomment-350954419
    const waitUntil =
      options.waitUntil === 'networkidle'
        ? 'networkidle0'
        : (options.waitUntil ?? (options.onPageLoaded ? 'load' : undefined));

    let response: HTTPResponse | null;
    try {
      response = await page.goto(url, { waitUntil });
    } catch (e) {
      const err = getError(e, url);
      // any other failure is thrown as is
      if (!/ERR_ABORTED/i.test(err.message)) throw err;
      // the navigation was aborted by the redirect limit above
      if (options.redirectError !== false) throw new Error(ERR_REDIRECT);
      // the body of an aborted redirect is unavailable to the browser, so
      // re-fetch the last response over HTTP
      return await stripWithRequest(url, options);
    }

    if (!response) throw new Error(ERR_NO_RESPONSE + url);

    if (options.onPageLoaded) await options.onPageLoaded(page.evaluate.bind(page));
    const data = await page.content();

    if (nav.enabled) {
      const timer = nav.time ? setTimeout(close, nav.time) : undefined;
      await waitForClose(browser, page);
      clearTimeout(timer);
      options.onPageClosed?.();
    }

    return {
      reqHeaders,
      statusCode: response.status(),
      headers: response.headers(),
      data,
      url: response.url(),
      redirectCount: response.request().redirectChain().length
    };
  } finally {
    await close();
  }
}
