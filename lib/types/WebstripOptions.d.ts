import { Page } from 'puppeteer';
import { ReqOptions } from './ReqOptions.js';
/** Options for a webstrip operation. */
export interface WebstripOptions extends ReqOptions {
    /**
     * Whether to wait for `networkidle`, `load` or `domcontentloaded` event
     * before stripping. If set, uses browser (chromium); instead of HTTP
     * request for stripping.
     * @default undefined
     */
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    /**
     * Opens chromium browser, instead of silent stripping. If a number is
     * specified, it will be used as a timeout (in seconds) to auto-close the
     * browser.
     * @default false
     */
    navigate?: boolean | number;
    /**
     * Callback function to be executed when the page is fully loaded.
     */
    onPageLoaded?(evaluate: Page['evaluate']): void | Promise<void>;
    /**
     * Callback function to be executed when the target is destroyed (i.e. browser
     * or page is closed). Only applicable when `navigate` is enabled.
     */
    onPageClosed?(): void;
}
