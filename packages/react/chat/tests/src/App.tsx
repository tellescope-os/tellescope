import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useHistory,
} from "react-router-dom"

import {
  EnduserLogin,
  UserLogin,
  WithSession,
  WithEnduserSession,
  useSession,
  useEnduserSession,
} from "@tellescope/authentication"

import {
  ChatsFromEndusersSidebar,
  ChatsFromUsersSidebar,
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

function App() {
  return (
    <WithEnduserSession sessionOptions={{ host: "http://localhost:8080" }}>
    <WithSession sessionOptions={{ host: "http://localhost:8080" }}>
      <Routing/>
    </WithSession>
    </WithEnduserSession>
  );
}


const ChatsForUser = () => {
  const session = useSession()
  if (!session.authToken) return <UserLogin/>

  return <ChatsFromEndusersSidebar/>
}

const ChatsForEnduser = () => {
  const session = useEnduserSession()
  if (!session.authToken) return <EnduserLogin/>

  return <ChatsFromUsersSidebar/>
}

const routes = {
  '/chats-for-user': ChatsForUser,
  '/chats-for-enduser': ChatsForEnduser,
}

export default App;
