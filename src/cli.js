import yargs from 'yargs'
import {lint} from './linter'


function parseArgs(rawArgs) {
  return yargs
    .command('$0 <files...>', 'Lint a set of .apib files', (yargs) => {
      yargs
        .option('z', {
          alias: 'fuzzy-line-range',
          type: 'number',
          default: 8,
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

function optionsFromArgs(args) {
  return {
    fuzzFactor: args.fuzzyLineRange,
    contextSize: 2,
    ignoreFileExt: '.apiblint',
    drafterOpts: {
      requireBlueprintName: true,
    },
  }
}

export async function cli(rawArgs) {
  let args = parseArgs(rawArgs);
  let options = optionsFromArgs(args);
  let exitCodes = await lint(args.files, options);
  process.exit(Math.max(...exitCodes));
}
