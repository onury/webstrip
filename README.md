<h1 align="center">
    <img alt="webstrip" src="https://github.com/onury/webstrip/raw/main/_assets/logo.svg" width="300" height="auto" style="margin-bottom:20px">
</h1>

<p align="center">
  <a href="https://github.com/onury/webstrip/actions/workflows/node.js.yml"><img src="https://github.com/onury/webstrip/actions/workflows/node.js.yml/badge.svg" alt="build" /></a>
  <a href="https://github.com/onury/webstrip/actions/workflows/node.js.yml"><img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" /></a>
  <a href="https://www.npmjs.com/package/webstrip"><img src="https://img.shields.io/npm/v/webstrip.svg?style=flat&label=&color=%23C6234B&logo=npm" alt="version" /></a>
  <a href="https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7"><img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TS" /></a>
</p>

Easy web stripping via API or CLI;
- Using HTTP request or (headless/headful) browser navigation.
- Ability to wait for full page load or network idle.
- Ability to follow redirects. (configurable depth)
- Auto-generate (and tweak) block-safe request headers.
- Ability to launch browser (chromium) for manual navigation.
- Ability to alter DOM (evaluate script) before returning contents.

## Installation

```sh
npm i webstrip
```

**Important**: This module is **ESM** 🔆. Please [**read this**](https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7). 


## Usage

```typescript
import { webstrip } from 'webstrip';

const content = await webstrip('https://example.com', {
  waitUntil: 'networkidle',
  followRedirects: 5
});
```

Alter DOM before stripping:
```typescript
await webstrip('https://example.com', {
  onPageLoaded: async evaluate => {
    console.log('page loaded');
    const title = await evaluate('document.title');
    
    await evaluate(sel => {
      // inside DOM here
      document.querySelector(sel).remove();
    }, getSomeSelector())
  }
});
```

## Options

| Option | Type | Description | Default |
| ------ | ---- | :---------- | :------ |
| **` waitUntil `**| `string` | Whether to wait for `networkidle`, `load` or `domcontentloaded` event before stripping. If set, uses browser (chromium); instead of HTTP request for stripping.| `undefined` |
| **` followRedirects `**| `boolean\|number` | Whether to follow redirects. Or specify the maximum number of redirects to follow.| `10` |
| **` redirectError `**| `boolean` | Whether to throw an error when a redirect is encountered after `followRedirects` limit is reached. If `false`, the last response will be returned within the result.| `true` |
| **` headerOptions `**| `ReqHeaderOptions` | Request header options. Auto-generated when undefined. | `undefined` |
| **` navigate `**| `boolean\|number` | Opens chromium browser, instead of silent stripping. If a number is specified, it will be used as a timeout (in seconds) to auto-close the browser.| `false` |
| **` onPageLoaded `**| `Function` | Callback function to be executed when the page is fully loaded.| `undefined` |
| **` onPageClosed `**| `Function` | Callback function to be executed when the target is destroyed (i.e. browser/page is closed). Only applicable when `navigate` is enabled.| `undefined` |

- All options are optional. 
- HTTP request is much faster and uses less memory than browser navigation method.
- Browser navigation is used when one of the following options is enabled: `waitUntil`, `navigate`, `onPageLoaded`, `onPageClosed`. 

### CLI Usage

<details>
<summary>See CLI help output</summary>
<pre language="shell"><code>Usage
&#x200B;  $ webstrip {url} [options]
&#x200B;
Options
  --wait-until, -w        Wait for the specified event before stripping. One
&#x200B;                          of: networkidle, load, domcontentloaded
  --follow-redirects, -f  Maximum number of redirects to follow.
&#x200B;                          Default: 10
  --redirect-error        Whether to throw when redirect limit is reached.
&#x200B;                          Default: true
  --navigate, -n          Open chromium browser, instead of silent stripping.
&#x200B;                          Pass a number to set a timeout (in seconds) to
&#x200B;                          auto-close the browser.
  --eval, -e              Evaluate a script on the page's context before
&#x200B;                          stripping.
  --output, -o            Output format. One of: json, text
&#x200B;                          Default: text
  --language              What should be included in the "Accept-Language"
&#x200B;                          header. One of: none, default, random, any
  --encoding              What should be included in the "Accept-Encoding"
&#x200B;                          header. One of: none, default, random, any
  --mime                  What should be included in the "Accept" (MIME)
&#x200B;                          header. One of: none, default, random, any
  --ua                    What should be included in the "User-Agent" header.
&#x200B;                          One of: none, default, random
  --referer               What should be included in the "Referer" header. One
&#x200B;                          of: none, default, random
  --no-cache              Whether the response should not be cached.
&#x200B;                          Default: true
  --secure                Whether to upgrade insecure (HTTP) requests to
&#x200B;                          secure (HTTPS) requests.
&#x200B;                          Default: true
  --dnt                   Whether to enable the "Do Not Track" (DNT) header.
&#x200B;                          Default: true
  --keep-alive            Whether to keep the connection alive.
&#x200B; 
Examples
&#x200B;  $ webstrip https://google.com -f 5 --ua random
&#x200B;  $ webstrip https://amazon.com -w load -e "document.querySelector('#navbar').remove()"
</code></pre>
</details>

## Returned Result

`webstrip` returns the object below when called programmatically.

```ts
{
  /** Generated request headers sent. */
  reqHeaders: OutgoingHttpHeaders;
  /** HTTP status code. */
  statusCode: number;
  /** Response headers received. */
  headers: IncomingHttpHeaders,
  /** Response body received. */
  data: string;
  /** The requested URL. */
  url: string;
  /** Number of HTTP redirects, if any has occurred. */
  redirectCount: number;
}
```

For CLI, you can use the `--output` flag for `text` or `json` preference.

## License

**MIT** ©️ Onur Yıldırım ([@onury](https://github.com/onury)).
