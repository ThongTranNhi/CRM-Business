import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.turbo/**', '**/.wrangler/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // Cấm mã màu hex trong component: mọi màu đi qua token Tailwind (docs/ui-ux/colors.md)
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Không dùng mã màu hex. Dùng token Tailwind (primary, accent, info...).',
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Không dùng mã màu hex. Dùng token Tailwind (primary, accent, info...).',
        },
      ],
    },
  },
  {
    files: ['**/*.{js,ts}'],
    ignores: ['apps/web/**'],
    languageOptions: { globals: globals.node },
  },
);
