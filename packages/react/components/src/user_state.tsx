import React, { useRef } from 'react'

import { Provider, useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux'
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit'

import {
  SessionOptions,
} from "@tellescope/sdk"

import {
  useSession,
  WithSession,
} from "./authentication"

import {
  sharedConfig,
  createSliceForList,
  useListStateHook,
  WithFetchContext,
} from "./state"

import {
  Enduser,
  Meeting,
  Task,
  Ticket,
} from "@tellescope/types-client"

const endusersSlice = createSliceForList<Enduser, 'endusers'>('endusers')
const tasksSlice = createSliceForList<Task, 'tasks'>('tasks')
const ticketsSlice = createSliceForList<Ticket, 'tickets'>('tickets')
const meetingsSlice = createSliceForList<Meeting, 'meetings'>('meetings')

const store = configureStore({
  reducer: { 
    endusers: endusersSlice.reducer,
    tasks: tasksSlice.reducer,
    tickets: ticketsSlice.reducer,
    meetings: meetingsSlice.reducer,
    ...sharedConfig.reducer,
  },
})
type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector
const useTypedDispatch = () => useDispatch<AppDispatch>()

export const WithUserState = ({ children }: { children: React.ReactNode  }) => (
  <WithFetchContext>
  <Provider store={store}>
    {children}
  </Provider>
  </WithFetchContext>
)

export const useEndusers = () => {
  const session = useSession()
  return useListStateHook('endusers', useTypedSelector(s => s.endusers), session, endusersSlice, session.api.endusers.getSome)
}
export const useTasks = () => {
  const session = useSession()
  return useListStateHook('tasks', useTypedSelector(s => s.tasks), session, tasksSlice, session.api.tasks.getSome)
}
export const useTickets = () => {
  const session = useSession()
  return useListStateHook('tickets', useTypedSelector(s => s.tickets), session, ticketsSlice, session.api.tickets.getSome)
}
export const useMeetings = () => {
  const session = useSession()
  return useListStateHook('meetings', useTypedSelector(s => s.meetings), session, meetingsSlice, session.api.meetings.my_meetings)
}