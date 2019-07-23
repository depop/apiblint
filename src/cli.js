import yargs from 'yargs'
import {lint} from './linter'


/**
 * @param {Array<string>} rawArgs - i.e. from `process.argv`
 * @returns {Object} parsed args
 */
export function parseArgs(rawArgs) {
  return yargs
    .command('$0 <files...>', 'Lint a set of .apib files', (yargs) => {
      yargs
        .option('z', {
          alias: 'fuzzy-line-range',
          type: 'number',
          default: 5,
          describe:
            `If you are using a <blueprint-file>.apiblint file to ignore ` +
            `specific warnings, line numbers from the ignore context can be ` +
            `fuzzy matched within a certain range (to cope with small edits ` +
            `to the blueprint that would otherwise invalidate the ignore file)`
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
    contextSize: 2,
    ignoreFileExt: '.apiblint',
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
export async function cli(rawArgs) {
  let args = parseArgs(rawArgs);
  let options = optionsFromArgs(args);
  let exitCodes = await lint(args.files, options);
  process.exit(Math.max(...exitCodes));
}
