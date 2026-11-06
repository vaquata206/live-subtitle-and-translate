import { react, boundaries } from '@lst/config/eslint';

export default [...react, { ignores: ['storybook-static/**'] }, boundaries({ forbid: ['@lst/db', 'next'] })];
