// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Design-core guardrails (see src/theme/index.ts and src/components/ui/index.ts):
 * screens use shared controls, the motion hub and color roles, never raw ones.
 * Raw colors and sizes are caught by `npm run lint:theme`.
 */
const RAW_CONTROLS = {
  name: 'react-native',
  importNames: ['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'Switch', 'TextInput', 'Button'],
  message: 'Use Tappable, Button, Toggle or Field from @/components/ui.',
};
const MOTION_HUB = [
  { name: 'expo-haptics', message: 'Use motion.haptics from @/theme.' },
];
const PRIVATE_PALETTE = {
  group: ['@/theme/palette', './palette'],
  message: 'Name a role from colors (@/theme); only src/theme/colors.ts reads the palette.',
};
const RAW_TIMING = [
  {
    selector: "Property[key.name='duration'] > Literal[raw=/^\\d/]",
    message: 'Durations live in the motion hub (motion.duration in @/theme).',
  },
  {
    selector: "MemberExpression[object.name='Easing']",
    message: 'Easing curves live in the motion hub (motion.easing in @/theme).',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'tools/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', 'src/components/ui/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: [RAW_CONTROLS, ...MOTION_HUB], patterns: [PRIVATE_PALETTE] }],
      'no-restricted-syntax': ['error', ...RAW_TIMING],
    },
  },
]);
