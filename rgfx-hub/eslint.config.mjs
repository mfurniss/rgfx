import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript strict and stylistic type-checked rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Customize strict rules for practical use
  {
    rules: {
      // Allow numbers/booleans in template literals - they're auto-converted safely
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
      }],
      // Disable unified-signatures rule - it has a bug that causes crashes with certain TypeScript patterns
      // See: https://github.com/typescript-eslint/typescript-eslint/issues
      '@typescript-eslint/unified-signatures': 'off',
      // Detect unused variables and parameters (allow _ prefix for intentionally unused)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // Enforce const for variables that are never reassigned
      'prefer-const': 'error',
      // Require curly braces for all control statements
      curly: 'error',
      // Require blank line before control statements (if, for, while, etc.)
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try'] },
      ],
    },
  },

  // React recommended rules
  {
    files: ['**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // React Hooks rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // React Refresh rules (for Vite HMR)
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Import plugin rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Disable import/no-unresolved - TypeScript handles this
      'import/no-unresolved': 'off',
    },
  },

  // Stylistic rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@stylistic': stylistic,
    },
  },

  // Prettier compatibility (disables conflicting rules)
  prettier,

  // Test file overrides - relax strict rules for tests
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },

  // Global ignores - must be in a separate config object at the end
  {
    ignores: [
      '**/node_modules/**',
      '**/.vite/**',
      '**/out/**',
      '**/dist/**',
      'eslint.config.js',
      'eslint.config.mjs',
      '*.config.ts',
      'config/**/*.js', // User-editable mapper files (JavaScript, not TypeScript)
      'scripts/**/*.js', // Build scripts (Node.js scripts, not TypeScript)
    ],
  }
);
