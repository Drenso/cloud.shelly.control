import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.homeybuild'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mts'],
    ignores: ['node_modules', '.homeybuild'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      // Mark as warning to not block during dev work, and allow with description
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-ignore': 'allow-with-description',
        },
      ],
      semi: [2, 'always'],
    },
  },
);
