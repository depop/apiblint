.PHONY: pypi tag test

tag:
	git tag $$(jq -r '.version' package.json)")
	git push --tags

test:
	npm test

release:
	$(MAKE) test
	$(MAKE) tag
