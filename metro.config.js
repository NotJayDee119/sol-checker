const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// admin/ is a separate Vite web app (with its own node_modules); keep Metro out of it.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const adminDir = escapeRegExp(path.join(__dirname, 'admin')).replace(/\\\\|\//g, '[\\\\/]');
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${adminDir}[\\\\/].*`),
];

module.exports = withNativeWind(config, { input: './src/global.css' });
