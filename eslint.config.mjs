import js from '@eslint/js';
import cleanArchitecture from '@jfrz38/eslint-plugin-clean-architecture-highlighter';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      'clean-architecture-highlighter': cleanArchitecture,
    },
    rules: {
      'clean-architecture-highlighter/no-layer-violation': [
        'error',
        {
          sourceFolder: 'src',
        },
      ],
    },
  },
);
