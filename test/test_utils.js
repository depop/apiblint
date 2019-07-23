import { assert } from "chai"

import { lpad } from '../src/utils';


describe('utils', function() {
  describe('lpad', function() {

	  [
	    {args: ["20", 5], expected: "   20"},
	    {args: ["20", 3], expected: " 20"},
	    {args: ["20", 1], expected: "20"},
	  ].forEach(params => {
	    it(`should left-pad str, with whitespace and no suffix by default | ${JSON.stringify(params.args)}`, function() {
	    	const [val, length] = params.args;
	    	const result = lpad(val, length);
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
	    	const result = lpad(val, length, opts);
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
	    	const result = lpad(val, length, opts);
	      assert.equal(result, params.expected);
	    });
  	});

	});
});
