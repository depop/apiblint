# apiblint

Linter for `.apib` blueprint docs, can be run as a [pre-commit](https://https://pre-commit.com) hook.


Installation
------------

`apiblint` is a node.js script. It was built against node v12, therefore may not work on older versions.

It is intended to be used as a [pre-commit](https://https://pre-commit.com) hook. So first step is to install the pre-commit tool.

`pre-commit` uses [nodenv](https://github.com/nodenv/nodenv) to manage node.js versions, so second step is to install that tool.  If you are on macOS the easiest way is `brew install nodenv`.

If you already had `nodenv` installed you should `brew upgrade nodenv` to ensure you have the most recent versions of node available to install (pre-commit will install the requested version for you, as long as nodenv has it available).

