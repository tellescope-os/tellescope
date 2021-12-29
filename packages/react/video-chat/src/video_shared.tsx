import React, { CSSProperties } from "react"

import {
  AttendeeInfo,
  MeetingInfo,
} from '@tellescope/types-models'

import {
  UserIdentity,
} from '@tellescope/types-utilities'

export type AttendeeDisplayInfo =  { attendeeId: string, externalUserId: string }
export interface CallContext {
  meeting: MeetingInfo | undefined, setMeeting: (m: MeetingInfo | undefined) => void,
  videoIsEnabled: boolean, toggleVideo: () => Promise<void>,
  microphoneIsEnabled: boolean, toggleMicrophone: () => Promise<void>,
  attendees: AttendeeDisplayInfo[], shareScreenId: number | null,
  localTileId: number | null,
  isHost: boolean, setIsHost: (b: boolean) => void;
  videoTiles: (number)[],
}

export const CurrentCallContext = React.createContext({} as CallContext)
export interface VideoProps {
  children?: React.ReactNode,
}

export interface VideoViewProps {
  style?: CSSProperties,
}

export interface JoinVideoCallReturnType {
  meeting: CallContext['meeting'], 
  videoIsEnabled: CallContext['videoIsEnabled'], 
  toggleVideo: CallContext['toggleVideo'], 
  joinMeeting: (meetingInfo: { Meeting: MeetingInfo }, attendeeInfo: { Attendee: AttendeeInfo }) => Promise<void>,
}

export interface StartVideoCallReturnType {
  starting: boolean, 
  ending: boolean, 
  meeting: CallContext['meeting'],
  videoIsEnabled: CallContext['videoIsEnabled'], 
  toggleVideo: CallContext['toggleVideo'], 
  createAndStartMeeting: (initialAttendees?: UserIdentity[]) => Promise<void>, 
  addAttendees: (attendees: UserIdentity[]) => Promise<void>, 
  endMeeting: () => Promise<void>,
}