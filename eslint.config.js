import { builtinModules } from 'node:module';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const nodeModules = [...new Set(builtinModules.flatMap((name) => [name, `node:${name}`]))];

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'packages/{contracts,core}/src/**/*.ts'],
    languageOptions: {
      globals: {
        ...Object.fromEntries(Object.keys(globals.node).map((name) => [name, 'off'])),
        ...globals.browser,
      },
    },
    rules: {
      'no-restricted-imports': ['error', {
        paths: nodeModules,
        patterns: ['node:*', '@orbiguild/runner', '@orbiguild/runner/*'],
      }],
      'no-restricted-globals': ['error', 'process', 'Buffer', 'require', '__dirname', '__filename'],
    },
  },
];
