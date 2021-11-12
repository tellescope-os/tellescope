import React, { } from 'react'

import {
  SessionOptions,
} from "@tellescope/sdk"

import {
  useEnduserSession,
  WithEnduserSession,
} from "./authentication"

import {
  useStateManagerForList,
} from "./state"

export const WithEnduserState = ({ children, sessionOptions }: { children: React.ReactNode, sessionOptions?: SessionOptions  }) => (
  <WithEnduserSession sessionOptions={sessionOptions}>
    {children}
  </WithEnduserSession>
)
export const useUserDisplayNames = () => {
  const session = useEnduserSession()  
  return useStateManagerForList(session.api.users.display_names)
}