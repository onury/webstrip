<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.github.com/onury/webstrip/master/_assets/webstrip-logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.github.com/onury/webstrip/master/_assets/webstrip-logo-light.png">
    <img alt="webstrip" width="400" src="https://raw.github.com/onury/webstrip/master/_assets/webstrip-logo-light.png" height="25" style="margin-bottom:30px">
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/onury/webstrip/actions/workflows/node.js.yml"><img src="https://github.com/onury/webstrip/actions/workflows/node.js.yml/badge.svg" alt="build" /></a>
  <a href="https://github.com/onury/webstrip/blob/main/vitest.config.ts"><img src="https://img.shields.io/badge/coverage-100%25-399F5D?logo=vitest&style=flat" alt="coverage" /></a>
  <a href="https://raw.github.com/onury/webstrip"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2Fonury%2Fwebstrip%2Fraw%2Fmaster%2Fpackage.json&query=%24.version&style=flat&label=version&color=%23EB2039&logo=npm" alt="version" /></a>
  <a href="https://github.com/onury/webstrip/blob/master/LICENSE"><img src="https://img.shields.io/github/license/onury/webstrip?style=flat" alt="license" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3260C7?logo=typescript&logoColor=ffffff&style=flat" alt="TS" /></a>
</p>



> ©️2024, Onur Yıldırım ([@onury](https://github.com/onury)). MIT License.

Easy web stripping;
- Using HTTP request or browser navigation.
- Ability to wait for full page load or network idle.
- Ability to follow redirects. (configurable depth)
- Auto-generate (and tweak) block-safe request headers.
- Ability to launch browser (chromium) for manual navigation.
- Ability to alter DOM before returning contents.

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

## License

**MIT** ©️ Onur Yıldırım.
