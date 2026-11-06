import { browser, boundaries } from '@lst/config/eslint';

export default [
  ...browser,
  { ignores: ['public/pcm-worklet.js', 'scripts/**'] },
  // Server-only and web-only packages must never end up in the extension bundle.
  boundaries({ forbid: ['@lst/db', '@lst/ui', 'react', 'next'] }),
];
