// core modules
import https, { RequestOptions } from 'node:https';

// dep modules
import puppeteer, { HTTPResponse } from 'puppeteer';

// own modules
import { ReqOptions } from './types/ReqOptions.js';
import { WebstripOptions } from './types/WebstripOptions.js';
import { WebstripResult } from './types/WebstripResult.js';
import { REDIRECT_CODES, buildReqHeaders } from './httpUtils.js';

export const ERR_REDIRECT = 'Too many redirects!';
export const ERR_NO_RESPONSE = 'No response from ';
export const ERR_NOT_FOUND = 'Address not found at ';
export const DEFAULT_REDIRECTS = 10;

/** Gets the maximum number of redirects to follow. */
function getMaxRedirects(followRedirects?: boolean | number): number {
  return typeof followRedirects === 'number'
    && followRedirects >= 0
    ? followRedirects
    : followRedirects === false ? 0 : DEFAULT_REDIRECTS;
}

function getError(e: unknown, url: string): Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { code, message } = e as any;
  const msg = code || message;

  if (/ERR_INVALID_(URL|PROTOCOL)/i.test(msg)) {
    return new Error(ERR_NO_RESPONSE + url);
  }
  if (/ENOTFOUND|ERR_NAME_NOT_RESOLVE/i.test(msg)) {
    return new Error(ERR_NOT_FOUND + url);
  }

  return e instanceof Error ? e /* v8 ignore next */ : new Error(String(e));
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getNavInfo(navigate?: WebstripOptions['navigate']) {
  const time = typeof navigate === 'number' && navigate > 0 ? navigate * 1_000 : undefined;
  return {
    time,
    enabled: navigate === true || Boolean(time)
  };
}

/**
 * Scrapes the specified URL and returns the result.
 * @param url - The URL to strip.
 * @param [reqOptions] - Optional request header options.
 * @returns - A promise that resolves to the webstrip result.
 */
export async function webstrip(
  url: string,
  options?: WebstripOptions
): Promise<WebstripResult> {
  const nav = getNavInfo(options?.navigate);
  const useBrowser = nav.enabled
    || Boolean(options?.waitUntil)
    || typeof options?.onPageLoaded === 'function'
    || typeof options?.onPageClosed === 'function';

  return useBrowser
    ? webstripNav(url, options)
    : webstripReq(url, options);
}

/**
 * Strips the specified URL and returns the result.
 * @param url - The URL to strip.
 * @param [reqOptions] - Optional request header options.
 * @returns - A promise that resolves to the webstrip result.
 */
async function webstripReq(
  url: string,
  reqOptions?: ReqOptions
): Promise<WebstripResult> {
  const redirectCount = 0;
  return _webstripReq(url, reqOptions, redirectCount);
}

async function _webstripReq(
  url: string,
  reqOptions?: ReqOptions,
  redirectCount: number = 0
): Promise<WebstripResult> {

  return new Promise((resolve, reject) => {
    try {
      const options: RequestOptions = {
        headers: buildReqHeaders(reqOptions?.headerOptions)
      };

      https.get(url, options, response => {
        let data = '';
        response.setEncoding('utf8');

        response.on('data', (chunk: string) => {
          data += chunk;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.on('end', (): any => {
          const { statusCode = 0, headers, url: resUrl } = response;

          const { followRedirects } = reqOptions ?? {};
          const maxRedirects = getMaxRedirects(followRedirects);

          if (headers.location && REDIRECT_CODES.includes(statusCode)) {
            if (redirectCount < maxRedirects) {
              redirectCount += 1;
              return _webstripReq(headers.location, reqOptions, redirectCount)
                .then(resolve)
                .catch(reject);
            }

            if (reqOptions?.redirectError !== false) {
              return reject(new Error(ERR_REDIRECT));
            }
            // else continue with the last response
          }

          resolve({
            statusCode,
            headers,
            data,
            url: resUrl || url,
            redirectCount
          });

        });
      }).on('error', err => {
        reject(getError(err, url));
      });

    }
    catch (e) {
      reject(getError(e, url));
    }
  });
}

async function waitForTargetDestroyed(browser: puppeteer.Browser, cb?: () => void): Promise<void> {
  return new Promise<void>(resolve => {
    browser.once('targetdestroyed', () => {
      if (typeof cb === 'function') cb();
      resolve();
    });
  });
}

/**
 * Navigates to a URL and retrieves the content of the page using Puppeteer.
 * @param url - The URL to navigate to.
 * @param [options] - Optional configuration options.
 * @returns A promise that resolves to a WebstripResult object containing the
 * status code, headers, data, and URL of the page.
 * @throws If there is an error during navigation or if no response is received
 * from the URL.
 */
async function webstripNav(
  url: string,
  options?: WebstripOptions
): Promise<WebstripResult> {

  const nav = getNavInfo(options?.navigate);
  const browser = await puppeteer.launch({
    headless: !nav.enabled,
    args: ['--no-sandbox'],
    defaultViewport: null
  });

  const [page] = await browser.pages();

  const cleanUp = async (force?: boolean): Promise<void> => {
    try {
      // page.removeAllListeners();
      if (force || !nav.enabled) {
        return browser.close();
      }
      /* v8 ignore next */
    } catch {}
  };

  await page.setExtraHTTPHeaders(
    buildReqHeaders(options?.headerOptions) as Record<string, string>
  );

  let redirectCount = 0;
  let response: HTTPResponse | null | undefined;
  const { followRedirects } = options /* v8 ignore next */ ?? {};
  const unlimitedRedirects = followRedirects === undefined || followRedirects === true;

  if (!unlimitedRedirects) {
    const maxRedirects = getMaxRedirects(followRedirects);
    await page.setRequestInterception(true);

    page.on('request', async interceptedReq => {
      // resolve if already handled
      /* v8 ignore next */
      if (interceptedReq.isInterceptResolutionHandled()) return;

      if (!interceptedReq.isNavigationRequest()) {
        return interceptedReq.continue();
      }

      const rcLen = interceptedReq.redirectChain().length;
      if (rcLen <= maxRedirects) {
        redirectCount = rcLen;
        return interceptedReq.continue();
      }

      return interceptedReq.abort('aborted');
    });
  }

  // for when to use networkidle0 or networkidle2,
  // see https://github.com/puppeteer/puppeteer/issues/1552#issuecomment-350954419
  const waitUntil = options?.waitUntil === 'networkidle'
    ? 'networkidle0'
    : options?.onPageLoaded
      ? 'load'
      : options?.waitUntil;

  // any call such as page.goto() will throw after req.abort() is set.
  // so we set a more meaningful error here.
  try {
    response = await page.goto(url, { waitUntil });
  } catch (e) {
    cleanUp(true); // no await here

    const err = getError(e, url);

    /* v8 ignore next */
    if (!/ERR_ABORTED/i.test(err.message)) throw err;

    if (options?.redirectError !== false) {
      throw new Error(ERR_REDIRECT);
    }
    // response body is unavailable if the request gets redirected and aborted
    // (due to followRedirects option) so we'll attempt to re-fetch the response
    // via HTTP when `redirectError` option is disabled.
    return webstripReq(url, options);
  }

  if (!response) {
    cleanUp(true);
    throw new Error(ERR_NO_RESPONSE + url);
  }

  if (options?.onPageLoaded) {
    await options.onPageLoaded(page.evaluate.bind(page));
  }

  const content = await page.content();

  if (nav.enabled) {
    // Waiting for nav.time ms to auto-close browser...
    if (nav.time) setTimeout(cleanUp, nav.time);
    // also waiting for browser to be closed...
    await waitForTargetDestroyed(browser, options?.onPageClosed);
  }
  // not already called?
  if (!nav.time) cleanUp(); // no await here

  return {
    statusCode: response.status(),
    headers: response.headers(),
    data: content,
    url: response.url(),
    redirectCount
  };
}
