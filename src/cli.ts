// core modules
import { createRequire } from 'node:module';

// dep modules
import { chalk, meows } from 'meow-styler';

// own modules
import type { ReqHeaderOptions } from './types/ReqHeaderOptions.js';
import type { WebstripOptions } from './types/WebstripOptions.js';
import { ERR_NO_URL, webstrip } from './webstrip.js';

/**
 * Runs the webstrip CLI with the given arguments and writes the result to the
 * console. The caller decides what to do with the returned exit code, which
 * keeps this function testable in-process.
 *
 * @param args - Command line arguments. Defaults to `process.argv.slice(2)`.
 * @returns The exit code: `0` on success, `1` on a failed strip, `2` on a usage error.
 */
export async function main(args: string[] = process.argv.slice(2)): Promise<number> {
  const pkg = createRequire(import.meta.url)('../package.json');
  const cli = meows({
    pkg,
    argv: args,
    autoHelp: false,
    description: pkg.description,
    usage: (c) =>
      c.dim.cyan('$') + c.blueBright(' webstrip ') + c.cyan('<url> ') + c.green.dim('[options]'),
    examples: ({ cyan, blueBright, green, white }) =>
      cyan.dim('$') +
      blueBright(' webstrip ') +
      cyan('https://google.com') +
      green(' -f ') +
      white('5') +
      green(' --ua ') +
      white('random') +
      '\n' +
      cyan.dim('$') +
      blueBright(' webstrip ') +
      cyan('https://amazon.com') +
      green(' -w ') +
      white('load') +
      green(' -e ') +
      white('"document.querySelector(\'#navbar\').remove()"'),
    importMeta: import.meta, // required
    booleanDefault: undefined,
    allowUnknownFlags: false,
    helpIndent: 2,
    layout: {
      width: 80,
      spacing: 2,
      indent: 2
    },
    colors: (c) => ({
      title: 'yellow.bold',
      flag: c.greenBright,
      flagDescription: 'white'
    }),
    flags: {
      waitUntil: {
        description: 'Wait for the specified event before stripping.',
        type: 'string',
        shortFlag: 'w',
        choices: ['networkidle', 'load', 'domcontentloaded']
      },
      followRedirects: {
        description: 'Maximum number of redirects to follow.',
        type: 'number',
        shortFlag: 'f',
        default: 10
      },
      redirectError: {
        description: 'Whether to throw when redirect limit is reached.',
        type: 'boolean',
        default: true
      },
      navigate: {
        description:
          'Open chromium browser, instead of silent stripping. ' +
          'Pass a number to set a timeout (in seconds) to auto-close the browser.',
        type: 'number',
        shortFlag: 'n'
      },
      eval: {
        description: "Evaluate a script on the page's context before stripping.",
        type: 'string',
        shortFlag: 'e'
      },
      output: {
        description: 'Output format.',
        type: 'string',
        shortFlag: 'o',
        choices: ['json', 'text'],
        isMultiple: false,
        default: 'text'
      },
      // header options
      language: {
        description: 'What should be included in the "Accept-Language" header.',
        type: 'string',
        choices: ['none', 'default', 'random', 'any']
      },
      encoding: {
        description: 'What should be included in the "Accept-Encoding" header.',
        type: 'string',
        choices: ['none', 'default', 'random', 'any']
      },
      mime: {
        description: 'What should be included in the "Accept" (MIME) header.',
        type: 'string',
        choices: ['none', 'default', 'random', 'any']
      },
      ua: {
        description: 'What should be included in the "User-Agent" header.',
        type: 'string',
        choices: ['none', 'default', 'random']
      },
      referer: {
        description: 'What should be included in the "Referer" header.',
        type: 'string',
        choices: ['none', 'default', 'random']
      },
      cache: {
        description: 'Allow cached responses. By default, no-cache headers are sent (--no-cache).',
        type: 'boolean'
      },
      secure: {
        description: 'Whether to upgrade insecure (HTTP) requests to secure (HTTPS) requests.',
        type: 'boolean',
        default: true
      },
      dnt: {
        description: 'Whether to enable the "Do Not Track" (DNT) header.',
        type: 'boolean',
        default: true
      },
      keepAlive: {
        description: 'Whether to keep the connection alive.',
        type: 'boolean'
      },
      help: {
        description: 'Show this help.',
        type: 'boolean'
      }
    }
  });

  const url = cli.input[0];
  const { flags } = cli;

  if (flags.help) {
    console.log(cli.help);
    return 0;
  }

  if (!url) {
    console.error(chalk.red('Error: ') + chalk.yellow(ERR_NO_URL));
    console.log(cli.help);
    return 2;
  }

  const script = flags.eval;
  const options: WebstripOptions = {
    waitUntil: flags.waitUntil as WebstripOptions['waitUntil'],
    followRedirects: flags.followRedirects,
    redirectError: flags.redirectError,
    // a bare --navigate (no seconds) keeps the browser open until it is closed
    navigate: 'navigate' in flags ? flags.navigate || true : false,
    onPageLoaded: script
      ? async (evaluate) => {
          await evaluate(script);
        }
      : undefined,
    headerOptions: {
      language: flags.language as ReqHeaderOptions['language'],
      encoding: flags.encoding as ReqHeaderOptions['encoding'],
      mime: flags.mime as ReqHeaderOptions['mime'],
      ua: flags.ua as ReqHeaderOptions['ua'],
      referer: flags.referer as ReqHeaderOptions['referer'],
      noCache: flags.cache !== true,
      secure: flags.secure,
      dnt: flags.dnt,
      keepAlive: flags.keepAlive
    }
  };

  try {
    const result = await webstrip(url, options);
    if (flags.output === 'json') {
      console.info(JSON.stringify(result, null, 2));
      return 0;
    }
    console.info(chalk.cyan('Request URL   :'), result.url);
    console.info(chalk.cyan('Status Code   :'), result.statusCode);
    console.info(chalk.cyan('Redirect Count:'), result.redirectCount);
    const headerNames = Object.keys(result.headers);
    const width = Math.max(0, ...headerNames.map((key) => key.length));
    console.info(chalk.cyan('\nResponse Headers:'));
    for (const key of headerNames) {
      console.info(`${key.padEnd(width)}: ${result.headers[key]}`);
    }
    console.info(chalk.cyan('\nResponse Body:'));
    console.info(result.data);
    return 0;
  } catch (err) {
    console.error(chalk.yellow('Error: ') + chalk.redBright((err as Error).message));
    return 1;
  }
}
