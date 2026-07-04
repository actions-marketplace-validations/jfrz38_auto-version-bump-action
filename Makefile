.DEFAULT_GOAL := help

PNPM ?= pnpm

.PHONY: help
help: ## show make targets
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\n",sprintf("\n%22c"," "), $$2);printf " \033[36m%-20s\033[0m  %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: install
install: ## install dependencies from pnpm-lock.yaml
	$(PNPM) install --frozen-lockfile

.PHONY: build
build: ## build the bundled GitHub Action into dist/index.js
	$(PNPM) run build

.PHONY: lint
lint: ## run ESLint
	$(PNPM) run lint

.PHONY: test
test: ## run unit tests
	$(PNPM) test

.PHONY: typecheck
typecheck: ## run TypeScript type checks
	$(PNPM) run typecheck

.PHONY: package
package: ## build the distributable action package
	$(PNPM) run package

.PHONY: validate
validate: ## run lint, typecheck, tests, and build
	$(PNPM) run validate

.PHONY: check
check: validate ## run all local checks used before release

.PHONY: dist-check
dist-check: build ## verify dist/index.js is up to date after build
	@git diff --exit-code -- dist/index.js || (echo "::error::dist/index.js is out of date. Run 'make build' and commit the updated bundle." && exit 1)

.PHONY: ci
ci: install check dist-check ## run the release workflow checks locally
