import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['app/js/d3.v7.min.js', 'node_modules/**', 'test-results/**'] },
  js.configs.recommended,
  {
    // Script classici dell'app (dash-shim.js): globali nel browser
    files: ['app/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, d3: 'readonly', dash: 'readonly' },
    },
    // lo stile esistente usa `catch (e)` e parametri posizionali non usati: ammessi finché il motore non viene estratto
    rules: { 'no-unused-vars': ['error', { caughtErrors: 'none', args: 'none' }] },
  },
  {
    // Moduli ES nel browser: interfaccia e motore (ADR-006)
    files: ['app/js/app.js', 'app/js/engine/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
  {
    // Il motore è puro: niente DOM, niente d3, niente globali del browser
    files: ['app/js/engine/**/*.js'],
    languageOptions: { globals: { Intl: 'readonly' } },
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'd3', 'dash', 'navigator', 'location'],
    },
  },
  {
    files: ['app/sw.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: globals.serviceworker },
    rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] },
  },
  {
    // Script e test: Node 22, moduli ES
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
  },
  {
    // il codice passato a page.evaluate() gira nel browser
    files: ['tests/integration/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
