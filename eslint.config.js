// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // admin/ (Vite web app) and backend/ (Supabase) are separate projects.
    ignores: ['dist/*', 'admin/**', 'backend/**'],
  },
]);
