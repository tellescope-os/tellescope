import React, { useCallback, useState, CSSProperties, Children, useEffect } from "react"

import {
  useResolvedSession,
  useSession,
  Styled,
} from "@tellescope/react-components"

import {
  UserIdentity,
} from "@tellescope/types-utilities"
import {
  AttendeeInfo,
  MeetingInfo,
} from '@tellescope/types-models'


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
  RemoteVideo,
  useAttendeeAudioStatus,
  LocalVideo,
  useLocalVideo,
  useMeetingManager,
  useRosterState,
  useRemoteVideoTileState,
  useToggleLocalMute,
  useMeetingStatus,
  MeetingStatus,
  // useRemoteVideoTileState,
  // useContentShareControls, // screen sharing
} from 'amazon-chime-sdk-component-library-react';
import {
  CurrentCallContext,
} from "./index"
import {
  AttendeeDisplayInfo,
  VideoProps,
  VideoViewProps,
  JoinVideoCallReturnType,
  StartVideoCallReturnType,
  JoinVideoCallProps,
} from "./video_shared"
import { ConsoleLogger, DefaultDeviceController, Logger, LogLevel } from "amazon-chime-sdk-js";

const WithContext = ({ children } : { children: React.ReactNode }) => {
  const [meeting, setMeeting] = useState(undefined as MeetingInfo | undefined)
  const [isHost, setIsHost] = useState(false)
  const { toggleVideo, isVideoEnabled: videoIsEnabled, tileId: localTileId } = useLocalVideo();
  const { roster } = useRosterState()
  const { tileId } = useContentShareState()
  const { tiles } = useRemoteVideoTileState()
  const { muted, toggleMute } = useToggleLocalMute()

  const attendees = [] as AttendeeDisplayInfo[]
  for (const attendeeId in roster) {
    const { externalUserId } = roster[attendeeId]
    attendees.push({ attendeeId, externalUserId: externalUserId as string })
  }

  return (
    <CurrentCallContext.Provider value={{ 
      isHost, setIsHost,
      attendees, 
      localTileId,
      videoTiles: tiles, 
      shareScreenId: tileId, 
      meeting, 
      setMeeting, 
      videoIsEnabled, 
      toggleVideo, 
      microphoneIsEnabled: !muted,
      toggleMicrophone: async () => toggleMute(),
    }}>
      {children}
    </CurrentCallContext.Provider>
  )
}
export const WithVideo = ({ children }: VideoProps) => (
  <ThemeProvider theme={darkTheme}>
  <MeetingProvider>
  <WithContext>
    {children}
  </WithContext>
  </MeetingProvider>
  </ThemeProvider>
)

export const useStartVideoCall = (): StartVideoCallReturnType  => {
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const { meeting, setMeeting, toggleVideo, videoIsEnabled, setIsHost } = React.useContext(CurrentCallContext)

  const session = useSession() // meetings can only be started by users, not endusers (for now)
  const meetingManager = useMeetingManager();

  const createAndStartMeeting = async (initialAttendees?: UserIdentity[]) => {
    setStarting(true)
    try {
      const { id, meeting, host } = await session.api.meetings.start_meeting({ attendees: initialAttendees })

      await meetingManager.join({ meetingInfo: meeting, attendeeInfo: host.info }); // Use the join API to create a meeting session
      await meetingManager.start(); // At this point you can let users setup their devices, or start the session immediately

      setMeeting(meeting.Meeting)
      setIsHost(true)
      return id
    } catch(err) {
      console.error(err)
      throw err
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

export const useJoinVideoCall = (props?: JoinVideoCallProps): JoinVideoCallReturnType  => {
  const { onCallEnd } = props ?? {}
  const session = useResolvedSession()
  const meetingManager = useMeetingManager();
  const { meeting, setMeeting, toggleVideo, videoIsEnabled } = React.useContext(CurrentCallContext)
  const status = useMeetingStatus()

  // meetingInfo may be meetingId as string
  const joinMeeting = async (meetingInfo: string | { Meeting: MeetingInfo }, attendeeInfo: { Attendee: AttendeeInfo }) => {
    if (typeof meetingInfo == 'string') {
      const meetings = await session.api.meetings.my_meetings()
      const meeting = meetings.find(m => m.id === meetingInfo)
      meetingInfo = meeting?.meetingInfo as { Meeting: MeetingInfo }
      attendeeInfo = meeting?.attendees.find?.(a => a.id === session.userInfo.id)?.info as { Attendee: AttendeeInfo }
    }
    if (!meetingInfo || typeof meetingInfo === 'string' || !attendeeInfo) return

    await meetingManager.join({ meetingInfo, attendeeInfo }); // Use the join API to create a meeting session
    await meetingManager.start(); // At this point you can let users setup their devices, or start the session immediately
    setMeeting(meetingInfo.Meeting)
  }

  const leaveMeeting = () => {
    if (meetingManager.audioVideo) {
      meetingManager.audioVideo.chooseVideoInputDevice(null);

      // Stop local video tile (stops sharing the video tile in the meeting)
      meetingManager.audioVideo.stopLocalVideoTile();

      // Stop a video preview that was previously started (before session starts)
      // meetingManager.audioVideo.stopVideoPreviewForVideoInput(previewVideoElement);

      // Stop the meeting session (audio and video)
      meetingManager.audioVideo && meetingManager.audioVideo.stop() 

    }
  }

  useEffect(() => {
    if (!meeting) return
    if (status === MeetingStatus.Ended) {
      leaveMeeting()
      onCallEnd?.()
    }
  }, [meeting, status, leaveMeeting])

  return { meeting, videoIsEnabled: videoIsEnabled, toggleVideo, joinMeeting, leaveMeeting }
}

export const SelfView = ({ style }: VideoViewProps) => <div style={style}><LocalVideo/></div>

export const useRemoteViews = (props={} as VideoViewProps) => {
  const { localTileId, videoTiles } = React.useContext(CurrentCallContext)
  const nonLocal = videoTiles.filter(v => v !== localTileId)

  return nonLocal.map(tileId => 
    <RemoteVideo key={tileId} style={props.style} tileId={tileId} />
  )
}


class SwappableLogger implements Logger {
  constructor(public inner: Logger) {}
  debug(debugFunction: string | (() => string)): void {
    this.inner.debug(debugFunction);
  }

  info(msg: string): void {
    this.inner.info(msg);
  }

  error(msg: string): void {
    this.inner.error(msg);
  }

  warn(msg: string): void {
    this.inner.warn(msg);
  }

  setLogLevel(level: LogLevel): void {
    this.inner.setLogLevel(level);
  }

  getLogLevel(): LogLevel {
    return this.inner.getLogLevel();
  }
}

const PREVIEW_ELEMENT_ID = 'video-preview'
const defaultPreviewStyle = {
  width: 400,
  minHeight: 200,
  height: 'auto',
  maxHeight: 600,
  backgroundColor: '#f0f0f0'
}
export const LocalPreview = ({ style=defaultPreviewStyle }: Styled) => {
  useEffect(() => {
    const videoElement = document.getElementById(PREVIEW_ELEMENT_ID) as HTMLVideoElement;
    if (!videoElement) return

    const deviceController = new DefaultDeviceController(new SwappableLogger(new ConsoleLogger('SDK', LogLevel.WARN)), { enableWebAudio: true });

    //List the video device list
    deviceController.listVideoInputDevices()
    .then(deviceList => {
      //Choose video device
      deviceController.chooseVideoInputDevice(deviceList[0].deviceId)
      .then(() => {
        //Start video preview
        deviceController.startVideoPreviewForVideoInput(videoElement); 
      }).catch(console.error)
    }).catch(console.error)

    // disconnect camera 
    return () => {
      deviceController.destroy()
    }
  }, [])

  return <video id={PREVIEW_ELEMENT_ID} style={style}/>
}
export { VideoTileGrid }