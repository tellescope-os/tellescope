import React from "react";
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';

import {
  PRIMARY_HEX,
  SECONDARY_HEX,
  ERROR_HEX,
  WARNING_HEX,
} from "@tellescope/constants"

import {
  Theme,
  ThemeProvider,
} from './theme'

type DefaultTheme_T = typeof DefaultTheme
type DefaultThemeColors_T = typeof DefaultTheme.colors

declare module "react-native-paper" {
  interface Theme extends DefaultTheme_T  {
    error: string;
  }
}

declare global {
  namespace ReactNativePaper {
    interface ThemeColors extends DefaultThemeColors_T {
      error: string;
      warning: string;
      secondary: string;
    }
  }
}

const build_native_theme = (theme={} as Theme) => ({
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.primary ?? PRIMARY_HEX,
    accent: theme.secondary ?? SECONDARY_HEX, // 'accent' is secondary in react-native-paper
    secondary: theme.secondary ?? SECONDARY_HEX, // keep secondary for accessing via string type 'secondary'
    error: theme.error ?? ERROR_HEX,
    warning: theme.warning ?? WARNING_HEX,
  }
})

export const WithTheme = ({ children, theme }: ThemeProvider) => {
  return (
    <PaperProvider theme={build_native_theme(theme)}>
      {children}
    </PaperProvider>
  )
}