// dep modules
import puppeteer, { type Browser } from 'puppeteer';

/**
 * What the spied browser does once webstrip starts waiting for the page to be
 * closed (navigate mode): close the page, as a user would; or drop the
 * connection, as when the browser quits or crashes.
 */
export type OnWait = 'close-page' | 'disconnect';

export interface LaunchSpy {
  spy: ReturnType<typeof vi.spyOn>;
  browsers: Browser[];
  /** Number of browser.close() calls, per launched browser. */
  closeCalls: number[];
  /** The unspied browser.close(), per launched browser. */
  realClose: Array<() => Promise<void>>;
}

/**
 * Spies on puppeteer.launch: always launches headless (a visible window cannot
 * open in CI) and records the launched browsers.
 *
 * With `onWait`, the page is closed (or the browser disconnected) exactly when
 * webstrip subscribes to the page's `close` event; i.e. after the navigation
 * has settled and the content was read. Acting on a timer instead races the
 * navigation and fails with "Target closed" under load.
 */
export function spyLaunch(onWait?: OnWait): LaunchSpy {
  const launch = puppeteer.launch.bind(puppeteer);
  const browsers: Browser[] = [];
  const closeCalls: number[] = [];
  const realClose: Array<() => Promise<void>> = [];
  const spy = vi.spyOn(puppeteer, 'launch').mockImplementation(async (opts) => {
    const browser = await launch({ ...opts, headless: true });
    const index = browsers.push(browser) - 1;
    closeCalls[index] = 0;

    const close = browser.close.bind(browser);
    realClose[index] = close;
    vi.spyOn(browser, 'close').mockImplementation(() => {
      closeCalls[index] = (closeCalls[index] ?? 0) + 1;
      return close();
    });

    if (onWait) {
      const [page] = await browser.pages();
      if (page) {
        const once = page.once.bind(page);
        vi.spyOn(page, 'once').mockImplementation((event, handler) => {
          const result = once(event, handler);
          if (event === 'close') {
            // after webstrip's listeners are all attached (same tick)
            setImmediate(() => {
              if (onWait === 'close-page') void page.close();
              else void browser.disconnect();
            });
          }
          return result;
        });
      }
    }
    return browser;
  });
  return { spy, browsers, closeCalls, realClose };
}
