module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  extends: [ 'eslint:recommended', 'google' ],
  env: {
    'browser': true,
    'es6': true,
  },
  rules: {
    'array-bracket-spacing': [ 'error', 'always', {
      'objectsInArrays': false,
      'arraysInArrays': false,
    }],
    'linebreak-style': 'off',
    'max-len': [ 'error', {
      code: 80,
      tabWidth: 2,
      ignoreUrls: true,
      ignorePattern: '^import|test|moduleFor',
    }],
    'object-curly-spacing': [ 'error', 'always' ],

    // google config overrides due to unavoidable ember issues
    'no-invalid-this': 'off',
    'prefer-rest-params': 'off',
  }
};
