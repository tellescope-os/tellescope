import React, { useCallback, useState, CSSProperties, Children } from "react"

import {
  useSession,
} from "@tellescope/react-components/lib/esm/authentication"

import {
  UserIdentity,
} from "@tellescope/types-utilities"
import {
  AttendeeInfo,
  MeetingInfo,
} from '@tellescope/types-models'

import {
  user_display_name,
} from "@tellescope/utilities"

import {
  Session,
  EnduserSession,
} from "@tellescope/sdk"

import { ThemeProvider } from 'styled-components';
import {
  MeetingProvider,
  darkTheme,
  useContentShareState,
  // LocalVideo,
  VideoTileGrid,
  // VideoGrid,
  // VideoTile,
  // PreviewVideo,
  // RemoteVideo,
  useLocalVideo,
  useMeetingManager,
  useRosterState,
  useRemoteVideoTileState
  // useRemoteVideoTileState,
  // useContentShareControls, // screen sharing
} from 'amazon-chime-sdk-component-library-react';
import {  } from "../../../types-client/node_modules/@tellescope/types-models/src"

export type AttendeeDisplayInfo =  { attendeeId: string, externalUserId: string }

export const CurrentCallContext = React.createContext({} as {
  meeting: MeetingInfo | undefined, setMeeting: (m: MeetingInfo | undefined) => void,
  videoIsEnabled: boolean, toggleVideo: () => Promise<void>,
  attendees: AttendeeDisplayInfo[], shareScreenId: string,
  videoTiles: (number | string)[],
})
export interface VideoProps {
  children?: React.ReactNode,
  theme?: typeof darkTheme,
}
const WithContext = ({ children } : { children: React.ReactNode }) => {
  const [meeting, setMeeting] = useState(undefined as MeetingInfo | undefined)
  const { toggleVideo, isVideoEnabled: videoIsEnabled } = useLocalVideo();
  const { roster } = useRosterState()
  const { tileId } = useContentShareState()
  const { tiles } = useRemoteVideoTileState()

  const attendees = [] as AttendeeDisplayInfo[]
  for (const attendeeId in roster) {
    const { externalUserId } = roster[attendeeId]
    attendees.push({ attendeeId, externalUserId: externalUserId as string })
  }

  return (
    <CurrentCallContext.Provider value={{ attendees, videoTiles: tiles, shareScreenId: tileId?.toString() ?? '', meeting, setMeeting, videoIsEnabled, toggleVideo }}>
      {children}
    </CurrentCallContext.Provider>
  )
}
export const WithVideo = ({ children, theme=darkTheme }: VideoProps) => (
  <ThemeProvider theme={theme}>
  <MeetingProvider>
  <WithContext>
    {children}
  </WithContext>
  </MeetingProvider>
  </ThemeProvider>
)

export const useStartVideoCall = () => {
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const { meeting, setMeeting, toggleVideo, videoIsEnabled } = React.useContext(CurrentCallContext)

  const session = useSession()
  const meetingManager = useMeetingManager();

  const createAndStartMeeting = async (initialAttendees?: UserIdentity[]) => {
    setStarting(false)

    try {
      const { meeting, host } = await session.api.meetings.start_meeting()

      await meetingManager.join({ meetingInfo: meeting, attendeeInfo: host }); // Use the join API to create a meeting session
      await meetingManager.start(); // At this point you can let users setup their devices, or start the session immediately

      if (initialAttendees) {
        session.api.meetings.add_attendees_to_meeting({ id: meeting.Meeting.ExternalMeetingId, attendees: initialAttendees }) 
      }

      setMeeting(meeting.Meeting)
    } catch(err) {
      console.error(err)
    }
    finally {
      setStarting(false)
    }
  }

  const addAttendees = useCallback(async (attendees: UserIdentity[]) => {
    if (!meeting) return
    await session.api.meetings.add_attendees_to_meeting({ id: meeting?.ExternalMeetingId, attendees }) 
  }, [session, meeting])

  const endMeeting = async () => {
    if (!meeting) return
    setEnding(true)

    try {
      await session.api.meetings.end_meeting({ id: meeting.ExternalMeetingId })
    } catch(err) { console.error(err) }

    setEnding(false)
    setMeeting(undefined)
  }

  return { starting, ending, meeting, videoIsEnabled, toggleVideo, createAndStartMeeting, addAttendees, endMeeting }
}
export type StartVideoCallReturnType = ReturnType<typeof useStartVideoCall>

export const useJoinVideoCall = () => {
  const meetingManager = useMeetingManager();
  const { meeting, setMeeting, toggleVideo, videoIsEnabled } = React.useContext(CurrentCallContext)

  const joinMeeting = async (meetingInfo: { Meeting: MeetingInfo }, attendeeInfo: { Attendee: AttendeeInfo }) => {
    await meetingManager.join({ meetingInfo, attendeeInfo }); // Use the join API to create a meeting session
    await meetingManager.start(); // At this point you can let users setup their devices, or start the session immediately
    setMeeting(meetingInfo.Meeting)
  }

  return { meeting, videoIsEnabled: videoIsEnabled, toggleVideo, joinMeeting }
}
export type JoinVideoCallReturnType = ReturnType<typeof useJoinVideoCall>

export { VideoTileGrid }