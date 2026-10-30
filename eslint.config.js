import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['app/js/d3.v7.min.js', 'node_modules/**', 'test-results/**'] },
  js.configs.recommended,
  {
    // Codice dell'app: script globali nel browser (nessun modulo finché il motore non viene estratto)
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
