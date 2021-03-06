import chalk from 'chalk';
import * as log from 'loglevel';
import yargs from 'yargs';

import { lint } from './linter';


/**
 * @param {Array<string>} rawArgs - i.e. from `process.argv`
 * @returns {Object} parsed args
 */
export function parseArgs(rawArgs) {
  return yargs
    .command('$0 <files...>', 'Lint a set of .apib files', (yargs) => {
      yargs
        .option('fuzzy-line-range', {
          alias: 'z',
          type: 'number',
          default: 5,
          describe:
            `If you are using a <blueprint-file>.apiblint file to ignore ` +
            `specific warnings, line numbers from the ignore context can be ` +
            `fuzzy matched within a certain range (to cope with small edits ` +
            `to the blueprint that would otherwise invalidate the ignore file)`
        })
        .option('context-lines', {
          alias: 'c',
          type: 'number',
          default: 2,
          describe:
            `How many lines of 'context' to display above and below the highlighted ` +
            `lines where the warning occurs.`
        })
        .option('ignore-codes', {
          alias: 'i',
          type: 'array',
          default: [],
          desc:
          `One or more warning codes to ignore globally, e.g.\n` +
          `W0 W1 (this arg must either come after your list of paths `+
          `or follow this arg with a -- and then list the paths)`
        })
        .option('log-level', {
          alias: 'l',
          type: 'string',
          coerce: val => val.toLowerCase(),
          choices: ['silent', 'trace', 'debug', 'info', 'warn', 'error'],
          default: 'info',
        })
        .option('no-color', {
          alias: 'n',
          type: 'boolean',
          default: undefined,  // default: false triggers conflict warning by yargs
          describe:
            `Monochrome output only`
        })
        .option('force-color', {
          alias: 'f',
          type: 'boolean',
          default: undefined,  // default: false triggers conflict warning by yargs
          conflicts: 'no-color',
          describe:
            `When running as a pre-commit hook we are unable to detect if the ` +
            `terminal supports colored output. If you want to see colored ` +
            `output then set this flag for apiblint in your ` +
            `.pre-commit-config.yaml`
        });
    })
    .help()
    .parse(rawArgs.slice(2))
  ;
}

/**
 * @param {Array<string>} args - from `parseArgs`
 * @returns {Object} an options object suitable for use with `lint`
 */
export function optionsFromArgs(args) {
  return {
    fuzzFactor: args.fuzzyLineRange,
    contextSize: args.contextLines,
    ignoreFileExt: '.apiblint',
    ignoreCodes: args.ignoreCodes,
    color: (args.noColor ? false : (args.forceColor ? true : null)),
    drafterOpts: {
      requireBlueprintName: true,
    },
  }
}

/**
 * (main entrypoint)
 * Runs the `lint` function and exits.
 *
 * @param {Array<string>} rawArgs - i.e. from process.argv
 */
export async function main(rawArgs) {
  let args = parseArgs(rawArgs);
  let options = optionsFromArgs(args);

  log.setLevel(args.logLevel);

  // true: force color, false: no color, null: auto
  if (options.color !== null) {
    chalk.level = options.color ? 3 : 0;
    chalk.enabled = chalk.level > 0;
  }

  log.debug(options);

  let results = await lint(args.files, options);
  let exitCodes = [...results.values()].map(result => result.exitCode);

  process.exit(Math.max(...exitCodes));
}
