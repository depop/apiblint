const fs = require('fs');

const chalk = require('chalk');
const drafter = require('drafter');


function _posInfo(srcPos) {
		// these only ever select a single line at a time
		// (instead there are multiple `srcPos` per warning to select multiple lines 🤷‍♂️)
		let startPos = srcPos.content[0];
		let endPos = srcPos.content[1];
		return {
			startLine: startPos.attributes.line.content - 1,
			startChar: startPos.attributes.column.content - 1,
			endLine: endPos.attributes.line.content - 1,
			endChar: endPos.attributes.column.content - 1,
		};
}

function _range(start, end) {
	// 🐍-style  https://stackoverflow.com/a/57060427/202168
	return [...Array(end - start + 1)].map((e, i) => i + start);
}

function _pad(padSize, pad, suffix, i) {
	return String(i).padStart(padSize, pad) + suffix;
}

function outputWarnings(lines, warnings, context=2) {
	let formatWarnNo = _pad.bind(null, String(warnings.length).length, ' ', '');

	warnings.forEach((warning, warningIndex) => {
		console.log(
			chalk.red.bold('[' + formatWarnNo(warningIndex + 1) + '] ' + warning.content)
		);

		let sourcePositions = warning.attributes.sourceMap.content[0].content;
		let posInfos = sourcePositions.map(_posInfo);
		let startInfo = posInfos[0];
		let endInfo = posInfos.slice(-1)[0];

		let formatLineNo = _pad.bind(null, String(lines.length).length, ' ', ': ');

		_range(
			Math.max(0, startInfo.startLine - context),
			Math.min(lines.length, endInfo.endLine + context)
		).forEach(i => {
			let line = lines[i];
			if (i == startInfo.startLine) {
				// first highlighted line
				let pre = line.slice(0, startInfo.startChar);
				let post = line.slice(startInfo.startChar);
				console.log(
					chalk.yellow(formatLineNo(i)) + chalk.gray(pre) + post
				);
			} else if (i > startInfo.startLine && i < endInfo.endLine) {
				// highlighted line
				console.log(
					chalk.yellow(formatLineNo(i)) + line
				);
			} else if (i == endInfo.endLine) {
				// last highlighted line
				let pre = line.slice(0, endInfo.endChar);
				let post = line.slice(endInfo.endChar);
				console.log(
					chalk.yellow(formatLineNo(i)) + pre + chalk.gray(post)
				);
			} else {
				// pre/post 'context' lines
				console.log(
					chalk.yellow.dim(formatLineNo(i)) + chalk.gray(line)
				);
			}
		});
		console.log("-----------");
	})
}

export function lintFile(filename) {
	console.log(chalk.bold(filename));
	fs.readFile(filename, 'utf8', function(err, contents) {  
    if (err) throw err;

    let lines = contents.split(/\r\n|\r|\n/);

		let options = {
		  requireBlueprintName: true,
		};
		drafter.validate(contents, options, (errors, warnings) => {
    	if (errors) {
    		// I'm not sure how to cause an 'error'
    		// (passing a non-apib file still gives a parseResult)
    		console.log(chalk.red.bold("Errors:"), errors);
    		process.exit(2);
    	} else if (warnings) {
    		// linter found stuff to report...
    		if (warnings.element == 'parseResult') {
    			// typical linting results
    			outputWarnings(lines, warnings.content);
    			process.exit(1);
    		} else {
    			// "should not happen"
	    		console.log(chalk.red.bold("Error: unrecognised linter result"), warnings);
	    		process.exit(3);
    		}
    	} else {
    		// 🎉
    		console.log(chalk.green('OK'));
    		process.exit(0);
    	};
    });
	});
}

export function lint(args) {
	args.files.forEach(lintFile);
}
