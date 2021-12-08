import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useHistory,
} from "react-router-dom"

import {
  Button,
  ErrorBoundary,
  useSession,
  useEnduserSession,
  // useEndusers,
  List,
  Flex,
  UserProvider,
  EnduserProvider,
  WithEnduserSession,
  WithSession,
  EnduserLogin,
  UserLogin,
  Typography,
  LoadingLinear,
} from "@tellescope/react-components"
import {
  WithTheme, 
} from "@tellescope/react-components/lib/esm/theme"
import {
  useEndusers,
} from "@tellescope/react-components/lib/esm/user_state"
import {
  useMeetings,
} from "@tellescope/react-components/lib/esm/enduser_state"

import {
  useJoinVideoCall,
  useStartVideoCall,
  VideoTileGrid,
  WithVideo,
} from '@tellescope/video-chat'
import { AttendeeInfo } from '@tellescope/types-models';

const ViewSelector = () => {
  const history = useHistory()

  return (
    <div>
      Select Test Page <br/>
      {Object.keys(routes).map(r => 
        <button key={r} onClick={() => history.push(r)}>{r}</button>
      )}
    </div>
  )
}

const Routing = () => (
  <Router>
  <Switch>   
    {Object.keys(routes).map(r => 
      <Route exact path={r} key={r}>
        {routes[r as keyof typeof routes]()}
      </Route>
    )}
    <Route> <ViewSelector/> </Route>
  </Switch>
  </Router>
)

export const App = () => {
  return (
    <Flex style={{ height: '100vh' }}> 
    <ErrorBoundary>
    <WithVideo>
      <Routing/>
    </WithVideo>
    </ErrorBoundary>
    </Flex>
  );
}

const StartVideoMeeting = () => {
  const { 
    starting,
    meeting,
    ending,
    createAndStartMeeting,
    addAttendees,
    endMeeting,
    toggleVideo,
    videoIsEnabled,
  } = useStartVideoCall()

  const [endusers] = useEndusers()

  return (
    <Flex flex={1}>
      <Button variant="contained" disabled={!!meeting || starting} onClick={createAndStartMeeting}>
        Start Meeting
      </Button>
      <Button variant="contained" disabled={!meeting || ending} onClick={endMeeting}>
        End Meeting
      </Button>
      <Button variant={videoIsEnabled ? 'outlined' : 'contained'} onClick={toggleVideo}>
        Toggle Video
      </Button>

      <LoadingLinear data={endusers} render={endusers => (
        <List items={endusers} render={e => (
          <Flex>
            {e.email}
          <Button disabled={!meeting} onClick={() => addAttendees([{ id: e.id, type: "enduser" }])}>
            Add to Meeting
          </Button>
          </Flex>
        )}/>
      )}/>
      <VideoTileGrid/>
    </Flex>
  )
}

const VideoChatForUserWithProvider = () => {
  const session = useSession()

  if (!session.authToken) return <UserLogin/>
  return <StartVideoMeeting/>
}

const VideoChatForUser = () => {
  return (
    <WithSession sessionOptions={{ host: 'http://localhost:8080' }}>
    <UserProvider>
      <VideoChatForUserWithProvider/>
    </UserProvider>   
    </WithSession>
  )
}

const VideoChatForEndserWithProvider = () => {
  const session = useEnduserSession()
  const [meetings] = useMeetings()
  console.log(meetings)

  const { joinMeeting, toggleVideo, meeting, videoIsEnabled, } = useJoinVideoCall()

  if (!session.authToken) return <EnduserLogin/>
  return (
    <Flex>
      <LoadingLinear data={meetings} render={meetings => (
        <List items={meetings} render={meeting => (
          <Flex>
            <Button disabled={meeting.status === 'ended'} onClick={() => {
              joinMeeting(
                meeting.meetingInfo, 
                meeting.attendees.find(a => a.id === session.userInfo.id)?.info as any
              )
            }}>
              Join Meeting {meeting.id}
            </Button>
          </Flex>
        )}
        />
      )}/>
      <Button variant={videoIsEnabled ? 'outlined' : 'contained'} onClick={toggleVideo} disabled={!meeting}>
        Toggle Video
      </Button>
      <VideoTileGrid/>
    </Flex>
  )
}

const VideoChatForEndser = () => {
  return (
    <WithEnduserSession sessionOptions={{ host: 'http://localhost:8080' }}>
    <EnduserProvider>
      <VideoChatForEndserWithProvider/>
    </EnduserProvider>  
    </WithEnduserSession>
  )
}

const routes = {
  '/video-chat-user': VideoChatForUser,
  '/video-chat-enduser': VideoChatForEndser,
}

export default App;
