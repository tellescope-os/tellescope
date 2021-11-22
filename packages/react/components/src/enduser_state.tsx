import React, { useRef } from 'react'

import { Provider, useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import {
  SessionOptions,
} from "@tellescope/sdk"

import {
  useEnduserSession,
  WithEnduserSession,
} from "./authentication"

import {
  createSliceForList,
  sharedConfig,
  useListStateHook,
} from "./state"

type UserDisplayInfo = { fname: string, lname: string, id: string }

const usersSlice = createSliceForList<UserDisplayInfo, 'users'>('users')

const store = configureStore({
  reducer: { 
    users: usersSlice.reducer,
    ...sharedConfig.reducer,
  },
})
type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector
const useTypedDispatch = () => useDispatch<AppDispatch>()

type Values<T> = {
  value: T[],
  setValue: (t: T[]) => void,
}

export const WithEnduserState = ({ children, sessionOptions }: { children: React.ReactNode, sessionOptions?: SessionOptions  }) => (
  <WithEnduserSession sessionOptions={sessionOptions}>
  <Provider store={store}>
    {children}
  </Provider>
  </WithEnduserSession>
)
export const useUserDisplayNames = () => {
  const session = useEnduserSession()  
  const state = useTypedSelector(s => s.users)
  return useListStateHook(state, session.api.users.display_names, usersSlice)
}