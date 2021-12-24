// components that work with web or native
import React from "react"

import { 
  VideoIcon,
  VideoOffIcon,
  MicrophoneIcon,
  MicrophoneOffIcon,
  CallEndIcon,

  Paper,

  Styled,
} from "@tellescope/react-components/lib/esm/mui"
import { LabeledIconButton } from "@tellescope/react-components/lib/esm/controls"
import { Flex } from "@tellescope/react-components/lib/esm/layout"
import {
  CurrentCallContext,
  useStartVideoCall,
} from "./video"

const DEFAULT_BUTTON_SIZE = 30
interface ButtonProps {
  size?: number,
}
export const VideoToggle = ({ size=DEFAULT_BUTTON_SIZE } : ButtonProps) => {
  const { toggleVideo, videoIsEnabled } = React.useContext(CurrentCallContext)

  return (
    <LabeledIconButton size={size} Icon={videoIsEnabled ? VideoIcon : VideoOffIcon} onClick={toggleVideo} 
      label={videoIsEnabled ? "Turn Camera Off" : "Turn Camera On"}
    />
  )
}

export const MicrophoneToggle = ({ size=DEFAULT_BUTTON_SIZE }: ButtonProps) => {
  const { microphoneIsEnabled, toggleMicrophone } = React.useContext(CurrentCallContext)

  return (
    <LabeledIconButton size={size} Icon={microphoneIsEnabled ? MicrophoneIcon : MicrophoneOffIcon} onClick={toggleMicrophone} 
      label={microphoneIsEnabled ? "Turn Microphone Off" : "Turn Microphone On"}
    />
  )
}

// ends meeting if host, otherwise leaves meeting
export const EndMeeting = ({ size=DEFAULT_BUTTON_SIZE }: ButtonProps) => {
  const { endMeeting } = useStartVideoCall()

  return (
    <LabeledIconButton size={size} Icon={CallEndIcon} onClick={endMeeting} label="End Meeting"/>
  )
}

interface LeaveMeetingProps {
  onLeave?: () => void,
}
export const LeaveMeeting = ({ onLeave, size=DEFAULT_BUTTON_SIZE } : LeaveMeetingProps & ButtonProps) => (
  <LabeledIconButton size={size} Icon={CallEndIcon} onClick={onLeave} label="Leave Meeting"/>
)

interface ControlbarProps {
  spacing?: number,
  size?: number,

}
export const ControlBar = ({ onLeave, style, spacing=15, size } : ControlbarProps & LeaveMeetingProps & Styled) => {
  const { isHost } = React.useContext(CurrentCallContext)
  const itemStyle = { marginLeft: spacing, marginRight: spacing }

  return (
    <Flex flex={1} alignItems="center" justifyContent="center" style={style}>
      <Paper elevation={5} style={{ display: 'flex', flexDirection: 'row', padding: spacing }}>
        <Flex style={itemStyle}>
          <VideoToggle size={size}/>
        </Flex>
        <Flex style={itemStyle}>
          <MicrophoneToggle size={size}/>
        </Flex>
        <Flex style={itemStyle}>
          {isHost ? <EndMeeting size={size}/> : <LeaveMeeting size={size} onLeave={onLeave}/>}
        </Flex>
      </Paper>
    </Flex>
  )
}