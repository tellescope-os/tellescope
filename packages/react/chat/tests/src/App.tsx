import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useHistory,
} from "react-router-dom"

import {
  ErrorBoundary,
  useSession,
  useEnduserSession,
  // useEndusers,
  Flex,
  Table,
  UserProvider,
  EnduserProvider,
  WithEnduserSession,
  WithSession,
  EnduserLogin,
  UserLogin,
} from "@tellescope/react-components"

import {
  EnduserChatSplit,
  UserChatSplit,
} from "@tellescope/chat"

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
        <Routing/>
      </ErrorBoundary>
    </Flex>
  );
}


const ChatsForUser = () => (
  <WithSession sessionOptions={{ host: 'http://localhost:8080' }}>
  <UserProvider>
    <ChatsForUserWithProvider/> 
  </UserProvider>
  </WithSession>
)

const ChatsForUserWithProvider = () => {
  const session = useSession()
  if (!session.authToken) return <UserLogin/>

  return <UserChatSplit/>
}

const ChatsForEnduser = () => (
  <WithEnduserSession sessionOptions={{ host: 'http://localhost:8080' }}>
  <EnduserProvider>
    <ChatsForEnduserWithProvider/>
  </EnduserProvider>
  </WithEnduserSession>
)
const ChatsForEnduserWithProvider = () => {
  const session = useEnduserSession()
  if (!session.authToken) return <EnduserLogin/>

  return <EnduserChatSplit/>
}

const routes = {
  '/chats-for-user': ChatsForUser,
  '/chats-for-enduser': ChatsForEnduser,
}

export default App;
