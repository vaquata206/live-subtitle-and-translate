import { node, boundaries } from '@lst/config/eslint';

export default [...node, boundaries({ forbid: ['@lst/ui', 'react', 'next'] })];
