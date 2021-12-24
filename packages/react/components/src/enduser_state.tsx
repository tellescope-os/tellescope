import React, { useRef } from 'react'

import { Provider, useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import {
  SessionOptions,
} from "@tellescope/sdk"

import {
  Ticket,
  Meeting,
} from '@tellescope/types-client'

import {
  useEnduserSession,
  WithEnduserSession,
} from "./authentication"

import {
  createSliceForList,
  sharedConfig,
  useListStateHook,
  WithFetchContext,
  HookOptions,
} from "./state"

type UserDisplayInfo = { fname?: string, lname?: string, id: string, lastActive?: Date, lastLogout?: Date }

const usersSlice = createSliceForList<UserDisplayInfo, 'users'>('users')
const ticketsSlice = createSliceForList<Ticket, 'tickets'>('tickets')
const meetingsSlice = createSliceForList<Meeting, 'meetings'>('meetings')

const store = configureStore({
  reducer: { 
    users: usersSlice.reducer,
    tickets: ticketsSlice.reducer,
    meetings: meetingsSlice.reducer,
    ...sharedConfig.reducer,
  },
})
type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector
const useTypedDispatch = () => useDispatch<AppDispatch>()

export const WithEnduserState = ({ children }: { children: React.ReactNode  }) => (
  <WithFetchContext>
  <Provider store={store}>
    {children}
  </Provider>
  </WithFetchContext>
)
export const useUserDisplayNames = (options={} as HookOptions<UserDisplayInfo>) => {
  const session = useEnduserSession()  
  const state = useTypedSelector(s => s.users)
  return useListStateHook('users', state, session, usersSlice, session.api.users.display_info, { socketConnection: 'none', ...options })
}
export const useTickets = (options={} as HookOptions<Ticket>) => {
  const session = useEnduserSession()
  return useListStateHook('tickets', useTypedSelector(s => s.tickets), session, ticketsSlice, session.api.tickets.getSome, { ...options })
}
export const useMeetings = (options={} as HookOptions<Meeting>) => {
  const session = useEnduserSession()
  return useListStateHook('meetings', useTypedSelector(s => s.meetings), session, meetingsSlice, session.api.meetings.my_meetings, { ...options })
}