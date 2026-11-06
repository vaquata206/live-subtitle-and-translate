import { base, boundaries } from '@lst/config/eslint';

export default [...base, boundaries({ forbid: ['@lst/db', '@lst/ui', '@lst/core', 'react', 'next'] })];
