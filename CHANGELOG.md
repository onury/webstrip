# Webstrip - Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed

- **Random headers**: `randomItem()` never picked the last item of a list, and threw on a single-item list.
- **`mime` and `encoding` header options** had no effect; they were always overwritten. They are now sent when set, and compressed HTTP responses (gzip, deflate, br) are decoded.
- **Redirects over HTTP**: `http:` URLs (and redirects to them) failed with "No response from", and a relative `Location` header could not be followed. Both work now.
- **Request headers** are generated once per call; every redirect hop sends the set that `result.reqHeaders` reports. Previously each hop got a new random user agent.
- **Browser cleanup**: the browser is now closed on every path, including a throwing `onPageLoaded` callback; and a failing close no longer surfaces as an unhandled rejection.
- **Local and private hosts in browser mode** were blocked by Chrome (`net::ERR_BLOCKED_BY_CLIENT`) because of the forced `Referer` header. The referer now goes through the navigation itself.
- **`redirectCount` in browser mode** was always `0` when redirects were unlimited (the default).
- **`navigate`** now waits for the stripped page to close (or the browser to auto-close) instead of any target, and clears its auto-close timer when the page is closed first.
- An explicit **`waitUntil`** is no longer overridden by `onPageLoaded`.
- **CLI**: the `--eval` script was not awaited, so the content could be read before it ran. `--no-cache` had no effect; the flag is now `--cache` (with `--no-cache` as the default). Piped output could be cut short by `process.exit()`; the CLI now sets the exit code instead.

### Changed

- **Node.js 22.12** or newer is required (was 18), following Puppeteer 25 and the Node.js LTS schedule.
- Upgraded Puppeteer to **v25**.
- Puppeteer is imported lazily; plain HTTP stripping no longer loads it.

### Tooling

- Moved to **Biome** (`biome-config-oy`), `tsconfig-oy` 2 and TypeScript 6.
- Moved to **Vitest 4** with istanbul coverage at **100%** and **Stryker** mutation testing at **100%**.
- The test suite runs offline against a local fixture server, instead of live websites.
- CI runs on Ubuntu with Node.js 22 and 24.

### Docs

- Exampled TSDoc on the public API, and a README with a full API reference.

## 1.0.1 (2024-08-24)

### Changed

- Build clean-up.

## 1.0.0 (2024-08-24)

- Initial release.
