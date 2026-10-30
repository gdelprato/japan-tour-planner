.PHONY: setup run test test-integration lighthouse lint format check check-data clean

# Comandi standard del progetto (S07). `make setup` ricostruisce l'ambiente da zero.

setup:
	npm ci
	npx playwright install chromium
	@command -v pre-commit >/dev/null 2>&1 && pre-commit install || echo "pre-commit non installato: 'pip install pre-commit' per attivare i controlli sul commit"

run:
	@echo "App su http://localhost:8000 (Ctrl+C per fermare)"
	cd app && python3 -m http.server 8000

check-data:
	node scripts/check-data.mjs

test:
	node --test 'tests/unit/*.test.mjs'

test-integration:
	node --test 'tests/integration/*.test.mjs'

# Lighthouse mobile, 3 esecuzioni, soglie in configs/lighthouserc.json; rapporti in lighthouse-report/.
# Chrome: quello installato, oppure CHROME_PATH (negli ambienti cloud: /opt/pw-browsers/chromium-*/chrome-linux64/chrome)
lighthouse:
	npx lhci autorun --config=configs/lighthouserc.json

lint:
	npx eslint .
	npx prettier --check scripts tests configs eslint.config.js .github
	node scripts/check-data.mjs

format:
	npx prettier --write scripts tests configs eslint.config.js .github

check: lint test

clean:
	rm -rf node_modules test-results playwright-report .lighthouseci lighthouse-report
