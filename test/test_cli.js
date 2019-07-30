import { assert } from "chai"
import sinon from "sinon";

import { parseArgs, optionsFromArgs, main } from '../src/cli';

import * as cli from '../src/cli';
import * as linter from '../src/linter';


describe('cli', function() {
  describe('parseArgs', function() {
    [
      {
        argv: ["nodejs", "apiblint", "path\ whatever/file1", "file2"],
        expected: {
          files: ["path\ whatever/file1", "file2"],
          fuzzyLineRange: 5,
          ignoreCodes: [],
        }
      },
      {
        argv: ["nodejs", "apiblint", "path\ whatever/file1", "file2", "--ignore-codes", "W6", "W8"],
        expected: {
          files: ["path\ whatever/file1", "file2"],
          fuzzyLineRange: 5,
          ignoreCodes: ["W6", "W8"],
        }
      },
      {
        argv: ["nodejs", "apiblint", "--ignore-codes", "W6", "W8", "--", "path\ whatever/file1", "file2"],
        expected: {
          files: ["path\ whatever/file1", "file2"],
          fuzzyLineRange: 5,
          ignoreCodes: ["W6", "W8"],
        }
      },
      {
        argv: ["nodejs", "apiblint", "--fuzzy-line-range", "3", "path\ whatever/file1", "file2"],
        expected: {
          files: ["path\ whatever/file1", "file2"],
          fuzzyLineRange: 3,
          ignoreCodes: [],
        }
      },
      {
        argv: ["nodejs", "apiblint", "--fuzzy-line-range=13", "path\ whatever/file1", "file2"],
        expected: {
          files: ["path\ whatever/file1", "file2"],
          fuzzyLineRange: 13,
          ignoreCodes: [],
        }
      },
      {
        argv: ["nodejs", "apiblint", "path\ whatever/file1", "file2", "--fuzzy-line-range", "8"],
        expected: {
          files: ["path\ whatever/file1", "file2"],
          fuzzyLineRange: 8,
          ignoreCodes: [],
        }
      },
    ].forEach(params => {
      it(`return an args object with defaults | ${JSON.stringify(params.argv)}`, function() {
        const result = parseArgs(params.argv);
        assert.deepEqual(result.files, params.expected.files);
        assert.equal(result.fuzzyLineRange, params.expected.fuzzyLineRange);
        assert.deepEqual(result.ignoreCodes, params.expected.ignoreCodes);
      });
    });
  });

  describe('optionsFromArgs', function() {
    [
      {
        args: {fuzzyLineRange: 8, ignoreCodes: ["W6", "W8"], contextLines: 2},
        expected: {
          fuzzFactor: 8,
          contextSize: 2,
          ignoreCodes: ["W6", "W8"],
          ignoreFileExt: '.apiblint',
          color: null,
          drafterOpts: {
            requireBlueprintName: true,
          },
        }
      },
      {
        args: {fuzzyLineRange: 7, forceColor: true, ignoreCodes: [], contextLines: 3},
        expected: {
          fuzzFactor: 7,
          contextSize: 3,
          ignoreCodes: [],
          ignoreFileExt: '.apiblint',
          color: true,
          drafterOpts: {
            requireBlueprintName: true,
          },
        }
      },
      {
        args: {fuzzyLineRange: 7, noColor: true, ignoreCodes: [], contextLines: 1},
        expected: {
          fuzzFactor: 7,
          contextSize: 1,
          ignoreCodes: [],
          ignoreFileExt: '.apiblint',
          color: false,
          drafterOpts: {
            requireBlueprintName: true,
          },
        }
      },
    ].forEach(params => {
      it(`return an options object with defaults | ${JSON.stringify(params.args)}`, function() {
        const result = optionsFromArgs(params.args);
        assert.deepEqual(result, params.expected);
      });
    });
  });

  describe('main', function() {

    let exit_stub;
    let lint_stub;

    beforeEach(function() {
      exit_stub = sinon.stub(process, 'exit');
      lint_stub = sinon.stub(linter, "lint");
    });
    afterEach(function () {
      exit_stub.restore();
      lint_stub.restore();
    });

    [
      {
        _meta: 'all files green',
        results: new Map([
          ['dummy1.apib', {exitCode: 0}],
          ['dummy2.apib', {exitCode: 0}],
          ['dummy3.apib', {exitCode: 0}],
        ]),
        expected: 0
      },
      {
        _meta: 'one file reported linting issues',
        results: new Map([
          ['dummy1.apib', {exitCode: 0}],
          ['dummy2.apib', {exitCode: 1}],
          ['dummy3.apib', {exitCode: 0}],
        ]),
        expected: 1
      },
      {
        _meta: 'one file with linting issue, one file with higher error',
        results: new Map([
          ['dummy1.apib', {exitCode: 3}],
          ['dummy2.apib', {exitCode: 0}],
          ['dummy3.apib', {exitCode: 1}],
        ]),
        expected: 3
      },
    ].forEach(params => {
      it(`exits with highest exitCode returned from linting files | ${params._meta}`, async function() {
        lint_stub.resolves(params.results);
        await main([...params.results.keys()], {});
        sinon.assert.calledWith(exit_stub, params.expected);
      });
    });

  });
});
