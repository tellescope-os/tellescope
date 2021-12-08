import React, { CSSProperties } from "react"
import { GestureResponderEvent } from "react-native"

import MuiCard from "@mui/material/Card"
import MuiPaper from "@mui/material/Paper"
import MuiTextField from "@mui/material/TextField"
import MuiButton from "@mui/material/Button"
import MuiTypography from "@mui/material/Typography"
import MuiCircularProgress from "@mui/material/CircularProgress"
import MuiLinearProgress from "@mui/material/LinearProgress"
import MuiIconButton from "@mui/material/IconButton"
import MuiTooltip from "@mui/material/Tooltip"

import { AutoComplete } from "./forms"
import { DEFAULT_ICON_SIZE  } from "./constants"

import SendIconMui from "@mui/icons-material/Send"
import NavigateBeforeIconMui from '@mui/icons-material/NavigateBefore';
import NavigateNextIconMui from '@mui/icons-material/NavigateNext';
import VideoIconMui from '@mui/icons-material/Videocam';

const Icon = ({ Component, size, ...props } : IconBuilderProps) => (
  <Component style={{ fontSize: size ?? DEFAULT_ICON_SIZE }}/>
)
export const SendIcon = (p : IconProps) => <Icon {...p} Component={SendIconMui}/>
export const NavigateBeforeIcon = (p : IconProps) => <Icon {...p} Component={NavigateBeforeIconMui}/>
export const NavigateNextIcon = (p : IconProps) => <Icon {...p} Component={NavigateNextIconMui}/>
export const VideoIcon = (p : IconProps) => <Icon {...p} Component={VideoIconMui}/>

export type Styled = {
  style?: CSSProperties,
}
export type CanFlex = {
  flex?: boolean,
}
export type Parent = {
  children: React.ReactNode,
}
export type Elevation = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type Elevated = {
  elevation?: Elevation,
}

type MuiColor = 'inherit'
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning'

const muiColors: { [K in MuiColor]: K } = {
  inherit: 'inherit',
  default: 'default',
  primary: 'primary',
  secondary: 'secondary',
  error: 'error',
  info: 'info',
  success: 'success',
  warning: 'warning',
}

const resolve_color = (c: string) => muiColors[c as MuiColor] 

export interface Clickable {
  onClick?: React.MouseEventHandler<HTMLElement> | ((e: GestureResponderEvent) => void);
  onPress?: React.MouseEventHandler<HTMLElement> | ((e: GestureResponderEvent) => void);
}
export interface ClickableWeb extends Clickable {
  onClick?: React.MouseEventHandler<HTMLElement>;
  onPress?: React.MouseEventHandler<HTMLElement>;
}
export interface ClickableNative extends Clickable {
  onClick?: ((e: GestureResponderEvent) => void);
  onPress?: ((e: GestureResponderEvent) => void);
}

export interface Changeable<T=string> {
  onChange?: (s: T) => void;
}

export interface CardProps extends Styled, Parent, Elevated, CanFlex {}
export const Card = ({ children, style, flex, ...props } : CardProps) => (
  <MuiCard {...props} style={{ ...flex ? { display: 'flex', flexGrow: 1 } : {}, ...style }}>{children}</MuiCard>
)

export interface PaperProps extends Styled, Parent, Elevated, CanFlex {}
export const Paper = ({ children, style, flex, ...props } : PaperProps) => (
  <MuiPaper {...props} style={{ ...flex ? { display: 'flex', flexGrow: 1 } : {}, ...style }}>{children}</MuiPaper>
)

export interface IconProps {
  size?: number,
  color?: MuiColor | string,
}
interface IconBuilderProps extends IconProps {
  Component: React.JSXElementConstructor<Styled>
}

export type IconButtonProps = {
  children: React.ReactNode;
  color?: MuiColor;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large'
  style?: any,
  id?: string,
} & Clickable
export const IconButton = ({ ...props }: IconButtonProps & ClickableWeb) => (
  <MuiIconButton { ...props} />
)

export interface BottomNavigationProps <T extends { [index: string]: any }>{
  initialPageIndex?: number, 
  routes: {
    key: keyof T & string,
    title: string, 
    icon: string,
    Component: React.JSXElementConstructor<any>//{ route?: any; jumpTo?: (key: T) => void; }>,
  }[]
}
export const BottomNavigation = <T,>(p: BottomNavigationProps<T>) => {
  throw new Error("Unimplemented") // todo: implement me
}

export type TextFieldProps = {
  // shared without modification
  value: string,
  id?: string,
  label?: string,
  disabled?: boolean,
  placeholder?: string,
  error?: boolean,
  helperText?: string,
  size?: 'small',

  // web only
  autoComplete?: AutoComplete

  // mixed
  variant?: 'filled' | 'outlined' | 'flat',
  type?: React.HTMLInputTypeAttribute,

  // native
  autoCapitalize?: 'none' | 'characters' | 'sentences' | 'words'
  autoCorrect?: boolean,
} & Changeable & Styled
export const TextField = ({ autoCapitalize, autoCorrect, variant, onChange, ...props }: TextFieldProps) => {
  return <MuiTextField 
    variant={ variant === 'flat' ? 'filled' : variant } 
    onChange={e => onChange?.(e.target.value)}
    {...props}
  />
}

export type ButtonProps = {
  color?: "primary" | "secondary",
  variant?: "text" | "contained" | "outlined",
  type?: 'button' | 'reset' | 'submit',
  fullWidth?: boolean,
  onClick?: () => void,
  onPress?: () => void,
  disabled?: boolean,
  children?: React.ReactNode,
  style?: any, // todo: universal style
}
export const Button = ({ children, onClick, onPress, ...props}: ButtonProps) => {
  return <MuiButton {...props} onClick={onClick ?? onPress}>{children}</MuiButton>
}

export type TypographyProps = {
  color?: 'primary' | 'secondary' | 'warning' | 'error'
  children?: React.ReactNode,
  style?: any, // todo: universal style
  component?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5',
} & Clickable
export const Typography = ({ children, onClick, onPress, component='span', ...props}: TypographyProps & ClickableWeb) => {
  return <MuiTypography onClick={onClick ?? onPress} component={component} {...props}>{children}</MuiTypography>
}

export type CircularProgressProps = {
  color?: 'primary' | 'secondary' | 'warning' | 'error',
  style?: any, // todo: universal style,
  size?: number,
}
export const CircularProgress = ({ ...props}: CircularProgressProps) => {
  return <MuiCircularProgress {...props}/>
}

export type LinearProgressProps = {
  color?: 'primary' | 'secondary' | 'warning' | 'error',
  style?: any, // todo: universal style,
  size?: number,
}
export const LinearProgress = ({ ...props}: LinearProgressProps) => {
  return <MuiLinearProgress {...props}/>
}

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

// with overridden default styles to better fit UI elements
export interface TooltipProps {
  label: React.ReactChild;
  placement?: TooltipPlacement;
  arrow?: boolean;
  open?: boolean;
  children: React.ReactElement;
  enterDelay?: number;
  enterNextDelay?: number,
}
export const Tooltip = ({ label, placement, arrow=true, open, children, enterDelay, enterNextDelay=enterDelay, ...props } : TooltipProps) => {
  return (
    <MuiTooltip title={label} placement={placement} arrow={arrow} open={open}
      enterDelay={enterDelay} enterNextDelay={enterNextDelay}
      style={{
        ...placement === 'top' ? { top: 5 } : {},
        ...placement === 'left' ? { left: 5 } : {},
        ...placement === 'bottom' ? { bottom: 5 } : {},
        ...placement === 'right' ? { right: 5 } : {},
      }}
      {...props}
    >
      {/* Wrap with div for hover to work properly */}
      <div>
        {children}
      </div>
    </MuiTooltip>
  )
}