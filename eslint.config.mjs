import eslint from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.venv/**',
      '**/*.d.ts',
      '**/*.generated.ts',
      '.turbo/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      eqeqeq: ['error', 'always', {null: 'ignore'}],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Repo tooling run directly by node: not part of any package's build, so it has no
    // tsconfig lib to declare its environment.
    files: ['scripts/**/*.mjs'],
    languageOptions: {globals: globals.node},
  },
  {
    files: ['apps/client/**/*.{ts,tsx}', 'packages/shell-catalog/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],
    },
  },
);
