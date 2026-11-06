export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      [
        'extension',
        'web',
        'realtime',
        'worker',
        'core',
        'protocol',
        'entitlements',
        'db',
        'ui',
        'config',
        'infra',
        'ci',
        'deps',
        'agents',
        'docs',
      ],
    ],
  },
};
