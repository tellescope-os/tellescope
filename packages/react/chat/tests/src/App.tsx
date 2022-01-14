import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom"

import {
  ErrorBoundary,
  useSession,
  useEnduserSession,
  // useEndusers,
  Flex,
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
  const navigate = useNavigate()

  return (
    <div>
      Select Test Page <br/>
      {routes.map(r => 
        <button key={r} onClick={() => navigate(r)}>{r}</button>
      )}
    </div>
  )
}

const routes = [
  '/chats-for-user',
  '/chats-for-enduser',
]

const Routing = () => (
  <Router>
  <Routes>   
    <Route path='/chats-for-user' element={<ChatsForUser/>}/>
    <Route path='/chats-for-enduser' element={<ChatsForEnduser/>}/>
    <Route path='/*' element={<ViewSelector/>}/>
  </Routes>
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



export default App;
