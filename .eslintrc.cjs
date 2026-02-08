module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    ignorePatterns: ['dist', 'node_modules', '.next', '.turbo'],
    rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
};
