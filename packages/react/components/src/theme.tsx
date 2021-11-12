import React from "react"
import { createTheme, ThemeProvider } from "@mui/material/styles"

import {
  PRIMARY_HEX,
  SECONDARY_HEX,
  ERROR_HEX,
  WARNING_HEX,
} from "@tellescope/constants"

export interface Theme {
  primary?: string,
  secondary?: string,
  error?: string,
  warning?: string,
}

export interface ThemeProvider {
  children: React.ReactNode;
  theme?: Theme,
}

const build_web_theme = (theme={} as Theme) => createTheme({
  palette: {
    primary: {
      main: theme.primary ?? PRIMARY_HEX,
    },
    secondary: {
      main: theme.secondary ?? SECONDARY_HEX,
    },
    error: {
      main: theme.error ?? ERROR_HEX,
    },
    warning: {
      main: theme.warning ?? WARNING_HEX,
    }
  },
})

export const WithTheme = ({ children, theme }: ThemeProvider) => {
  return (
    <ThemeProvider theme={build_web_theme(theme)}>
      {children}
    </ThemeProvider>
  )
}
