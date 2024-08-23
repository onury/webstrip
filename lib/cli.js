#! /usr/bin/env node
/* eslint-disable quote-props */
/* eslint-disable no-console */
// core modules
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
// dep modules
import { meows, chalk } from 'meow-styler';
// own modules
import { ERR_NO_URL, webstrip } from './webstrip.js';
// constants
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const currentFilePath = resolve(fileURLToPath(import.meta.url));
const argv1 = (process.argv[1] || '').trim(); // path passed to node
const realPathReceived = argv1 ? fs.realpathSync(resolve(argv1)) : undefined;
/**
 * Indicates whether this script is called directly from the command line. We
 * need this to make the CLI mockable while testing.
 */
const commandLineCall = realPathReceived ? currentFilePath.includes(realPathReceived) : false;
/**
 * Executes the main function of the webstrip CLI.
 *
 * @param args - Optional array of string arguments.
 * @returns A promise that resolves to an exit function.
 */
export async function main(args) {
    const cli = meows({
        pkg,
        argv: args ?? process.argv.slice(2),
        autoHelp: false,
        description: pkg.description,
        usage: c => c.dim.cyan('$') + c.blueBright(' webstrip ') + c.cyan('<url> ') + c.green.dim('[options]'),
        examples: ({ cyan, blueBright, green, white }) => cyan.dim('$')
            + blueBright(' webstrip ') + cyan('https://google.com') + green(' -f ') + white('5') + green(' --ua ') + white('random')
            + '\n' + cyan.dim('$') + blueBright(' webstrip ') + cyan('https://amazon.com')
            + green(' -w ') + white('load') + green(' -e ') + white('"document.querySelector(\'#navbar\').remove()"'),
        importMeta: import.meta, // required
        booleanDefault: undefined,
        allowUnknownFlags: false,
        helpIndent: 2,
        layout: {
            width: 80,
            spacing: 2,
            indent: 2
        },
        colors: c => ({
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
                'default': 10
            },
            redirectError: {
                description: 'Whether to throw when redirect limit is reached.',
                type: 'boolean',
                'default': true
            },
            navigate: {
                description: 'Open chromium browser, instead of silent stripping. '
                    + 'Pass a number to set a timeout (in seconds) to auto-close the browser.',
                type: 'number',
                shortFlag: 'n'
            },
            eval: {
                description: 'Evaluate a script on the page\'s context before stripping.',
                type: 'string',
                shortFlag: 'e'
            },
            output: {
                description: 'Output format.',
                type: 'string',
                shortFlag: 'o',
                choices: ['json', 'text'],
                isMultiple: false,
                'default': 'text'
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
            noCache: {
                description: 'Whether the response should not be cached.',
                type: 'boolean',
                'default': true
            },
            secure: {
                description: 'Whether to upgrade insecure (HTTP) requests to secure (HTTPS) requests.',
                type: 'boolean',
                'default': true
            },
            dnt: {
                description: 'Whether to enable the "Do Not Track" (DNT) header.',
                type: 'boolean',
                'default': true
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
    try {
        if (flags.help) {
            console.log(cli.help);
            return () => process.exit(0);
        }
        if (!url) {
            console.error(chalk.red('Error: ') + chalk.yellow(ERR_NO_URL));
            console.log(cli.help);
            return () => process.exit(2);
        }
        const options = {
            waitUntil: flags.waitUntil,
            followRedirects: flags.followRedirects,
            redirectError: flags.redirectError,
            navigate: 'navigate' in flags
                ? !flags.navigate // 0 or undefined
                    ? true
                    : flags.navigate
                : false,
            onPageLoaded: flags.eval
                ? async (evaluate) => { evaluate(flags.eval); }
                : undefined,
            headerOptions: {
                language: flags.language,
                encoding: flags.encoding,
                mime: flags.mime,
                ua: flags.ua,
                referer: flags.referer,
                noCache: flags.noCache,
                secure: flags.secure,
                dnt: flags.dnt,
                keepAlive: flags.keepAlive
            }
        };
        const result = await webstrip(url, options);
        if (flags.output === 'json') {
            console.info(JSON.stringify(result, null, 2));
        }
        else {
            console.info(chalk.cyan('Request URL   :'), result.url);
            console.info(chalk.cyan('Status Code   :'), result.statusCode);
            console.info(chalk.cyan('Redirect Count:'), result.redirectCount);
            const headerNames = Object.keys(result.headers);
            const width = headerNames.reduce((w, key) => Math.max(w, key.length), 0);
            console.info(chalk.cyan('\nResponse Headers:'));
            headerNames.forEach(key => {
                console.info(`${key.padEnd(width)}: ${result.headers[key]}`);
            });
            console.info(chalk.cyan('\nResponse Body:'));
            console.info(result.data);
        }
        return () => process.exit(0);
    }
    catch (err) {
        console.error(chalk.yellow('Error: ') + chalk.redBright(err.message));
        return () => process.exit(1);
    }
}
// only execute if the script is being run directly
if (commandLineCall)
    (await main())();
//# sourceMappingURL=cli.js.map