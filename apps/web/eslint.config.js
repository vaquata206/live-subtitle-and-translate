import nextPlugin from '@next/eslint-plugin-next';
import { react, boundaries } from '@lst/config/eslint';

export default [
  ...react,
  { ignores: ['.next/**', 'next-env.d.ts'] },
  {
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules, ...nextPlugin.configs['core-web-vitals'].rules },
  },
  boundaries(),
];
