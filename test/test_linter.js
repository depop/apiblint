import { promises as fs } from 'fs'

import { assert } from "chai"
import sinon from "sinon";
import YAML from 'yaml'

import * as linter from '../src/linter';


async function loadYAMLFixture(path) {
  let contents = await fs.readFile(path, 'utf8');
  return YAML.parse(contents);
}

function getWarnings(parseResult) {
  return parseResult.content.filter(item => item.element == "annotation");
}


describe('linter', function() {

  before(async function() {
    this.warnings = getWarnings(await loadYAMLFixture('test/fixtures/validate_result.yaml'));
  });

  describe('parseWarning', function() {
    [
      {
        _meta: "2 lines in sourceMap",
        index: 0,
        expected: {
          code: "W10",
          description: "headers is expected to be a pre-formatted code block, separate it by a newline and indent every of its line by 12 spaces or 3 tabs",
          startLine: 20,
          startChar: 6,
          endLine: 21,
          endChar: 74,
        }
      },
      {
        _meta: "1 line in sourceMap",
        index: 11,
        expected: {
          code: "W6",
          description: "no value(s) specified",
          startLine: 126,
          startChar: 6,
          endLine: 126,
          endChar: 37,
        }
      },
      {
        _meta: "3 lines in sourceMap",
        index: 36,
        expected: {
          code: "W4",
          description: "duplicit value in enumeration",
          startLine: 397,
          startChar: 2,
          endLine: 400,
          endChar: 17,
        }
      },
    ].forEach(params => {
      it(`returns an warning object with data from the parseResult | warnings[${params.index}] (${params._meta})`, function() {
        const warning = this.warnings[params.index];
        const result = linter.parseWarning(warning);
        assert.deepEqual(result, params.expected);
      });
    });
  });

  describe('parseIgnoreFile', function() {
    [
      {
        _meta: "empty ignore file",
        ignoreFile: (
`

`
        ),
        expected: new Map()
      },
      {
        _meta: "ignore file with leading and trailing blank lines, contains ignore codes",
        ignoreFile: (
`
W10:34:35
W6:45:45
W10:71:73
`
        ),
        expected: new Map([
          ['W10', [
            {startLine: 34, endLine: 35},
            {startLine: 71, endLine: 73},
          ]],
          ['W6', [
            {startLine: 45, endLine: 45},
          ]]
        ])
      },
      {
        _meta: "ignore file with blank lines inbetween ignore code lines",
        ignoreFile: (
`
W10:34:35

W6:45:45


W10:71:73
`
        ),
        expected: new Map([
          ['W10', [
            {startLine: 34, endLine: 35},
            {startLine: 71, endLine: 73},
          ]],
          ['W6', [
            {startLine: 45, endLine: 45},
          ]]
        ])
      },
    ].forEach(params => {
      it(`returns an ignores map with lists of positions keyed by W code | ${params._meta}`, function() {
        const result = linter.parseIgnoreFile(params.ignoreFile);
        assert.deepEqual(result, params.expected);
      });
    });
  });

  describe('shouldIgnore', function() {
    [
      {
        _meta: "exact match",
        ignores: new Map([
          ['W10', [{startLine: 36, endLine: 37}]],
        ]),
        fuzzFactor: 0,
        warning: {
          code: "W10",
          description: "headers is expected to be a pre-formatted code block, separate it by a newline and indent every of its line by 12 spaces or 3 tabs",
          startLine: 36,
          startChar: 6,
          endLine: 37,
          endChar: 74,
        },
        expected: true
      },
      {
        _meta: "matched within fuzzFactor range",
        ignores: new Map([
          ['W10', [{startLine: 33, endLine: 34}]],
        ]),
        fuzzFactor: 4,
        warning: {
          code: "W10",
          description: "headers is expected to be a pre-formatted code block, separate it by a newline and indent every of its line by 12 spaces or 3 tabs",
          startLine: 36,
          startChar: 6,
          endLine: 37,
          endChar: 74,
        },
        expected: true
      },
      {
        _meta: "ignore code would match but positions are outside fuzzFactor range",
        ignores: new Map([
          ['W10', [{startLine: 30, endLine: 31}]],
        ]),
        fuzzFactor: 4,
        warning: {
          code: "W10",
          description: "headers is expected to be a pre-formatted code block, separate it by a newline and indent every of its line by 12 spaces or 3 tabs",
          startLine: 36,
          startChar: 6,
          endLine: 37,
          endChar: 74,
        },
        expected: false
      },
    ].forEach(params => {
      it(`ignores matching lines within fuzzFactor | ${params._meta}`, function() {
        const result = linter.shouldIgnore(params.ignores, params.fuzzFactor, params.warning);
        assert.equal(result, params.expected);
      });
    });
  });

  describe('processWarnings', function() {

    let log_spy;
    let fs_stub;
    let parseWarning_stub;

    before(async function() {
      this.options = {
        ignoreFileExt: '.apiblint',
        fuzzFactor: 5,
        contextSize: 2,
      };
    });

    beforeEach(function() {
      log_spy = sinon.spy(linter.log, "info");
      fs_stub = sinon.stub(fs, "readFile");
      parseWarning_stub = sinon.stub(linter, "parseWarning");
    });
    afterEach(function () {
      log_spy.restore();
      fs_stub.restore();
      parseWarning_stub.restore();
    });

    [
      {
        _meta: "no warnings",
        warnings: [],
        readIgnoreFile: Promise.reject(), // not found
        expected: 0
      },
      {
        _meta: "warnings found but all ignored",
        warnings: [
          {
            code: "W10",
            description: "blah",
            startLine: 36,
            startChar: 6,
            endLine: 37,
            endChar: 74,
          }
        ],
        readIgnoreFile: Promise.resolve(`
W10:36:37
`),
        expected: 0
      },
      {
        _meta: "warnings found and not all ignored",
        warnings: [
          {
            code: "W10",
            description: "blah",
            startLine: 36,
            startChar: 6,
            endLine: 37,
            endChar: 74,
          }
        ],
        readIgnoreFile: Promise.resolve(``),
        expected: 1
      },
    ].forEach(params => {
      it(`will report all (and only) non-ignored warnings, returning non-zero exitCode if warnings reported | ${params._meta}`, async function() {

        fs_stub.withArgs("dummy.apib.apiblint").returns(params.readIgnoreFile);

        params.warnings.forEach((warning, i) => {
          parseWarning_stub.onCall(i).returns(warning);
        })
        // `parseWarning` return is mocked so we just feed placeholder objects to it as input
        let rawWarnings = params.warnings.map(_ => new Object());

        const result = await linter.processWarnings(this.options, [], rawWarnings, "dummy.apib");
        assert.equal(result, params.expected);
      });
    });

  });

});
