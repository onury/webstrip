// own modules
import { OutgoingHttpHeaders } from 'http';
import {
  randomItem,
  getRandomUserAgent,
  getRandomAcceptLanguage,
  getRandomAcceptEncoding,
  getRandomAccept,
  getReqHeaders,
  buildReqHeaders
} from '../src/http.utils.js';

describe('httpUtils', () => {

  test('randomItem', () => {
    const items = ['a', 'b', 'c'];
    const item = randomItem(items);
    expect(items.includes(item)).toBe(true);
  });

  test('getRandomUserAgent()', () => {
    const ua = getRandomUserAgent();
    expect(ua).toMatch(/Mozilla\/5\.0 \(.*\)/);
  });

  test('getRandomAcceptLanguage()', () => {
    const lang = getRandomAcceptLanguage();
    // e.g. 'en-US,en;q=0.9, tr;q=0.8, de;q=0.7, es;q=0.6, *;q=0.5',
    expect(lang).toMatch(/^((, ?)?([a-z]{2}(-[a-z]{2})?|\*)(; ?q=\d(\.\d+))?)+$/i);
  });

  test('getRandomAcceptEncoding()', () => {
    const enc = getRandomAcceptEncoding();
    // e.g. 'gzip, deflate, br;q=1.0, identity;q=0.5, *;q=0.25',
    expect(enc).toMatch(/^((, ?)?(gzip|deflate|br|sdch|identity|\*)(; ?q=\d(\.\d+))?)+$/i);
  });

  test('getRandomAccept()', () => {
    const mime = getRandomAccept();
    // e.g. 'text/html,application/xhtml+xml,application/xml;q=0.9,image/png,image/webp,*/*;q=0.8',
    expect(mime).toMatch(/^((, ?)?([a-z-*]+\/[a-z-+*]+)(; ?q=\d(\.\d+))?)+$/i);
  });

  const testHeaders = (headers: OutgoingHttpHeaders): OutgoingHttpHeaders => {
    expect(headers).toHaveProperty('User-Agent');
    expect(headers).toHaveProperty('Accept-Language');
    expect(headers).toHaveProperty('Accept-Encoding');
    expect(headers).toHaveProperty('Accept');
    return headers;
  };

  test('getReqHeaders(), buildReqHeaders()', () => {
    let h: OutgoingHttpHeaders | undefined;
    testHeaders(getReqHeaders());
    h = testHeaders(getReqHeaders({
      dnt: false,
      keepAlive: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      referer: 'x' as any
    }));
    expect(h.referer).toBeUndefined();
    expect(h.Connection).toBe('keep-alive');

    testHeaders(buildReqHeaders());
    h = testHeaders(buildReqHeaders({
      dnt: false,
      keepAlive: false,
      referer: 'default',
      mime: 'any',
      secure: false
    }));
    expect(h.Connection).toBe('close');
    expect(h).toHaveProperty('Referer');
    expect(h).not.toHaveProperty('Upgrade-Insecure-Requests');
  });

});
