import React, { useEffect, useState } from 'react';

// import DefaultIcon from '@mui/icons-material/Info';

import {
  Button,
  ButtonProps,
  Tooltip,
  IconButton,
  CircularProgress,
  Styled,
  TooltipPlacement,

  DownloadIcon,
  Modal,
} from "./mui"

import {
  Flex,
} from "./layout"
import { Session, EnduserSession } from '@tellescope/sdk';

export interface LabeledIconButtonProps {
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
  enterDelay=0,
  enterNextDelay=enterDelay,
  style,
} : LabeledIconButtonProps & Styled) => 
{
  const positionStyle: React.CSSProperties = {
    position: "relative", top: offsetY, left: offsetX,
  }

  const Button = (
    <IconButton color={color !== 'white' ? color : undefined} aria-label={label ?? ariaLabel} 
      style={{ 
        padding, 
        ...disabled ? positionStyle : {},
        ...(color === 'white' ? { color: disabled ? '#bdbdbd' : 'white' } : {}),
        ...style,
      }}
      onClick={onClick} id={id} disabled={disabled}  
    >
      <Icon size={size}/>
    </IconButton>
  )

  // don't include tooltip when disabled
  if (disabled) return Button

  return (
    <Tooltip label={label} placement={placement} arrow={showArrow} open={open} 
      enterDelay={enterDelay} enterNextDelay={enterNextDelay}
      style={positionStyle}
    >
      {Button}
    </Tooltip>
  ) 
}

const CircularProgressIcon = ({ style } : Styled) => <Flex style={style}><CircularProgress style={style}/></Flex>

interface AsyncAction <T=any>{
  action: () => Promise<T>,
  staysMounted?: boolean,
  onSuccess?: (v: T) => void,
  onError?: (e: any) => void,
  onChange?: (processing: boolean) => void;
}
export const useAsyncAction = <T,>({ action, staysMounted=true, onSuccess, onError, onChange }: AsyncAction<T>) => {
  const [performingAction, setPerformingAction] = useState(false)

  const handlePerformAction = () => {
    setPerformingAction(true)
    onChange?.(true)

    action()
    .then(onSuccess)
    .catch(onError ?? console.error)
    .finally(() => { 
      if (staysMounted) {
        setPerformingAction(false); 
        onChange?.(false);
      }
    })
  }  

  return { performingAction, handlePerformAction }
}
export const AsyncIconButton = <T,>({ Icon, ...props } : LabeledIconButtonProps & AsyncAction<T>) => {
  const { performingAction, handlePerformAction } = useAsyncAction(props)

  return <LabeledIconButton {...props} disabled={props.disabled ?? performingAction} onClick={handlePerformAction}
    Icon={performingAction ? CircularProgressIcon : Icon}
  />
}
interface AsyncButtonProps<T> extends AsyncAction<T> {
  text: string,
  loadingText?: string,
  variant?: ButtonProps['variant'],
}
export const AsyncButton = <T,>({ text, loadingText=text, variant, ...props }: AsyncButtonProps<T>) => {
  const { performingAction, handlePerformAction } = useAsyncAction(props)

  return (
    <Button disabled={performingAction} onClick={handlePerformAction} variant={variant}>
      {performingAction ? loadingText : text}
    </Button>
  )
}

interface DownloadButton {
  session: Session | EnduserSession,
  secureName: string,
  onDownload: (downloadURL: string) => void;
  onError?: (error: string) => void;
}

export const DownloadFileIconButton = ({ session, secureName, onDownload, onError }: DownloadButton) => {
  const [downloadURL, setDownloadURL] = useState('')

  return (
    <AsyncIconButton Icon={DownloadIcon} label="download" ariaLabel='download icon'
      action={async () => {
        if (downloadURL) {
          onDownload(downloadURL) 
          return
        }
        try {
          const { downloadURL } = await session.api.files.file_download_URL({ secureName })
          setDownloadURL(downloadURL)
          onDownload(downloadURL)
        } catch(err: any) { onError?.(err?.message ?? '') }          
      }}
    />
  )
}



interface UseModalIconButtonProps extends LabeledIconButtonProps {}
export const useModalIconButton = (props: UseModalIconButtonProps) => {
  const [open, setOpen] = React.useState(false)
  
  return {
    open,
    setOpen,
    ...props,
  }
}

export const defaultModalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff', 
  marginTop: '10vh',
  marginLeft: '10vw',
  height: '80vh',
  width: '80vw',
  borderRadius: 10,
  padding: 25,
}

export const IconModal = ({ open, setOpen, children, disabled, onClick, style=defaultModalStyle, ...props }: ReturnType<typeof useModalIconButton> & Styled & { children: React.ReactNode }) => (
  <>
  <Modal open={open} setOpen={setOpen} style={style}>
    {children} 
  </Modal>
  <LabeledIconButton disabled={disabled || open} {...props}
    onClick={e => {
      setOpen(o => !o)
      onClick?.(e)
    }}
  />
  </>
)