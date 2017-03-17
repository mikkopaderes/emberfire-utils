module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module'
  },
  extends: [ 'eslint:recommended', 'google' ],
  env: {
    'browser': true,
    'es6': true,
  },
  rules: {
    'array-bracket-spacing': [ 2, 'always' ],
    'linebreak-style': 0,
    'max-len': [2, {
      code: 80,
      tabWidth: 2,
      ignoreUrls: true,
      ignorePattern: '^(import|test|moduleFor)',
    }],
    'object-curly-spacing': [ 2, 'always' ],

    // google config overrides due to unavoidable ember issues
    'no-invalid-this': 0,
    'prefer-rest-params': 0,
  }
};
