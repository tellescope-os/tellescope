import React, { useContext } from 'react';

import {
  UserLogin,
  EnduserLogin,
  WithSession,
  WithEnduserSession,
  EnduserSessionContext,
  SessionContext,
} from "@tellescope/authentication"
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useHistory,
} from "react-router-dom"

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


const EnduserView = () => {
  const { enduserSession } = useContext(EnduserSessionContext)

  if (enduserSession.get_authToken()) return <div>Authenticated: {enduserSession.get_authToken()}</div>
  return <EnduserLogin/> 
}

const UserView = () => {
  const { session } = useContext(SessionContext)

  if (session.get_authToken()) return <div>Authenticated: {session.get_authToken()}</div>
  return <UserLogin onLogin={alert}/> 
}

const routes = {
  '/enduser-view': EnduserView,
  '/user-view': UserView,
}

export default App;
