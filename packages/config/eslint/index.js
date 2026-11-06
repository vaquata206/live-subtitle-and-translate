// Shared ESLint flat configs. Each workspace composes these in its own eslint.config.js.
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ignores = {
  ignores: [
    '**/dist/**',
    '**/.next/**',
    '**/node_modules/**',
    '**/storybook-static/**',
    '**/coverage/**',
    '**/next-env.d.ts',
  ],
};

export const base = tseslint.config(ignores, js.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
});

export const react = [
  ...base,
  jsxA11y.flatConfigs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
    languageOptions: { globals: globals.browser },
  },
];

export const browser = [...base, { languageOptions: { globals: { ...globals.browser, chrome: 'readonly' } } }];

export const node = [...base, { languageOptions: { globals: globals.node } }];

/**
 * Enforces the monorepo dependency rules:
 * - apps never import other apps;
 * - packages never import apps;
 * - browser/extension code never imports server-only packages (pass them in `forbid`).
 */
export function boundaries({ forbid = [] } = {}) {
  return {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', '@lst/extension', '@lst/web', '@lst/realtime', '@lst/worker'],
              message: 'Apps must not import other apps. Share code through packages/*.',
            },
            ...forbid.map((name) => ({
              group: [name, `${name}/*`],
              message: `${name} is not allowed in this workspace (see AGENTS.md → dependency rules).`,
            })),
          ],
        },
      ],
    },
  };
}
