import gnome from 'eslint-config-gnome';
import globals from 'globals';

export default [
    {
        ignores: ['dist/'],
    },
    ...gnome.configs.recommended,
    {
        files: ['tests/**/*.mjs'],
        languageOptions: {
            globals: globals.node,
        },
    },
];
