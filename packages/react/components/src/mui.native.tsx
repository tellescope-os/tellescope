import * as React from 'react';
import { TouchableHighlight } from 'react-native';
import { 
  Avatar,
  ActivityIndicator as MuiCircularProgress,
  BottomNavigation as MuiBottomNavigation,
  Card as MuiCard,
  TextInput as MuiTextField,
  Button as MuiButton,
  Surface as MuiPaper,
  Text as MuiText,
  ProgressBar as MuiLinearProgress,
  // TouchableRipple,
  useTheme,
} from 'react-native-paper';
import transform, { StyleTuple } from 'css-to-react-native';

import {
  BottomNavigationProps,
  ButtonProps,
  CardProps,
  CircularProgressProps,
  ClickableNative,
  LinearProgressProps,
  IconProps,
  IconButtonProps,
  PaperProps,
  TextFieldProps,
  TooltipProps,
  TypographyProps,
} from "./mui.js"
import { DEFAULT_ICON_SIZE } from "./constants"

export const convert_CSS_to_RNStyles = (style?: React.CSSProperties) => {
  if (!style) return style

  const input: StyleTuple[] = []
  for (const k in style) {
    const styling = style[k as keyof typeof style]
    if (!styling) continue
    
    const smoothed = (typeof styling === 'number') && k !== 'opacity'
                   ? `${styling}px` // allow for plain number => pixel
                   : styling.toString()
    input.push([k, smoothed])
  }

  return transform(input)
}

export const SendIcon = (p : IconProps) => <Avatar.Icon size={p.size ?? DEFAULT_ICON_SIZE} icon="send"/>
export const NavigateBeforeIcon = (p : IconProps) => <Avatar.Icon size={p.size ?? DEFAULT_ICON_SIZE} icon="chevron-left"/>
export const NavigateNextIcon = (p : IconProps) => <Avatar.Icon size={p.size ?? DEFAULT_ICON_SIZE} icon="chevron-right"/>
export const VideoIcon = (p : IconProps) => <Avatar.Icon size={p.size ?? DEFAULT_ICON_SIZE} icon="video"/>
export const DownloadIcon = (p : IconProps) => <Avatar.Icon size={p.size ?? DEFAULT_ICON_SIZE} icon="download"/>

export const Card = ({ style, flex, children, ...props } : CardProps) => (
  <MuiCard style={{ ...flex ? { display: 'flex', flexGrow: 1 } : {}, ...convert_CSS_to_RNStyles(style)}} {...props}>
    {children}
  </MuiCard>
)
export const Paper = ({ style, flex, children, ...props } : PaperProps) => (
  <MuiPaper style={{ ...flex ? { display: 'flex', flexGrow: 1 } : {}, ...convert_CSS_to_RNStyles(style)}} {...props}>
    {children}
  </MuiPaper>
)

export const BottomNavigation = <T,>({ initialPageIndex, routes } : BottomNavigationProps<T>) => {
  const [index, setIndex] = React.useState(initialPageIndex ?? 0);
  const routing = {} as { [K in keyof T]: React.ComponentType<any>}
  for (const r of routes) {
    routing[r.key] = r.Component
  }

  return (
    <MuiBottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={MuiBottomNavigation.SceneMap(routing as any)}
    />
  );
};

export const TextField = ({ 
  autoComplete,
  autoCorrect=false,
  autoCapitalize="none",
  variant,
  onChange,
  type,
  error,
  helperText,
  style,
  size,
  ...props
}: TextFieldProps) => {
  const theme = useTheme()

  return (
    <>
      <MuiTextField 
        secureTextEntry={type === 'password'}
        autoCorrect={autoCorrect} 
        autoCapitalize={autoCapitalize}
        mode={variant === 'outlined' ? 'outlined' : 'flat'}
        onChangeText={onChange}
        error={error}
        style={{
          height: size === 'small' ? 40 : undefined,
          ...convert_CSS_to_RNStyles(style),
        }}
        autoComplete={undefined}
        { ...props }
      />
      {helperText 
        ? <Typography color={error ? 'error' : undefined}>
            {helperText}
          </Typography>
        : null
      }
    </>
  )
}

export const Button = ({ type, variant, children, color, style, onClick, onPress, ...props }: ButtonProps) => (
  <MuiButton { ...props }
    onPress={onPress ?? onClick}
    mode={variant} 
    color={color?.startsWith('#') ? color: ''}
    style={convert_CSS_to_RNStyles(style)}
  >
    {children}
  </MuiButton>
)

export const IconButton = ({ children, color, style, onClick, onPress, disabled, ...props }: IconButtonProps & ClickableNative) => (
  <TouchableHighlight onPress={onPress ?? onClick} disabled={disabled}>
    {children}
  </TouchableHighlight>
)
 
export const Typography = ({ children, onClick, onPress, color, style, ...props }: TypographyProps & ClickableNative) => {
  const colorStyle = { color: color ? useTheme().colors[color] : undefined }

  return (
    <MuiText onPress={onPress ?? onClick} style={{ ...colorStyle, ...convert_CSS_to_RNStyles(style) }}>
      {children}
    </MuiText>
  )
}

export const CircularProgress = ({ style, ...props }: CircularProgressProps) => (
  <MuiCircularProgress {...props} style={convert_CSS_to_RNStyles(style)} />
)

export const LinearProgress = ({ style, ...props }: LinearProgressProps) => (
  <MuiLinearProgress { ...props }  indeterminate={true}
    style={convert_CSS_to_RNStyles(style)}
  /> 
)

// nop 
export const Tooltip = ({ children, ...props }: TooltipProps) => children
