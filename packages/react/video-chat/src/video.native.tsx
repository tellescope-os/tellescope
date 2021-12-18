// logic pulled + refactored from 
// https://github.com/aws-samples/amazon-chime-react-native-demo/blob/master/src/containers/Meeting.js
// which includes the following copyright disclaimer
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

import React, { useCallback, useContext, useEffect, useState } from "react"
import { View, StyleSheet } from "react-native"
import {
  AttendeeInfo,
  MeetingInfo,
} from '@tellescope/types-models'
import {
  UserIdentity,
} from '@tellescope/types-utilities'
import { useSession } from "@tellescope/react-components/lib/esm/authentication"
import { Flex } from "@tellescope/react-components/lib/esm/layout"
import { Button, Typography } from "@tellescope/react-components/lib/esm/mui"

import {
  CurrentCallContext,
  JoinVideoCallReturnType,
  StartVideoCallReturnType,
  VideoProps,
  AttendeeDisplayInfo
} from "./video.js"

import {
  getSDKEventEmitter,
  MobileSDKEvent,
  NativeFunction,
} from "./native/bridge"
import { RNVideoView } from "./native/RNVideoRenderView"

interface TileState {
  isLocal: boolean,
  isScreenShare: boolean,
  tileId: number,
}

export const WithVideo = ({ children } : VideoProps ) => {
  const [meeting, setMeeting] = useState(undefined as MeetingInfo | undefined)

  const [inMeeting, setInMeeting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [videoIsEnabled, setVideoIsEnabled] = useState(false)
  const [videoTiles, setVideoTiles] = useState([] as number[])
  const [screenShareTile, setScreenShareTile] = useState(null as number | null)
  const [attendees, setAttendees] = useState ([] as AttendeeDisplayInfo[])

  const toggleVideo = async () => {
    console.log('toggling', NativeFunction.setCameraOn(!videoIsEnabled))
    setVideoIsEnabled(v => !v)
  }
  const emitter = getSDKEventEmitter()

  useEffect(() => { 
    const startSubscription = emitter.addListener(MobileSDKEvent.OnMeetingStart, () => {
      setInMeeting(true)
      setIsLoading(false)
    });

    // called when user clicks Leave Meeting or meeting is ended by host
    const endSubscription = emitter.addListener(MobileSDKEvent.OnMeetingEnd, a => {
      setInMeeting(false)
      setIsLoading(false)
    });

    const joinSubscription = emitter.addListener(MobileSDKEvent.OnAttendeesJoin, (added: { attendeeId: string, externalUserId: string }) => {
      const { attendeeId, externalUserId } = added
      setAttendees(as => !as.find(a => a.attendeeId === attendeeId) 
        ? [{ attendeeId, externalUserId, muted: false }, ...as] 
        : as
      )
    });

    const leaveSubscription = emitter.addListener(MobileSDKEvent.OnAttendeesLeave, (leaving: { attendeeId: string }) => {
      const { attendeeId } = leaving
      setAttendees(as => as.filter(a => a.attendeeId !== attendeeId))
    });

    const errorSubscription = emitter.addListener(MobileSDKEvent.OnError, (message) => {
      console.error("SDK Error", message);
    });

    const muteSubscription = emitter.addListener(MobileSDKEvent.OnAttendeesMute, attendeeId => {
      setAttendees(as => as.map(a => a.attendeeId === attendeeId ? { ...a, muted: true } : a))
    });

    const unmuteSubscription = emitter.addListener(MobileSDKEvent.OnAttendeesUnmute, attendeeId => {
      setAttendees(as => as.map(a => a.attendeeId === attendeeId ? { ...a, muted: false } : a))
    });

    const addVideoSubscription = emitter.addListener(MobileSDKEvent.OnAddVideoTile, (tileState: TileState) => {
      if (tileState.isScreenShare) {
        setScreenShareTile(tileState.tileId)
        return
      }
      setVideoTiles(v => [...v, tileState.tileId])
      setVideoIsEnabled(v => tileState.isLocal ? true : v)
    });

    const removeVideoSubscription = emitter.addListener(MobileSDKEvent.OnRemoveVideoTile, (tileState: TileState) => {
      if (tileState.isScreenShare) {
        setScreenShareTile(null)
        return
      }
      setVideoTiles(vs => vs.filter(v => v !== tileState.tileId))
      setVideoIsEnabled(v => tileState.isLocal ? false : v)
    });

    return () => {
      startSubscription.remove();
      endSubscription.remove();
      errorSubscription.remove();
      joinSubscription.remove();
      leaveSubscription.remove();
      muteSubscription.remove();
      unmuteSubscription.remove();
      addVideoSubscription.remove();
      removeVideoSubscription.remove();
    }
  }, [emitter]) 

  return (
    <CurrentCallContext.Provider value={{ 
      attendees, 
      videoTiles, 
      meeting, 
      shareScreenId: screenShareTile, 
      setMeeting, 
      videoIsEnabled, 
      toggleVideo 
    }}>
      {children}
    </CurrentCallContext.Provider>
  )
}

export const useStartVideoCall = (): StartVideoCallReturnType => {
  const session = useSession()
  const { meeting, setMeeting, videoIsEnabled, toggleVideo } = React.useContext(CurrentCallContext)

  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)

  const createAndStartMeeting = async (initialAttendees?: UserIdentity[]) => {
    try {
      const { meeting, host } = await session.api.meetings.start_meeting()

      if (initialAttendees) {
        session.api.meetings.add_attendees_to_meeting({ id: meeting.Meeting.ExternalMeetingId, attendees: initialAttendees }) 
      }

      NativeFunction.startMeeting(meeting.Meeting, host.Attendee)

      setMeeting(meeting.Meeting)
    } catch(err) {
      console.error(err)
    }
    finally {

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

  return { meeting, videoIsEnabled, starting, ending, toggleVideo, createAndStartMeeting, addAttendees, endMeeting }
}

export const useJoinVideoCall = (): JoinVideoCallReturnType => {
  const { meeting, setMeeting, videoIsEnabled, toggleVideo } = React.useContext(CurrentCallContext)

  const joinMeeting = async (meetingInfo: { Meeting: MeetingInfo }, attendeeInfo: { Attendee: AttendeeInfo }) => {
    NativeFunction.startMeeting(meetingInfo.Meeting, attendeeInfo.Attendee)
  }

  return { meeting, videoIsEnabled, toggleVideo, joinMeeting }
}
export const VideoTileGrid = () => {
  const { 
    // attendees, 
    videoTiles, 
    toggleVideo,
  } = useContext(CurrentCallContext)

  return (
    <Flex column justifyContent="space-between" alignItems="center">
      <Flex style={styles.videoContainer}>
        {
          videoTiles.length > 0 ? videoTiles.map(tileId => 
            <RNVideoView style={styles.video} key={tileId} tileId={tileId} />
          ) : <Typography style={styles.subtitle}>No one is sharing video at this moment</Typography>
        }
      </Flex>

      {/* 
      {
        !!shareScreenId &&    
        <React.Fragment>
          <Typography style={styles.title}>Screen Share</Typography>
          <View style={styles.videoContainer}>
            <RNVideoView style={styles.screenShare} key={shareScreenId} tileId={shareScreenId} />
          </View>
        </React.Fragment>
      } 
      */}

      <Flex justifyContent="space-between" style={{ height: '5%' }}>
        {/* <MuteButton muted={currentMuted} onPress={() => NativeFunction.setMute(!currentMuted) }/>          */}
        {/* <CameraButton disabled={selfVideoEnabled} onPress={() =>  NativeFunction.setCameraOn(!videoIsEnabled)}/> */}
        <Button onPress={toggleVideo}>
          Toggle Video
        </Button>
        {/* <HangOffButton onPress={() => NativeFunction.stopMeeting()} /> */}
        <Button onPress={() => NativeFunction.stopMeeting()}> Leave Meeting </Button>
      </Flex>

      {/* <FlatList
        style={styles.attendeeList}
        data={attendees}
        renderItem={({ item }) => <AttendeeItem attendeeName={attendeeNameMap[item] ? attendeeNameMap[item] : item} muted={this.state.mutedAttendee.includes(item)}/>}
        keyExtractor={(item) => item}
      /> */}

    </Flex>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '700'
  },
  subtitle: {
    marginBottom: 25,
    marginTop: 10,
    color: 'grey' 
  },
  videoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: '95%',
    // This is an existing React Native issue:
    // When you create a native android component
    // that use GLSurfaceView (We use this internally), the entire screen will
    // black out
    overflow: 'hidden'
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  screenShare: {
    width: '90%',
    margin: '1%',
    aspectRatio: 16 / 9,
  },
  attendeeList: {
    flex: 1,
    width: '80%'
  },
  attendeeContainer: {
    fontSize: 20,
    margin: 5,
    padding: 5,
    height: 30,
    backgroundColor: '#eee',
    justifyContent: 'space-between', 
    flexDirection: 'row',  
  },
  attendeeMuteImage: {
    resizeMode: 'contain',
    width: 20,
    height: 20
  },
  inputBox: {
    height: 40,
    borderColor: 'black',
    borderWidth: 1,
    margin: 5,
    width: '50%',
    padding: 10,
    color: 'black'
  },
  meetingButton: {
    resizeMode: 'contain',
    width: 50,
    height: 50
  }
});