import React from 'react'

import {
  SessionOptions,
} from "@tellescope/sdk"

import {
  useSession,
  WithSession,
} from "./authentication"

import {
  useStateManagerForList
} from "./state"


export const WithUserState = ({ children, sessionOptions }: { children: React.ReactNode, sessionOptions?: SessionOptions  }) => (
  <WithSession sessionOptions={sessionOptions}>  
    {children}
  </WithSession>
)

export const useEndusers = () => {
  const session = useSession()
  return useStateManagerForList(session.api.endusers.getSome)
}