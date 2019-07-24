# apiblint

Linter for `.apib` blueprint docs, can be run as a [pre-commit](https://pre-commit.com#install) hook.


## Installation

### Pre-requisites

`apiblint` is a node.js script. It was built against node v12, therefore may not work on older versions.

It is intended to be used as a [pre-commit](https://pre-commit.com#install) hook. So first step is to install the pre-commit tool.

`pre-commit` uses [nodenv](https://github.com/nodenv/nodenv) to manage node.js versions, so second step is to install that tool.  If you are on macOS the easiest way is `brew install nodenv`.

If you already had `nodenv` installed you should `brew upgrade nodenv` to ensure you have the most recent versions of node available to install (pre-commit will install the requested version for you, as long as nodenv has it available).

### Configuration

`pre-commit` asks you to add a `.pre-commit-config.yaml` file in the root of the project where you want the hook to run.

An example config for `apiblint` is below:

```yaml
repos:
  - repo: https://github.com/depop/apiblint
    rev: 0.1.0
    hooks:
    - id: apiblint
      args:
        - --force-color
```

(due to the way hooks are run, without `--force-color` we will be unable to correctly determine [if colors are supported](https://github.com/pre-commit/pre-commit/issues/1100) in your terminal, so although colored output is the default we need this arg to actually get it... colored output is nice, use this arg)

### Stand-alone installation

You're on your own for now; set up a node 12 environment with `nodenv`, download the source from GitHub and `npm install <path/to/source dir>`. The tool will be installed to your local bin path.


## Usage

The pre-commit hook is configured to run `apiblint` on any `*.apib` files modified in your current commit.

You can of course run the tool stand-alone as well.

Simply:

```bash
apiblint path/to/a/blueprint.apib path/to/another/blueprint.apib
```

You will either see `OK` with exit code `0`, or you will have a non-zero exit code and output like:

```
path/to/a/blueprint.apib
1 linting issues found
To ignore any of these instances, copy and paste the blue
<code>:<startLine>:<endLine> error position specifier
into an ignore file at: path/to/a/blueprint.apib.apiblint

no value(s) specified
W6:672:672
 670|
 671| ## Variant
*672| - id: (number) - canonical id (in conjunction with variantset id) for all languages of a particular variant
 673| - variantset_id: 234 (number) - localised id of parent VariantSet, based on Accept-Language header
 674| + variantset_id_l10n
 ```

We can see here the file had 1 linting issue. The text of the warning is `no value(s) specified` and below are highlighted the relevant line(s) from the source code.

Generally at this point you should fix the issue identified, `git add` your changes and try to commit again.

In some rare cases there are warnings which we want to ignore; some idioms are not well supported by blueprint syntax and the 'invalid' docs may convey useful information and still render fine in Apairy, for example.

Unfortunately API Blueprint format does not support any kind of inline comment syntax, so we have to specify our 'ignores' in a separate file. The tool expects to find this file alongside the bluprint, named as:  
`<blueprint file>.apiblint`

From the example above, if you wanted to ignore this particular warning (you shouldn't - this one is easily fixed!) you would add a line:

```
W6:672:672
```

...to a file `path/to/a/blueprint.apib.apiblint`.

This tells `apiblint` to ignore warning code `W6` spanning lines `672` to `672`.

The drawback of having a separate ignore file is the line numbers will often have to be updated when you change the document content. `apiblint` will help you here if you have it as a pre-commit hook, since you won't be able to commit the change until you update the ignore file.

To ease this a little bit, by default `apiblint` does a 'fuzzy match' on the line number, to within ± a small range (default `5` lines).  You can configure this via the `--fuzzy-line-range` arg.


## Development

To run the test suite: `npm test` from within the project source root.

The test framework is [Mocha](https://mochajs.org/). Mocha seems to be built against an older version of JS and requires the `.babelrc` config file with some plugins for it to work with this project. I guess this is normal JS stuff.

CI is currently CircleCI, see `.circleci/config.yml`.

### Releasing

`pre-commit` installs the tool directly from GitHub and needs a tag as a target. So, for now, making a release is just pushing a git tag. The `package.json` file also has a version number which would be used if we were to push the tool to `npm`.
