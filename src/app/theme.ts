import {
  ActionIcon,
  Badge,
  Button,
  Card,
  createTheme,
  Modal,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  Tabs,
  Textarea,
  TextInput,
  virtualColor,
  type MantineColorsTuple,
} from '@mantine/core';

const dark: MantineColorsTuple = [
  '#f5f5f5',
  '#8a8a8a',
  '#737373',
  '#5c5c5c',
  '#454545',
  '#1c1c1c',
  '#121212',
  '#0d0d0d',
  '#141414',
  '#0b0b0b',
];

const slate: MantineColorsTuple = [
  '#f5f7fb',
  '#e5e7eb',
  '#d1d5db',
  '#9ca3af',
  '#737373',
  '#52525b',
  '#454545',
  '#2b2b2b',
  '#1c1c1c',
  '#121212',
];

const accent: MantineColorsTuple = [
  '#f3ebff',
  '#e5d4ff',
  '#d1b0ff',
  '#bc8aff',
  '#aa68ff',
  '#9a4fff',
  '#8f3dff',
  '#7b2fe0',
  '#6828ba',
  '#4f1f8f',
];

export const theme = createTheme({
  colors: {
    dark,
    slate,
    accent,
    appSurface: virtualColor({
      dark: 'dark',
      light: 'gray',
      name: 'appSurface',
    }),
  },
  primaryColor: 'accent',
  primaryShade: { light: 6, dark: 5 },
  cursorType: 'pointer',
  defaultRadius: 'md',
  black: '#000000',
  white: '#ffffff',
  fontFamily:
    "var(--font-jetbrains-mono), 'Fira Code', 'Roboto Mono', monospace",
  fontFamilyMonospace:
    "var(--font-jetbrains-mono), 'Fira Code', 'Roboto Mono', monospace",
  headings: {
    fontFamily: "var(--font-montserrat), 'Inter', sans-serif",
    fontWeight: '700',
  },
  shadows: {
    xs: 'none',
    sm: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none',
  },
  components: {
    Paper: Paper.extend({
      defaultProps: {
        radius: 'xl',
        withBorder: true,
      },
    }),
    Card: Card.extend({
      defaultProps: {
        radius: 'xl',
        withBorder: true,
      },
    }),
    Badge: Badge.extend({
      defaultProps: {
        radius: 'xl',
        variant: 'light',
      },
    }),
    Button: Button.extend({
      defaultProps: {
        radius: 'xl',
      },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        radius: 'xl',
        variant: 'subtle',
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
    }),
    Textarea: Textarea.extend({
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
    }),
    PasswordInput: PasswordInput.extend({
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
    }),
    Select: Select.extend({
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
    }),
    NumberInput: NumberInput.extend({
      defaultProps: {
        radius: 'md',
        variant: 'filled',
      },
    }),
    Tabs: Tabs.extend({
      defaultProps: {
        radius: 'xl',
      },
    }),
    Modal: Modal.extend({
      styles: () => ({
        content: {
          overflow: 'hidden',
        },
      }),
    }),
  },
});
