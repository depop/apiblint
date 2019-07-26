import { promises as fs } from 'fs';
import util from 'util';

import chalk from 'chalk';
import drafter from 'drafter';
import escapeStringRegexp from 'escape-string-regexp';
import partial from 'lodash.partial';
import partialRight from 'lodash.partialright';
import unzip from 'lodash.unzip';
import * as log from 'loglevel';
import range from 'python-range';

import { lpad, findBlueprints } from './utils';


const validateBlueprint = util.promisify(drafter.validate)


// exports for purpose of test mocking:
export { validateBlueprint };
export { promises as fs } from 'fs';
export * as log from 'loglevel';


const NEWLINE = /\r\n|\r|\n/;
const LINE_NO_SEP = '| ';
const LINE_HIGHLIGHT = '*';
const LINE_CONTEXTPAD = ' '.repeat(LINE_HIGHLIGHT.length);
const WARNING_CODE_PREFIX = 'W';
const WARNING_CODE_SEP = ':';
const WARNING_SEPARATOR = "";
const DOC_SEPARATOR = "\n---------\n";


/**
 * Parse an .apiblint ignore file returning details of warnings to be ignored.
 *
 * @param {string} ignoreFile - Content of an .apiblint ignore file
 * @returns {Map<string, Array<Object>>} Parsed representation of ignore file
 *    an map of arrays of position objects keyed by prefixed warning code
 */
export function parseIgnoreFile(ignoreFile) {
  let ignores = new Map();
  if (ignoreFile) {
    let lines = ignoreFile.split(NEWLINE).filter(line => Boolean(line));
    lines.forEach(line => {
      let [code, startLine, endLine] = line.split(":");
      ignores.has(code) || ignores.set(code, []);
      ignores.get(code).push({
        startLine: parseInt(startLine) - 1,
        endLine: parseInt(endLine) - 1,
      });
    });
  };
  return ignores;
}

/**
 * Take description of code-span for a particular warning and output the
 * affected lines with context. Used both for display to console and as a
 * for comparing with ignore file.
 *
 * @param {Array<string>} lines - The .apib source file as array of lines
 * @param {number} contextSize - How many lines ± of context to display around
 *    the lines highlighted by the warning code-span
 * @param {Object} warning - Parsed warning object from `parseWarning`
 * @returns {string} The formatted warning details
 */
export function formatWarning(lines, contextSize, warning) {
  let formatted = [];
  let formatLineNo = partialRight(lpad, String(lines.length).length, {suffix: LINE_NO_SEP});
  for (let i of range(
    Math.max(0, warning.startLine - contextSize),
    Math.min(lines.length, warning.endLine + contextSize + 1)
  )) {
    let line = lines[i];
    let lineNo = i + 1;
    if (i == warning.startLine) {
      // first highlighted line
      let pre = line.slice(0, warning.startChar);
      let post = line.slice(warning.startChar);
      formatted.push(
        chalk.yellow(LINE_HIGHLIGHT + formatLineNo(lineNo)) + chalk.gray(pre) + post
      );
    } else if (i > warning.startLine && i < warning.endLine) {
      // fully highlighted line
      formatted.push(
        chalk.yellow(LINE_HIGHLIGHT + formatLineNo(lineNo)) + line
      );
    } else if (i == warning.endLine) {
      // last highlighted line
      let pre = line.slice(0, warning.endChar);
      let post = line.slice(warning.endChar);
      formatted.push(
        chalk.yellow(LINE_HIGHLIGHT + formatLineNo(lineNo)) + pre + chalk.gray(post)
      );
    } else {
      // pre/post 'context' lines
      formatted.push(
        LINE_CONTEXTPAD + chalk.yellow.dim(formatLineNo(lineNo)) + chalk.gray(line)
      );
    }
  };
  return formatted;
}

/**
 * Take description of code-span for a particular warning and output the
 * affected lines with context. Used both for display to console and as a
 * for comparing with ignore file.
 *
 * @param {Array<string>} lines - The .apib source file as array of lines
 * @param {number} contextSize - How many lines ± of context to display around
 *    the lines highlighted by the warning code-span
 * @param {Object} warning - Parsed warning object from `parseWarning`
 * @returns {string} The formatted warning details
 */
export function formatWarningHeader(warning) {
  return [
    chalk.red(warning.description),
    chalk.blueBright(
      warning.code + WARNING_CODE_SEP +
      (warning.startLine + 1).toString() + WARNING_CODE_SEP +
      (warning.endLine + 1).toString()
    )
  ];
}

/**
 * Take linting results (from drafter.validate tool) and iterate over the
 * warnings, either presenting or ignoring them according to .apiblint file.
 *
 * @param {Map<string, Array<Object>>} ignores - Parsed representation of the
 *    .apiblint ignore file
 * @param {number} fuzzFactor - How many lines ± to fuzzy match ignore blocks
 * @param {Object} warning - Parsed warning object from `parseWarning`
 * @returns {boolean} whether to ignore this warning
 */
export function shouldIgnore(ignores, fuzzFactor, warning) {
  let ignorePositions = ignores.get(warning.code);
  if (!ignorePositions) {
    return false;
  }
  return ignorePositions.some(pos => {
    return (
      range(
        pos.startLine - fuzzFactor,
        pos.startLine + fuzzFactor + 1
      ).includes(warning.startLine)
      &&
      range(
        pos.endLine - fuzzFactor,
        pos.endLine + fuzzFactor + 1
      ).includes(warning.endLine)
    );
  });
}

/**
 * Extract useful information from the warning object from drafter parseResult.
 *
 * @param {Object} warning - A result from drafter.validate tool
 * @returns {Object} Start and end line/char positions (0-indexed) describing
 *    the code-span highlighted by the warning
 */
export function parseWarning(rawWarning) {
    let sourcePositions = rawWarning.attributes.sourceMap.content[0].content;
    let first = sourcePositions[0];
    let last = sourcePositions.slice(-1)[0];
    // sourcePosition objects contain a pair of values, so content[0]
    // is the start info and content[1] is the end info of a pos.
    // For some reason each sourcePosition selects a single line only
    // so there are multiple sourcePosition objects per warning 🤷‍♂️
    return {
      code: WARNING_CODE_PREFIX + rawWarning.attributes.code.content,
      description: rawWarning.content,
      startLine: first.content[0].attributes.line.content - 1,
      startChar: first.content[0].attributes.column.content - 1,
      endLine: last.content[1].attributes.line.content - 1,
      endChar: last.content[1].attributes.column.content - 1,
    }
}

/**
 * Take linting results (from drafter.validate tool) and iterate over the
 * warnings, either presenting or ignoring them according to .apiblint file.
 *
 * @param {Object} options - Config values for use in downstream methods
 * @param {Array<string>} lines - The .apib source file as array of lines
 * @param {Array<Object>} rawWarnings - Results from drafter.validate tool
 * @param {string} filename - Path to the .apib file being linted
 * @returns {number} An 'exitCode' value representing success or failure
 */
export async function processWarnings(options, lines, rawWarnings, filename) {
  log.info(chalk.red.bold(rawWarnings.length + " linting issues found"));

  let ignoreFileName = filename + options.ignoreFileExt;
  log.info(
    'To ignore any of these instances, copy and paste the blue\n' +
    '<code>:<startLine>:<endLine> error position specifier\n' +
    'into an ignore file at: ' + chalk.bold(ignoreFileName)
  )
  let ignoreFile = await fs.readFile(ignoreFileName, 'utf8').catch(err => {});
  let ignores = parseIgnoreFile(ignoreFile);

  let formatWarning_ = partial(formatWarning, lines, options.contextSize);
  let shouldIgnore_ = partial(shouldIgnore, ignores, options.fuzzFactor);

  let exitCode = 0;
  rawWarnings.forEach(rawWarning => {
    log.info(WARNING_SEPARATOR);

    // use module.exports so it can be mocked in tests :facepalm:
    let warning = module.exports.parseWarning(rawWarning);

    let headers = formatWarningHeader(warning);
    headers.forEach(line => {
      log.info(line);
    });

    if (shouldIgnore_(warning)) {
      log.info(chalk.yellow('ignored by .apiblint file'));
      return; // continue forEach
    }
    // not ignored
    exitCode = 1;

    formatWarning_(warning).forEach(line => {
      log.info(line);
    });
  })
  log.info(WARNING_SEPARATOR);
  return exitCode;
}

/**
 * Lint a single blueprint file
 *
 * @param {Object} options - Config values for use in downstream methods
 * @param {string} filename - Path to file to lint
 * @returns {number} An 'exitCode' value representing success or failure
 */
export async function lintFile(options, filename) {
  log.info(chalk.bold(filename));

  let blueprint = await fs.readFile(filename, 'utf8');
  let warnings = await validateBlueprint(blueprint, options.drafterOpts).catch(err => {
    // 🤔 I'm not sure how to cause an 'error'
    // (passing a non-apib file still gives a parseResult)
    log.info(chalk.red.bold("Error:"), err);
    return 2;
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
      log.info(chalk.red.bold("Error: unrecognised linter result"), warnings);
      exitCode = 3;
    }
  } else {
    // 🎉
    log.info(chalk.green('OK'));
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
export async function lint(paths, options) {
  let files = await findBlueprints(...paths);
  let lintFile_ = partial(lintFile, options);
  let exitCodes = [];
  for (let filename of files) {
    exitCodes.push(await lintFile_(filename));
    log.info(DOC_SEPARATOR);
  }
  return exitCodes;
}
