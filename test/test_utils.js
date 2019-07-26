import path from 'path';

import { assert } from "chai";

import * as utils from '../src/utils';


const CWD = process.cwd();


describe('utils', function() {

  describe('lpad', function() {
    [
      {args: ["20", 5], expected: "   20"},
      {args: ["20", 3], expected: " 20"},
      {args: ["20", 1], expected: "20"},
    ].forEach(params => {
      it(`should left-pad str, with whitespace and no suffix by default | ${JSON.stringify(params.args)}`, function() {
        const [val, length] = params.args;
        const result = utils.lpad(val, length);
        assert.equal(result, params.expected);
      });
    });

    [
      {args: ["20", 5, {suffix: ": "}], expected: "   20: "},
      {args: ["20", 3, {suffix: ": "}], expected: " 20: "},
      {args: ["20", 1, {suffix: ": "}], expected: "20: "},
    ].forEach(params => {
      it(`should append suffix if given | ${JSON.stringify(params.args)}`, function() {
        const [val, length, opts] = params.args;
        const result = utils.lpad(val, length, opts);
        assert.equal(result, params.expected);
      });
    });

    [
      {args: ["20", 5, {padWith: "."}], expected: "...20"},
      {args: ["20", 3, {padWith: "*"}], expected: "*20"},
      {args: ["20", 1, {padWith: "_"}], expected: "20"},
    ].forEach(params => {
      it(`should pad with padWidth if given | ${JSON.stringify(params.args)}`, function() {
        const [val, length, opts] = params.args;
        const result = utils.lpad(val, length, opts);
        assert.equal(result, params.expected);
      });
    });
  });

  describe('findBlueprintsInPath', function() {
    it('should find all .apib files in dir tree', async function() {
      const result = await utils.findBlueprintsInPath('test/fixtures/testdir');
      const expected = [
        path.join(CWD, 'test/fixtures/testdir/doc1.apib'),
        path.join(CWD, 'test/fixtures/testdir/inner1/doc2.apib'),
        path.join(CWD, 'test/fixtures/testdir/inner2/doc3.apib'),
      ];
      assert.deepEqual(result.sort(), expected.sort());
    });

    [
      {
        _meta: "path is .apib file",
        path: 'test/fixtures/testdir/doc1.apib',
        expected: [path.join(CWD, 'test/fixtures/testdir/doc1.apib')]
      },
      {
        _meta: "path is a non-apib file",
        path: 'test/fixtures/testdir/otherfile1.txt',
        expected: []
      },
      {
        _meta: "path does not exist",
        path: 'test/fixtures/testdir/does-not-exist',
        expected: undefined
      },
    ].forEach(params => {
      it(`should handle being passed a file path rather than dir | ${params._meta}`, async function() {
        const result = await utils.findBlueprintsInPath(params.path).catch(err => {});
        assert.deepEqual(result, params.expected);
      });
    });
  });


  describe('findBlueprints', function() {
    [
      {
        _meta: "single path passed",
        paths: [
          'test/fixtures/testdir/inner1',
        ],
        expected: [
          path.join(CWD, '/test/fixtures/testdir/inner1/doc2.apib'),
        ]
      },
      {
        _meta: "multiple paths passed",
        paths: [
          'test/fixtures/testdir/inner1',
          'test/fixtures/testdir/inner2',
        ],
        expected: [
          path.join(CWD, '/test/fixtures/testdir/inner1/doc2.apib'),
          path.join(CWD, '/test/fixtures/testdir/inner2/doc3.apib'),
        ]
      },
    ].forEach(params => {
      it(`should find all .apib files in all passed dir trees | ${params._meta}`, async function() {
        const result = await utils.findBlueprints(...params.paths);
        assert.deepEqual(result.sort(), params.expected.sort());
      });
    });
  });

});
