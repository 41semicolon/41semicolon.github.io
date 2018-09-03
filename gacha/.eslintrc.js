module.exports = {
  extends: 'standard',
  rules: {
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
  },
  env: {
    node: true,
    jest: true,
  },
};
