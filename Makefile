# OpenEvidence Selection Opener — build helpers
# `make build` runs the test suite, then writes the unpacked extension and a
# versioned zip into dist/. Load dist/extension via chrome://extensions
# (Developer mode → Load unpacked).

.PHONY: build test dist clean help

help:
	@echo "make build  - run tests, then build dist/extension + zip"
	@echo "make test   - run the test suite"
	@echo "make dist   - build dist without running tests"
	@echo "make clean  - remove dist/"

build: test dist

test:
	node scripts/run-tests.mjs

dist:
	node scripts/build-extension.mjs

clean:
	rm -rf dist
