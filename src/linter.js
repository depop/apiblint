const fs = require('fs').promises;
const util = require('util');

const chalk = require('chalk');
const drafter = require('drafter');
const escapeStringRegexp = require('escape-string-regexp');
const partial = require('lodash.partial');
const unzip = require('lodash.unzip');
const stripAnsi = require('strip-ansi');
import range from 'python-range';

const validateBlueprint = util.promisify(drafter.validate)


const IGNORE_PATTERN = /(\s*\d+)\: ?(.*)/
const LINE_NO_SEP = ': '
const NEWLINE = /\r\n|\r|\n/;
const SEPARATOR = "-----------";


function lpad({padWith=' ', suffix=''} = {}, padSize, val) {
	return String(val).padStart(padSize, padWith) + suffix;
}

function getPosInfo(warning) {
		let sourcePositions = warning.attributes.sourceMap.content[0].content;
		let first = sourcePositions[0];
		let last = sourcePositions.slice(-1)[0];
		// sourcePosition objects contain a pair of values, so content[0]
		// is the start info and content[1] is the end info of a pos.
		// For some reason each sourcePosition selects a single line only
		// so there are multiple sourcePosition objects per warning 🤷‍♂️
		return {
			startLine: first.content[0].attributes.line.content - 1,
			startChar: first.content[0].attributes.column.content - 1,
			endLine: last.content[1].attributes.line.content - 1,
			endChar: last.content[1].attributes.column.content - 1,
		}
}

function parseIgnoreFile(ignoreFile) {
	if (!ignoreFile) {
		return [];
	};
	let rawBlocks = ignoreFile.split(SEPARATOR).filter(line => Boolean(line.replace(NEWLINE, '')));
	let ignores = new Map();
	rawBlocks.forEach(block => {
		let [head, ...lines] = block.split(NEWLINE).filter(line => Boolean(line));
		head in ignores || ignores.set(head, []);
		let linesInfo = lines.map(line => {
			line = escapeStringRegexp(line);
			let lineNo = null;
			let match = line.match(IGNORE_PATTERN);
			if (match) {
				line = `\\s*(\\d+)${LINE_NO_SEP}${match[2]}`;
				lineNo = parseInt(match[1]);
			} // else throw?
			return [line, lineNo];
		});
		let [patternLines, lineNos] = unzip(linesInfo);
		ignores.get(head).push({
			head: head,
			pattern: new RegExp(patternLines.join('\n'), 'm'),
			lineNos: lineNos,
		});
	});
	return ignores;
}

function formatWarning(lines, contextSize, posInfo) {
	let formatted = [];
	let formatLineNo = partial(lpad, {suffix: LINE_NO_SEP}, String(lines.length).length);
	for (let i of range(
		Math.max(0, posInfo.startLine - contextSize),
		Math.min(lines.length, posInfo.endLine + contextSize + 1)
	)) {
		let line = lines[i];
		if (i == posInfo.startLine) {
			// first highlighted line
			let pre = line.slice(0, posInfo.startChar);
			let post = line.slice(posInfo.startChar);
			formatted.push(
				chalk.yellow(formatLineNo(i)) + chalk.gray(pre) + post
			);
		} else if (i > posInfo.startLine && i < posInfo.endLine) {
			// fully highlighted line
			formatted.push(
				chalk.yellow(formatLineNo(i)) + line
			);
		} else if (i == posInfo.endLine) {
			// last highlighted line
			let pre = line.slice(0, posInfo.endChar);
			let post = line.slice(posInfo.endChar);
			formatted.push(
				chalk.yellow(formatLineNo(i)) + pre + chalk.gray(post)
			);
		} else {
			// pre/post 'context' lines
			formatted.push(
				chalk.yellow.dim(formatLineNo(i)) + chalk.gray(line)
			);
		}
	};
	return formatted;
}

function shouldIgnore(ignores, fuzzFactor, warning, posInfo, context) {
	let ignoreBlocks = ignores.get(warning.content);
	if (!ignoreBlocks) {
		return false;
	}
	return ignoreBlocks.some(block => {
		if (context.match(block.pattern)) {
			return range(
				block.lineNos[0] - fuzzFactor,
				block.lineNos[0] + fuzzFactor
			).includes(posInfo.startLine);
		} else {
			return false;
		}
	});
}

async function processWarnings(options, lines, warnings, filename) {
	console.log(chalk.red.bold(warnings.length + " linting issues found"));

	let ignoreFileName = filename + options.ignoreFileExt;
	console.log(
		'To ignore any of these instances, copy and paste the section (including ' +
		'separators) to the ignore file: ' + chalk.bold(ignoreFileName)
	)
	let ignoreFile = await fs.readFile(ignoreFileName, 'utf8').catch(err => {});
	let ignores = parseIgnoreFile(ignoreFile);

	let formatWarning_ = partial(formatWarning, lines, options.contextSize);
	let shouldIgnore_ = partial(shouldIgnore, ignores, options.fuzzFactor);
	let exitCode = 0;

	warnings.slice(0, 3).forEach((warning, warningIndex) => {
		console.log(SEPARATOR);
		console.log(chalk.red(warning.content));

		let posInfo = getPosInfo(warning);
		let formatted = formatWarning_(posInfo)
		let context = stripAnsi(formatted.join('\n'));

		if (shouldIgnore_(warning, posInfo, context)) {
			console.log(chalk.blueBright(
				'on lines ' + chalk.bold(`[${posInfo.startLine}...${posInfo.endLine}]`) +
				' ignored by ' + chalk.bold(ignoreFileName)
			));
			return; // continue
		}
		exitCode = 1;

		formatted.forEach(line => {
			console.log(line);
		});
	})
	console.log(SEPARATOR);
	return exitCode;
}

export async function lintFile(options, filename) {
	console.log(chalk.bold(filename));

	let blueprint = await fs.readFile(filename, 'utf8');
	let warnings = await validateBlueprint(blueprint, options.drafterOpts).catch(err => {
		// 🤔 I'm not sure how to cause an 'error'
		// (passing a non-apib file still gives a parseResult)
		console.log(chalk.red.bold("Error:"), err);
		process.exit(2);
  });

  let exitCode = 0;
  if (warnings) {
		// ⚠️
		if (warnings.element == 'parseResult') {
			// typical linting results
		  let lines = blueprint.split(NEWLINE);
			exitCode = await processWarnings(options, lines, warnings.content, filename);
		} else {
			// "should not happen"
  		console.log(chalk.red.bold("Error: unrecognised linter result"), warnings);
  		exitCode = 3;
		}
	} else {
		// 🎉
		console.log(chalk.green('OK'));
	};
	return exitCode;
}

/**
 * (main entrypoint)
 * Lint a set of files
 *
 * @param {Array<string>} files - Paths to the files to be linted
 * @param {Object} options - Config values for use in downstream methods
 * @returns {Array<number>} An 'exitCode' value for each file linted
 */
export async function lint(files, options) {
	let lintFile_ = partial(lintFile, options)
	return await Promise.all(files.map(lintFile_));
}
