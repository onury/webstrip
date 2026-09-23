// dep modules
import type { Page } from 'puppeteer';

// own modules
import type { ReqOptions } from './ReqOptions.js';

/**
 * Options for a webstrip call. Setting `waitUntil`, `navigate`,
 * `onPageLoaded` or `onPageClosed` switches from a plain HTTP request to a
 * Chromium browser.
 *
 * @example
 * ```ts
 * const options: WebstripOptions = {
 *   waitUntil: 'networkidle',
 *   followRedirects: 5,
 *   onPageLoaded: async (evaluate) => {
 *     await evaluate('document.querySelector("#ads")?.remove()');
 *   }
 * };
 * ```
 */
export interface WebstripOptions extends ReqOptions {
  /**
   * The event to wait for before stripping: `'networkidle'`, `'load'` or
   * `'domcontentloaded'`. Uses the browser when set.
   * @defaultValue `undefined`
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /**
   * Opens a visible Chromium window for manual navigation instead of stripping
   * silently. A number sets a timeout (in seconds) to auto-close the browser;
   * otherwise the result is returned once the page is closed.
   * @defaultValue `false`
   */
  navigate?: boolean | number;
  /**
   * Called once the page is loaded, before its content is read. Receives the
   * page's `evaluate` function, to read or alter the DOM.
   */
  onPageLoaded?(evaluate: Page['evaluate']): void | Promise<void>;
  /**
   * Called when the page is closed or the browser auto-closes. Only
   * applicable when `navigate` is enabled.
   */
  onPageClosed?(): void;
}
