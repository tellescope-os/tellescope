import React from "react"
import { createTheme, ThemeProvider } from "@mui/material/styles"

import {
  PRIMARY_HEX,
  SECONDARY_HEX,
  ERROR_HEX,
  WARNING_HEX,
} from "@tellescope/constants"

declare module '@mui/material/styles' {
  interface Theme {
    extensionExample: {
      danger: string;
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    extensionExample?: {
      danger?: string;
    };
  }
}

const defaultTheme = createTheme({
  extensionExample: {
    danger: "#ff0000",
  },
  palette: {
    primary: {
      main: "#PRIMARY_HEX",
      light: `${PRIMARY_HEX}33`,
      contrastText: "#ffffff",
    },
    secondary: {
      main: SECONDARY_HEX,
      light: `${SECONDARY_HEX}33`,
      contrastText: "#ffffff",
    },
    error: {
      main: ERROR_HEX,
    },
    warning: {
      main: WARNING_HEX,
    }
  },
})


export const WithTheme = (props: { children: React.ReactNode, themeOptions?: Parameters<typeof createTheme>[0] }) => {
  return (
    <ThemeProvider theme={props.themeOptions ? createTheme(props.themeOptions) : defaultTheme}>
      {props.children}
    </ThemeProvider>
  )
}

