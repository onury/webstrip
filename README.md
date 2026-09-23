<p align="center">
  <a href="https://github.com/onury/webstrip"><img alt="webstrip" src="https://github.com/onury/webstrip/raw/main/_assets/logo.svg" width="300" height="auto" /></a>
</p>

<p align="center">
  <a href="https://github.com/onury/webstrip/actions/workflows/ci.yml"><img src="https://github.com/onury/webstrip/actions/workflows/ci.yml/badge.svg" alt="build" /></a>
  <a href="https://github.com/onury/webstrip/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" /></a>
  <a href="https://stryker-mutator.io/docs/"><img src="https://img.shields.io/badge/mutation-100%25-2BB150?style=flat" alt="mutation score" /></a>
  <a href="https://www.npmjs.com/package/webstrip"><img src="https://img.shields.io/npm/v/webstrip.svg?style=flat&label=&color=%23C6234B&logo=npm" alt="version" /></a>
  <a href="https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7"><img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TS" /></a>
  <a href="https://github.com/onury/webstrip/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/webstrip.svg?style=flat&color=blue" alt="license" /></a>
</p>

> This module is **ESM** 🔆. Please [**read this**](https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7).

Easy web stripping via API or CLI. Fetch a page's content with a plain HTTP request carrying block-safe headers; or drive a real Chromium when the page needs a browser.

- **HTTP** request by default; fast and light on memory.
- Headless (or headful) **browser** navigation when you need it.
- Wait for full page **load** or **network idle**.
- Follow **redirects**, with a configurable depth.
- **Auto-generated** (and tweakable) block-safe request headers.
- Launch a visible Chromium for **manual** navigation.
- Read or **alter the DOM** (evaluate a script) before the content is returned.
- A **CLI** for all of the above.

## Installation

```sh
npm i webstrip
```

Node.js **22.12** or newer is required. Browser mode runs on [Puppeteer][puppeteer], which downloads its own Chromium when installed.

## Usage

The simplest call is a plain HTTP request.

```ts
import { webstrip } from 'webstrip';

const { statusCode, headers, data } = await webstrip('https://example.com');
```

### Browser Mode

Setting `waitUntil`, `navigate`, `onPageLoaded` or `onPageClosed` switches to a Chromium browser. Use it for pages that render their content with JavaScript.

```ts
const result = await webstrip('https://example.com', {
  waitUntil: 'networkidle', // or 'load', 'domcontentloaded'
  followRedirects: 5
});
// result.data is the rendered page
```

> [!NOTE]
> HTTP mode is much faster and uses less memory than the browser. Reach for the browser only when the page needs it.

### Alter the DOM Before Stripping

`onPageLoaded` receives the page's `evaluate` function. Whatever you change in the DOM is reflected in the returned content.

```ts
await webstrip('https://example.com', {
  onPageLoaded: async (evaluate) => {
    const title = await evaluate('document.title');
    // runs inside the page
    await evaluate((selector) => document.querySelector(selector)?.remove(), '#ads');
  }
});
```

`onPageLoaded` waits for the `load` event, unless you set `waitUntil` yourself.

### Redirects

Up to 10 redirects are followed by default. Pass a number to change the limit, or `false` to follow none. When the limit is reached, webstrip throws; unless `redirectError` is `false`, in which case you get the last (redirect) response.

```ts
const result = await webstrip('http://example.com', {
  followRedirects: 1,
  redirectError: false
});
console.log(result.statusCode, result.headers.location, result.redirectCount);
```

_Note: in browser mode, `followRedirects: true` (or leaving it out) follows redirects without a limit._

### Request Headers

Headers that make the request look like a regular browser are generated for you. When `headerOptions` is left out, a random user agent is picked and the connection is kept alive. Tweak them with `headerOptions`.

```ts
await webstrip('https://example.com', {
  headerOptions: {
    ua: 'random', // 'default' | 'random' | 'none'
    referer: 'none',
    language: 'any', // sends *
    dnt: false,
    keepAlive: true
  }
});
```

The headers that were sent come back in `result.reqHeaders`.

### Manual Navigation

`navigate` opens a visible Chromium window. Pass a number of seconds to auto-close it; otherwise webstrip returns once you close the page.

```ts
await webstrip('https://example.com', {
  navigate: 30,
  onPageClosed: () => console.log('closed')
});
```

## API

### `webstrip(url, options?)`

Strips the given URL and returns a promise that resolves to a [result](#result). It throws when no URL is given (`ERR_NO_URL`), the host cannot be resolved (`ERR_NOT_FOUND`), no response is received (`ERR_NO_RESPONSE`), or the redirect limit is reached (`ERR_REDIRECT`). These messages are exported as constants.

### Options

| Option | Type | Description | Default |
| ------ | ---- | :---------- | :------ |
| **`waitUntil`** | `string` | Event to wait for before stripping: `'networkidle'`, `'load'` or `'domcontentloaded'`. Uses the browser. | `undefined` |
| **`followRedirects`** | `boolean \| number` | Whether to follow redirects, or the maximum number to follow. | `10` |
| **`redirectError`** | `boolean` | Whether to throw when the redirect limit is reached. If `false`, the last response is returned. | `true` |
| **`headerOptions`** | `ReqHeaderOptions` | Request header options (see below). Auto-generated when omitted. | `undefined` |
| **`navigate`** | `boolean \| number` | Opens a visible Chromium window. A number auto-closes it after that many seconds. | `false` |
| **`onPageLoaded`** | `(evaluate) => void \| Promise<void>` | Called once the page is loaded, before its content is read. Uses the browser. | `undefined` |
| **`onPageClosed`** | `() => void` | Called when the page is closed or the browser auto-closes. Only when `navigate` is enabled. | `undefined` |

### Header Options

| Option | Type | Description | Default |
| ------ | ---- | :---------- | :------ |
| **`language`** | `'default' \| 'random' \| 'none' \| 'any'` | "Accept-Language" header. `'any'` sends `*`. | `'default'` |
| **`encoding`** | `'default' \| 'random' \| 'none' \| 'any'` | "Accept-Encoding" header. When not set, an uncompressed response is requested. Compressed HTTP responses (gzip, deflate, br) are decoded. | `undefined` |
| **`mime`** | `'default' \| 'random' \| 'none' \| 'any'` | "Accept" header. `'any'` sends `*/*`. When not set, HTML, XML and text are accepted. | `undefined` |
| **`ua`** | `'default' \| 'random' \| 'none'` | "User-Agent" header. | `'default'` |
| **`referer`** | `'default' \| 'random' \| 'none'` | "Referer" header. | `'default'` |
| **`noCache`** | `boolean` | Whether to send the no-cache headers. | `true` |
| **`secure`** | `boolean` | Whether to send "Upgrade-Insecure-Requests". | `true` |
| **`dnt`** | `boolean` | Whether to send "Do Not Track". | `true` |
| **`keepAlive`** | `boolean` | `true` sends "Connection: keep-alive", `false` sends "close". Left out, no "Connection" header is sent. | `undefined` |

### Result

| Property | Type | Description |
| -------- | ---- | :---------- |
| **`reqHeaders`** | `OutgoingHttpHeaders` | The generated request headers that were sent. |
| **`statusCode`** | `number` | HTTP status code of the (last) response. |
| **`headers`** | `IncomingHttpHeaders` | Response headers received. |
| **`data`** | `string` | Response body; or the page content in browser mode. |
| **`url`** | `string` | The final URL, after any redirects. |
| **`redirectCount`** | `number` | Number of redirects followed. |

## CLI

```sh
npx webstrip https://example.com
npx webstrip https://example.com -w networkidle -o json
```

The CLI prints the result as text by default; use `--output json` for JSON. It exits with `1` when stripping fails and `2` when no URL is given.

<details>
<summary>See CLI help output</summary>

```
Usage
  $ webstrip <url> [options]

Options
  --wait-until, -w        Wait for the specified event before stripping. One
                          of: networkidle, load, domcontentloaded
  --follow-redirects, -f  Maximum number of redirects to follow.
                          Default: 10
  --redirect-error        Whether to throw when redirect limit is reached.
                          Default: true
  --navigate, -n          Open chromium browser, instead of silent stripping.
                          Pass a number to set a timeout (in seconds) to
                          auto-close the browser.
  --eval, -e              Evaluate a script on the page's context before
                          stripping.
  --output, -o            Output format. One of: json, text
                          Default: text
  --language              What should be included in the "Accept-Language"
                          header. One of: none, default, random, any
  --encoding              What should be included in the "Accept-Encoding"
                          header. One of: none, default, random, any
  --mime                  What should be included in the "Accept" (MIME)
                          header. One of: none, default, random, any
  --ua                    What should be included in the "User-Agent" header.
                          One of: none, default, random
  --referer               What should be included in the "Referer" header. One
                          of: none, default, random
  --cache                 Allow cached responses. By default, no-cache headers
                          are sent (--no-cache).
  --secure                Whether to upgrade insecure (HTTP) requests to
                          secure (HTTPS) requests.
                          Default: true
  --dnt                   Whether to enable the "Do Not Track" (DNT) header.
                          Default: true
  --keep-alive            Whether to keep the connection alive.
  --help                  Show this help.

Examples
  $ webstrip https://google.com -f 5 --ua random
  $ webstrip https://amazon.com -w load -e "document.querySelector('#navbar').remove()"
```

</details>

Boolean flags can be negated with a `--no-` prefix; e.g. `--no-dnt`, `--no-redirect-error`.

## Changelog

See [**CHANGELOG**][changelog].

## License

© 2026, Onur Yıldırım. [**MIT**][license] License.

[license]:https://github.com/onury/webstrip/blob/main/LICENSE
[changelog]:https://github.com/onury/webstrip/blob/main/CHANGELOG.md
[puppeteer]:https://pptr.dev
