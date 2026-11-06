import { base, boundaries } from '@lst/config/eslint';

// Shared by browsers and servers: no app code, no server-only or UI packages.
export default [...base, boundaries({ forbid: ['@lst/db', '@lst/ui', 'react', 'next'] })];
