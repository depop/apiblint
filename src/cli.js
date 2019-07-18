import yargs from 'yargs'
import {lint} from './linter'


function parseArgs(rawArgs) {
  return yargs
    .command('$0 <files...>', 'Lint a set of .apib files', (yargs) => {
    	// TODO: this option is useless
    	// but we want one for an ignorefile
    	yargs.option('w', {
	  		alias: 'suppress-warnings',
	  		type: 'boolean',
	  		default: false,
	  		describe:
	  			`Don't fail the linting for warnings, only for parse errors (you ` +
					`probably don't want this - errors are rare, anything related to` +
					`linting is raised as a warning). Default is to promote warnings ` +
					`as failures.`
	  	})
    })
   	.help()
  	.parse(rawArgs.slice(2))
  ;
}

export async function cli(args) {
  await lint(parseArgs(args));
}