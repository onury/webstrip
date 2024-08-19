// own modules
import { WebstripOptions } from '../src/index.js';
import { DEFAULT_REDIRECTS, ERR_NO_RESPONSE, ERR_NOT_FOUND, ERR_REDIRECT, webstrip } from '../src/webstrip.js';

describe('webstrip', () => {

  const getMaxRedirects = (followRedirects?: boolean | number): number => {
    return typeof followRedirects === 'number'
      && followRedirects >= 0
      ? followRedirects
      : followRedirects === false ? 0 : DEFAULT_REDIRECTS;
  };

  const testFollowRedirects = async (
    useNav: boolean,
    followRedirects?: WebstripOptions['followRedirects'],
    redirectError?: WebstripOptions['redirectError']
  ): Promise<void> => {
    const url = 'https://google.com';
    const maxRedirects = getMaxRedirects(followRedirects);
    const noFollow = maxRedirects === 0;
    const o: WebstripOptions = useNav ? { waitUntil: 'load' } : {};
    const opts: WebstripOptions = { ...o, followRedirects, redirectError };
    // console.info(opts);

    if (noFollow && redirectError !== false) {
      expect(webstrip(url, opts)).rejects.toThrow(ERR_REDIRECT);
      return;
    }
    const result = await webstrip(url, opts);
    // console.info(result);

    expect(result.statusCode).toBe(noFollow ? 301 : 200);
    expect(result.redirectCount).toBeLessThanOrEqual(maxRedirects);
    const lenCheck = noFollow ? result.data.length < 500 : result.data.length >= 1_000;
    expect(lenCheck).toBe(true);
    expect(result.headers.server).toBe('gws');
    if (result.statusCode === 200) {
      expect(result.data.toLowerCase().startsWith('<!doctype html>')).toBe(true);
    }
  };

  test('followRedirects', async () => {
    await Promise.all([
      testFollowRedirects(false),
      testFollowRedirects(false, true),
      testFollowRedirects(false, 3),
      testFollowRedirects(true, 5),

      testFollowRedirects(false, false),
      testFollowRedirects(true, false),
      testFollowRedirects(true, 2, false),
      testFollowRedirects(true, false, false)
    ]);
  }, 30_000);

  test('waitUntil = networkidle', async () => {
    const url = 'https://google.com';

    const result1 = await webstrip(url, { waitUntil: 'networkidle' });
    expect(result1.statusCode).toBe(200);

    const result2 = await webstrip(url);
    expect(result2.statusCode).toBe(200);

    expect(result1.data.length).toBeGreaterThan(result2.data.length);
  }, 15_000);

  test('onPageLoad()', async () => {
    const result = await webstrip('https://amazon.com', {
      onPageLoaded: async evaluate => {
        const title = await evaluate('document.title') as string;
        expect((title || '').length).toBeGreaterThan(0);
      }
    });
    expect(result.statusCode).toBe(200);
  }, 15_000);

  test('navigate, onPageClosed()', async () => {
    let counter = 0;
    const result = await webstrip('https://www.google.com', {
      navigate: 5,
      onPageLoaded: async evaluate => {
        await evaluate('document.body.innerHTML = "<h1>Close window to continue...</h1>"');
      },
      onPageClosed: () => {
        counter += 1;
      }
    });
    expect(result.statusCode).toBe(200);
    expect(counter).toBe(1);
  }, 60_000);

  test('no response / not found', async () => {
    const blank = 'about:blank';
    const notFound = 'https://no-website.here';

    // browser navigation
    expect(webstrip(blank, { waitUntil: 'networkidle' })).rejects.toThrow(ERR_NO_RESPONSE + blank);
    expect(webstrip(notFound, { waitUntil: 'domcontentloaded' })).rejects.toThrow(ERR_NOT_FOUND + notFound);
    // http request
    expect(webstrip(blank)).rejects.toThrow(ERR_NO_RESPONSE + blank); // Protocol "about:" not supported. Expected "https:
    expect(webstrip(notFound)).rejects.toThrow(ERR_NOT_FOUND + notFound);
  });

});
