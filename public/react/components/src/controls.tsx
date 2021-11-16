import React, { useEffect, useState } from 'react';

// import DefaultIcon from '@mui/icons-material/Info';

import {
  Tooltip,
  IconButton,
  CircularProgress,
  Styled,
  TooltipPlacement,
} from "./mui"

import {
  Flex,
} from "./layout"

interface LabeledIconButton_T {
  Icon: React.ElementType, 
  label: string, 
  id?: string, 
  ariaLabel?: string, 
  disabled?: boolean, 
  color?: "primary" | "secondary" | "inherit" | 'default' | 'white', 
  placement?: TooltipPlacement, 
  onClick?: (e:any) => void, 
  showArrow?: boolean, 
  padding?: number,
  className?: string,
  open?: boolean | undefined,
  size?: number | undefined,
  offsetX?: number,
  offsetY?: number,
  enterDelay?: number,
  enterNextDelay?: number,
}
export const LabeledIconButton = ({ 
  Icon=() => null, 
  label, 
  id = undefined, 
  ariaLabel = label, 
  disabled = false, 
  color="primary", 
  placement='top', 
  onClick=console.warn, 
  showArrow=true, 
  padding=5,
  open=undefined,
  size=30,
  offsetX=0,
  offsetY=0,
  enterDelay,
  enterNextDelay=enterDelay,
} : LabeledIconButton_T) => 
{
  const Button = (
    <IconButton color={color !== 'white' ? color : undefined} aria-label={label ?? ariaLabel} 
      style={{ 
        padding, maxHeight: size, maxWidth: size, position: "relative", top: offsetY, left: offsetX,
        ...(color === 'white' ? { color: disabled ? '#bdbdbd' : 'white' } : {})
      }}
      onClick={onClick} id={id} disabled={disabled}  
    >
      <Icon style={{ height: size, width: size }}/>
    </IconButton>
  )

  // don't include tooltip when disabled
  if (disabled) return Button

  return (
    <Tooltip label={label} placement={placement} arrow={showArrow} open={open} 
      enterDelay={enterDelay} enterNextDelay={enterNextDelay}>
      {Button}
    </Tooltip>
  ) 
}

const CircularProgressIcon = ({ style } : Styled) => <Flex style={style}><CircularProgress style={style}/></Flex>

interface AsyncAction <T>{
  action: () => Promise<T>,
  onSuccess: (v: T) => void,
  onError?: (e: any) => void,
  onChange?: (processing: boolean) => void;
}
export const AsyncIconButton = <T,>({ action, onSuccess, onError, onChange, Icon, ...props } : LabeledIconButton_T & AsyncAction<T>) => {
  const [performingAction, setPerformingAction] = useState(false)

  const handleClick = () => {
    setPerformingAction(true)
    onChange?.(true)

    action()
    .then(onSuccess)
    .catch(onError ?? console.error)
    .finally(() => { setPerformingAction(false); onChange?.(false) })
  }  

  return <LabeledIconButton {...props} disabled={props.disabled ?? performingAction} onClick={handleClick}
    Icon={performingAction ? CircularProgressIcon : Icon}
  />
}