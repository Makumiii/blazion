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
    overrides: [
        {
            files: ['**/*.{ts,tsx}'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        {
            files: ['packages/web/src/**/*.{js,jsx,ts,tsx}'],
            rules: {
                // Base ESLint rule does not track JSX usage without react plugin.
                'no-unused-vars': 'off',
            },
        },
    ],
};
