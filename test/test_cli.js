import { assert } from "chai"

import { parseArgs, optionsFromArgs } from '../src/cli';


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
        args: {fuzzyLineRange: 8, ignoreCodes: ["W6", "W8"]},
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
        args: {fuzzyLineRange: 7, forceColor: true, ignoreCodes: []},
        expected: {
          fuzzFactor: 7,
          contextSize: 2,
          ignoreCodes: [],
          ignoreFileExt: '.apiblint',
          color: true,
          drafterOpts: {
            requireBlueprintName: true,
          },
        }
      },
      {
        args: {fuzzyLineRange: 7, noColor: true, ignoreCodes: []},
        expected: {
          fuzzFactor: 7,
          contextSize: 2,
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
});
