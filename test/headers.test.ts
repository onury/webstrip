// own modules
import {
  acceptEncodings,
  acceptLanguages,
  acceptMimes,
  buildReqHeaders,
  DEFAULT_ACCEPT,
  getRandomAccept,
  getRandomAcceptEncoding,
  getRandomAcceptLanguage,
  getRandomUserAgent,
  getReqHeaders,
  REDIRECT_CODES,
  randomItem,
  referers,
  userAgents
} from '../src/utils/headers.js';

const NO_CACHE = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0'
};

describe('header lists', () => {
  test('every entry is a well-formed header value', () => {
    for (const ua of userAgents) expect(ua).toMatch(/^Mozilla\/5\.0 \(.+\) .+\/[\d.]+$/);
    for (const r of referers) expect(r).toMatch(/^https:\/\/[a-z.]+\/$/);
    for (const lang of acceptLanguages) {
      expect(lang).toMatch(/^((, ?)?([a-z]{2}(-[a-z]{2})?|\*)(;q=\d(\.\d+)?)?)+$/i);
    }
    for (const enc of acceptEncodings) {
      expect(enc).toMatch(/^((, ?)?(gzip|deflate|br|sdch|identity|\*)(;q=\d(\.\d+)?)?)+$/);
    }
    for (const mime of acceptMimes) {
      expect(mime).toMatch(/^text\/html,((, ?)?([a-z*]+\/[a-z+*]+)(;q=\d(\.\d+)?)?)+$/);
    }
    expect(REDIRECT_CODES).toEqual([301, 302, 303, 307, 308]);
    expect(DEFAULT_ACCEPT).toBe('text/html,application/xhtml+xml,application/xml;q=0.9,text/*');
  });

  test('the lists are not empty', () => {
    for (const list of [userAgents, referers, acceptLanguages, acceptEncodings, acceptMimes]) {
      expect(list.length).toBeGreaterThan(1);
    }
  });
});

describe('randomItem()', () => {
  test('reaches every item, including the last', () => {
    const items = ['a', 'b', 'c'];
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(randomItem(items));
    expect([...seen].sort()).toEqual(items);
  });

  test('works on a single-item list', () => {
    expect(randomItem(['only'])).toBe('only');
  });

  test('getRandom*() pick from their own list', () => {
    expect(userAgents).toContain(getRandomUserAgent());
    expect(acceptLanguages).toContain(getRandomAcceptLanguage());
    expect(acceptEncodings).toContain(getRandomAcceptEncoding());
    expect(acceptMimes).toContain(getRandomAccept());
  });
});

describe('getReqHeaders()', () => {
  test('defaults to the first value of each list', () => {
    const expected = {
      'Accept-Language': acceptLanguages[0],
      'Accept-Encoding': acceptEncodings[0],
      Accept: acceptMimes[0],
      'User-Agent': userAgents[0],
      Referer: referers[0],
      'Upgrade-Insecure-Requests': '1',
      DNT: '1',
      ...NO_CACHE
    };
    expect(getReqHeaders()).toStrictEqual(expected);
    expect(getReqHeaders({ language: 'default', ua: 'default' })).toStrictEqual(expected);
  });

  test("'none' leaves a header out and 'any' sends a wildcard", () => {
    const h = getReqHeaders({
      language: 'any',
      encoding: 'any',
      mime: 'any',
      ua: 'none',
      referer: 'none',
      noCache: false,
      secure: false,
      dnt: false
    });
    expect(h).toStrictEqual({ 'Accept-Language': '*', 'Accept-Encoding': '*', Accept: '*/*' });
  });

  test("'any' is ignored for headers with no wildcard", () => {
    const h = getReqHeaders({ ua: 'any' as 'none', referer: 'any' as 'none' });
    expect(h).not.toHaveProperty('User-Agent');
    expect(h).not.toHaveProperty('Referer');
  });

  test("'random' picks from the list", () => {
    const h = getReqHeaders({
      language: 'random',
      encoding: 'random',
      mime: 'random',
      ua: 'random',
      referer: 'random'
    });
    expect(acceptLanguages).toContain(h['Accept-Language']);
    expect(acceptEncodings).toContain(h['Accept-Encoding']);
    expect(acceptMimes).toContain(h.Accept);
    expect(userAgents).toContain(h['User-Agent']);
    expect(referers).toContain(h.Referer);
  });

  test('keepAlive sets the Connection header', () => {
    expect(getReqHeaders({ keepAlive: true }).Connection).toBe('keep-alive');
    expect(getReqHeaders({ keepAlive: false }).Connection).toBe('close');
    expect(getReqHeaders({})).not.toHaveProperty('Connection');
  });

  test('noCache: false leaves the no-cache headers out', () => {
    const h = getReqHeaders({ noCache: false });
    for (const key of Object.keys(NO_CACHE)) expect(h).not.toHaveProperty(key);
    expect(getReqHeaders({ noCache: true })).toMatchObject(NO_CACHE);
  });
});

describe('buildReqHeaders()', () => {
  test('with no options: a random UA, keep-alive, identity encoding and text accept', () => {
    const h = buildReqHeaders();
    expect(userAgents).toContain(h['User-Agent']);
    expect(h.Connection).toBe('keep-alive');
    expect(h['Accept-Encoding']).toBe('identity');
    expect(h.Accept).toBe(DEFAULT_ACCEPT);
    expect(h).toMatchObject(NO_CACHE);
  });

  test('uses the given options as they are', () => {
    const h = buildReqHeaders({ ua: 'default' });
    expect(h['User-Agent']).toBe(userAgents[0]);
    expect(h).not.toHaveProperty('Connection');
  });

  test('honors the encoding and mime options when set', () => {
    const h = buildReqHeaders({ encoding: 'default', mime: 'any' });
    expect(h['Accept-Encoding']).toBe(acceptEncodings[0]);
    expect(h.Accept).toBe('*/*');
    const none = buildReqHeaders({ encoding: 'none', mime: 'none' });
    expect(none).not.toHaveProperty('Accept-Encoding');
    expect(none).not.toHaveProperty('Accept');
  });
});
