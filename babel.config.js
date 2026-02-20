module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    ['nativewind/babel', { jsxImportSource: 'nativewind' }] // NativeWind is now a preset
  ],
  plugins: [
    'react-native-worklets/plugin', // Reanimated/Worklets must always be last
  ],
};