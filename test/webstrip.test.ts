// dep modules
import puppeteer, { type Browser, Page } from 'puppeteer';

// own modules
import {
  DEFAULT_REDIRECTS,
  ERR_NO_RESPONSE,
  ERR_NO_URL,
  ERR_NOT_FOUND,
  ERR_REDIRECT,
  webstrip
} from '../src/index.js';
import { DEFAULT_ACCEPT, userAgents } from '../src/utils/headers.js';
import { closedPortUrl, PAGE, RENDERED, startServer, type TestServer } from './fixtures/server.js';

const NOT_FOUND_URL = 'http://webstrip-test.invalid/';

let server: TestServer;
let base: string;

beforeAll(async () => {
  server = await startServer();
  base = server.url;
});

afterAll(async () => {
  await server.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Spies on puppeteer.launch: always launches headless (a visible window cannot
 * open in CI) and records the launched browsers, so a test can close the page
 * the way a user would.
 */
function spyLaunch(): { spy: ReturnType<typeof vi.spyOn>; browsers: Browser[] } {
  const launch = puppeteer.launch.bind(puppeteer);
  const browsers: Browser[] = [];
  const spy = vi.spyOn(puppeteer, 'launch').mockImplementation(async (opts) => {
    const browser = await launch({ ...opts, headless: true });
    browsers.push(browser);
    return browser;
  });
  return { spy, browsers };
}

describe('webstrip()', () => {
  test('throws when no URL is given', async () => {
    await expect(webstrip('')).rejects.toThrow(ERR_NO_URL);
    await expect((webstrip as (u?: string) => Promise<unknown>)()).rejects.toThrow(ERR_NO_URL);
  });

  test('exports the default redirect limit and the error messages', () => {
    expect(DEFAULT_REDIRECTS).toBe(10);
    expect(ERR_NO_URL).toBe('No URL is provided!');
    expect(ERR_REDIRECT).toBe('Too many redirects!');
    expect(ERR_NO_RESPONSE).toBe('No response from ');
    expect(ERR_NOT_FOUND).toBe('Address not found at ');
  });
});

describe('HTTP mode', () => {
  test('strips a page with a plain request', async () => {
    const spy = vi.spyOn(puppeteer, 'launch');
    const result = await webstrip(`${base}/page`);
    expect(spy).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(PAGE);
    expect(result.data).not.toContain(RENDERED);
    expect(result.url).toBe(`${base}/page`);
    expect(result.redirectCount).toBe(0);
    expect(result.headers['x-a']).toBe('1');
  });

  test('accepts null options', async () => {
    const result = await webstrip(`${base}/page`, null as unknown as undefined);
    expect(result.statusCode).toBe(200);
  });

  test('sends the generated headers and reports them', async () => {
    const result = await webstrip(`${base}/headers`);
    const sent = JSON.parse(result.data);
    expect(userAgents).toContain(sent['user-agent']);
    expect(sent['user-agent']).toBe(result.reqHeaders['User-Agent']);
    expect(sent.accept).toBe(DEFAULT_ACCEPT);
    expect(sent['accept-encoding']).toBe('identity');
    expect(sent.connection).toBe('keep-alive');
  });

  test('uses the given header options', async () => {
    const result = await webstrip(`${base}/headers`, {
      headerOptions: { ua: 'none', dnt: false, keepAlive: false }
    });
    const sent = JSON.parse(result.data);
    expect(sent).not.toHaveProperty('user-agent');
    expect(sent).not.toHaveProperty('dnt');
    expect(sent.connection).toBe('close');
  });

  test('decodes utf-8 and compressed bodies', async () => {
    expect((await webstrip(`${base}/utf8`)).data).toBe('<p>çğıöşü — 日本語 — 🔆</p>');
    for (const enc of ['gzip', 'x-gzip', 'deflate', 'br']) {
      const result = await webstrip(`${base}/encoded/${enc}`, {
        headerOptions: { encoding: 'any' }
      });
      expect(result.data).toBe('<p>decoded</p>');
    }
  });

  test('rejects a body that cannot be decoded', async () => {
    await expect(webstrip(`${base}/encoded/broken`)).rejects.toThrow(/header|check/i);
  });

  test('follows relative and absolute redirects, with every redirect code', async () => {
    for (const code of [301, 302, 303, 307, 308]) {
      const result = await webstrip(`${base}/r/3?code=${code}`);
      expect(result.statusCode).toBe(200);
      expect(result.redirectCount).toBe(3);
      expect(result.url).toBe(`${base}/r/0?code=${code}`);
      expect(result.data).toBe(PAGE);
    }
    const abs = await webstrip(`${base}/r/2?abs=1`);
    expect(abs.redirectCount).toBe(2);
    expect(abs.url).toBe(`${base}/r/0?abs=1`);
  });

  test('sends the same headers on every redirect hop', async () => {
    const result = await webstrip(`${base}/r/1?to=headers`);
    expect(result.redirectCount).toBe(1);
    const echoed = await webstrip(`${base}/headers`, { headerOptions: { ua: 'random' } });
    expect(userAgents).toContain(echoed.reqHeaders['User-Agent']);
  });

  test('stops at the followRedirects limit', async () => {
    await expect(webstrip(`${base}/r/3`, { followRedirects: 2 })).rejects.toThrow(ERR_REDIRECT);
    await expect(webstrip(`${base}/r/1`, { followRedirects: false })).rejects.toThrow(ERR_REDIRECT);
    await expect(webstrip(`${base}/r/1`, { followRedirects: 0 })).rejects.toThrow(ERR_REDIRECT);
    expect((await webstrip(`${base}/r/2`, { followRedirects: 2 })).redirectCount).toBe(2);
  });

  test('follows up to 10 redirects by default, and with followRedirects: true', async () => {
    expect((await webstrip(`${base}/r/10`)).redirectCount).toBe(10);
    expect((await webstrip(`${base}/r/10`, { followRedirects: true })).redirectCount).toBe(10);
    expect((await webstrip(`${base}/r/10`, { followRedirects: -1 })).redirectCount).toBe(10);
    await expect(webstrip(`${base}/r/11`)).rejects.toThrow(ERR_REDIRECT);
  });

  test('returns the last redirect response when redirectError is false', async () => {
    const result = await webstrip(`${base}/r/3?code=307`, {
      followRedirects: 1,
      redirectError: false
    });
    expect(result.statusCode).toBe(307);
    expect(result.redirectCount).toBe(1);
    expect(result.data).toBe('<p>redirect 2</p>');
    expect(result.headers.location).toBe('/r/1?code=307');
  });

  test('returns a redirect status with no Location as it is', async () => {
    const result = await webstrip(`${base}/no-location`, { followRedirects: 0 });
    expect(result.statusCode).toBe(301);
    expect(result.data).toBe('<p>moved nowhere</p>');
  });

  test('maps unsupported protocols and invalid URLs to ERR_NO_RESPONSE', async () => {
    await expect(webstrip('about:blank')).rejects.toThrow(`${ERR_NO_RESPONSE}about:blank`);
    await expect(webstrip('not a url')).rejects.toThrow(`${ERR_NO_RESPONSE}not a url`);
  });

  test('maps an unresolvable host to ERR_NOT_FOUND', async () => {
    await expect(webstrip(NOT_FOUND_URL)).rejects.toThrow(ERR_NOT_FOUND + NOT_FOUND_URL);
    await expect(webstrip('https://webstrip-test.invalid/')).rejects.toThrow(ERR_NOT_FOUND);
  });

  test('passes other errors through', async () => {
    const refused = await closedPortUrl();
    await expect(webstrip(refused)).rejects.toMatchObject({ code: 'ECONNREFUSED' });
    await expect(webstrip(`${base}/reset`)).rejects.toMatchObject({
      message: expect.stringMatching(/aborted|ECONNRESET|socket hang up/i)
    });
  });
});

describe('browser mode', () => {
  test('uses a headless browser when waitUntil is set', async () => {
    const { spy } = spyLaunch();
    const result = await webstrip(`${base}/page`, { waitUntil: 'load' });
    expect(spy).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox'],
      defaultViewport: null
    });
    expect(result.statusCode).toBe(200);
    expect(result.data).toContain(RENDERED);
    expect(result.url).toBe(`${base}/page`);
    expect(result.redirectCount).toBe(0);
    expect(result.headers['x-longer-header']).toBe('2');
  });

  test('sends the generated headers', async () => {
    const result = await webstrip(`${base}/headers`, {
      waitUntil: 'domcontentloaded',
      headerOptions: { ua: 'default', referer: 'none' }
    });
    const sent = JSON.parse(result.data.replace(/^.*?(\{.*\}).*$/s, '$1'));
    expect(sent['user-agent']).toBe(userAgents[0]);
    expect(sent['user-agent']).toBe(result.reqHeaders['User-Agent']);
    expect(sent).not.toHaveProperty('referer');
  });

  test('passes the Referer to the navigation, not as an extra header', async () => {
    const goto = vi.spyOn(Page.prototype, 'goto');
    const result = await webstrip(`${base}/headers`, {
      waitUntil: 'load',
      headerOptions: { referer: 'default' }
    });
    expect(goto).toHaveBeenCalledWith(`${base}/headers`, {
      waitUntil: 'load',
      referer: result.reqHeaders.Referer
    });
    expect(result.reqHeaders.Referer).toBe('https://www.google.com/');
    expect(result.statusCode).toBe(200);
  });

  test('waitUntil: networkidle waits for content fetched after load', async () => {
    const idle = await webstrip(`${base}/late`, { waitUntil: 'networkidle' });
    expect(idle.data).toContain('<p id="late">late content</p>');
    const loaded = await webstrip(`${base}/late`, { waitUntil: 'load' });
    expect(loaded.data).not.toContain('<p id="late">');
  });

  test('onPageLoaded waits for load, unless waitUntil says otherwise', async () => {
    const states: unknown[] = [];
    const onPageLoaded = async (evaluate: (s: string) => Promise<unknown>): Promise<void> => {
      states.push(await evaluate('document.readyState'));
    };
    await webstrip(`${base}/slow`, { onPageLoaded });
    await webstrip(`${base}/slow`, { waitUntil: 'domcontentloaded', onPageLoaded });
    expect(states).toEqual(['complete', 'interactive']);
  });

  test('onPageLoaded can alter the DOM before the content is read', async () => {
    const result = await webstrip(`${base}/page`, {
      onPageLoaded: async (evaluate) => {
        expect(await evaluate('document.title')).toBe('Test Page');
        await evaluate('document.querySelector("h1").textContent = "altered"');
      }
    });
    expect(result.data).toContain('<h1>altered</h1>');
  });

  test('onPageClosed alone uses the browser, but is only called when navigating', async () => {
    const onPageClosed = vi.fn();
    const result = await webstrip(`${base}/page`, { onPageClosed });
    expect(result.data).toContain(RENDERED);
    expect(onPageClosed).not.toHaveBeenCalled();
  });

  test('closes the browser when onPageLoaded throws', async () => {
    const { browsers } = spyLaunch();
    await expect(
      webstrip(`${base}/page`, {
        onPageLoaded: () => {
          throw new Error('boom');
        }
      })
    ).rejects.toThrow('boom');
    expect(browsers[0]?.connected).toBe(false);
  });

  test('a failing browser close does not fail the strip', async () => {
    const { browsers } = spyLaunch();
    const result = await webstrip(`${base}/page`, {
      onPageLoaded: () => {
        const browser = browsers[0] as Browser;
        const close = browser.close.bind(browser);
        vi.spyOn(browser, 'close').mockImplementation(async () => {
          await close();
          throw new Error('already closed');
        });
      }
    });
    expect(result.statusCode).toBe(200);
    expect(browsers[0]?.connected).toBe(false);
  });

  test('follows redirects without a limit by default', async () => {
    const result = await webstrip(`${base}/r/12`, { waitUntil: 'load' });
    expect(result.redirectCount).toBe(12);
    expect(result.url).toBe(`${base}/r/0`);
    const all = await webstrip(`${base}/r/12`, { waitUntil: 'load', followRedirects: true });
    expect(all.redirectCount).toBe(12);
  });

  test('stops at the followRedirects limit', async () => {
    const opts = { waitUntil: 'load' } as const;
    const ok = await webstrip(`${base}/r/2`, { ...opts, followRedirects: 2 });
    expect(ok.redirectCount).toBe(2);
    expect(ok.data).toContain(RENDERED);
    await expect(webstrip(`${base}/r/3`, { ...opts, followRedirects: 2 })).rejects.toThrow(
      ERR_REDIRECT
    );
    await expect(webstrip(`${base}/r/1`, { ...opts, followRedirects: false })).rejects.toThrow(
      ERR_REDIRECT
    );
  });

  test('lets sub-resources through while limiting redirects', async () => {
    const result = await webstrip(`${base}/image`, {
      waitUntil: 'networkidle',
      followRedirects: 1
    });
    expect(result.statusCode).toBe(200);
    expect(result.data).toContain('<img src="/img.png">');
  });

  test('re-fetches the last redirect over HTTP when redirectError is false', async () => {
    const result = await webstrip(`${base}/r/3`, {
      waitUntil: 'load',
      followRedirects: 1,
      redirectError: false
    });
    expect(result.statusCode).toBe(302);
    expect(result.redirectCount).toBe(1);
    expect(result.data).toBe('<p>redirect 2</p>');
  });

  test('maps navigation errors', async () => {
    const opts = { waitUntil: 'load' } as const;
    await expect(webstrip('about:blank', opts)).rejects.toThrow(`${ERR_NO_RESPONSE}about:blank`);
    await expect(webstrip(NOT_FOUND_URL, opts)).rejects.toThrow(ERR_NOT_FOUND + NOT_FOUND_URL);
    const refused = await closedPortUrl();
    await expect(webstrip(refused, opts)).rejects.toThrow(/ERR_CONNECTION_REFUSED/);
  });
});

describe('navigate', () => {
  test('opens a visible browser and auto-closes it after the timeout', async () => {
    const { spy } = spyLaunch();
    const onPageClosed = vi.fn();
    const start = Date.now();
    const result = await webstrip(`${base}/page`, { navigate: 1, onPageClosed });
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ headless: false }));
    expect(result.data).toContain(RENDERED);
    expect(onPageClosed).toHaveBeenCalledOnce();
  });

  test('waits for the page to be closed', async () => {
    const { browsers } = spyLaunch();
    const onPageClosed = vi.fn();
    const result = await webstrip(`${base}/page`, {
      navigate: true,
      onPageLoaded: () => {
        // close the page the way a user would, once the result is being awaited
        setTimeout(async () => {
          const [page] = await browsers[0]!.pages();
          await page!.close();
        }, 100);
      },
      onPageClosed
    });
    expect(result.statusCode).toBe(200);
    expect(onPageClosed).toHaveBeenCalledOnce();
  });

  test('returns when the browser goes away without closing the page', async () => {
    const { browsers } = spyLaunch();
    const onPageClosed = vi.fn();
    try {
      const result = await webstrip(`${base}/page`, {
        navigate: true,
        onPageLoaded: () => {
          // e.g. the user quits the browser, or it crashes
          setTimeout(() => browsers[0]?.disconnect(), 100);
        },
        onPageClosed
      });
      expect(result.statusCode).toBe(200);
      expect(onPageClosed).toHaveBeenCalledOnce();
    } finally {
      browsers[0]?.process()?.kill();
    }
  });

  test('cancels the auto-close timer when the page is closed first', async () => {
    const { browsers } = spyLaunch();
    const closes: number[] = [];
    await webstrip(`${base}/page`, {
      navigate: 1,
      onPageLoaded: () => {
        const browser = browsers[0]!;
        const close = browser.close.bind(browser);
        vi.spyOn(browser, 'close').mockImplementation(() => {
          closes.push(Date.now());
          return close();
        });
        setTimeout(async () => {
          const [page] = await browser.pages();
          await page!.close();
        }, 100);
      }
    });
    // the timer would have fired 1s after load
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(closes).toHaveLength(1);
  });

  test('0 or a negative number does not navigate', async () => {
    const spy = vi.spyOn(puppeteer, 'launch');
    await webstrip(`${base}/page`, { navigate: 0 });
    await webstrip(`${base}/page`, { navigate: -1 });
    await webstrip(`${base}/page`, { navigate: false });
    expect(spy).not.toHaveBeenCalled();
  });
});
