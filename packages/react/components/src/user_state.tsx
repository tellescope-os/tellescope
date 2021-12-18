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
  HookOptions,
  WithFetchContext,
} from "./state"

import {
  Enduser,
  Meeting,
  Task,
  Ticket,
  File,
  Note,
} from "@tellescope/types-client"

const endusersSlice = createSliceForList<Enduser, 'endusers'>('endusers')
const tasksSlice = createSliceForList<Task, 'tasks'>('tasks')
const ticketsSlice = createSliceForList<Ticket, 'tickets'>('tickets')
const meetingsSlice = createSliceForList<Meeting, 'meetings'>('meetings')
const filesSlice = createSliceForList<File, 'files'>('files')
const notesSlice = createSliceForList<Note, 'notes'>('notes')

const store = configureStore({
  reducer: { 
    endusers: endusersSlice.reducer,
    tasks: tasksSlice.reducer,
    tickets: ticketsSlice.reducer,
    meetings: meetingsSlice.reducer,
    files: filesSlice.reducer,
    notes: notesSlice.reducer,
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

export const useEndusers = (options={} as HookOptions<Enduser>) => {
  const session = useSession()
  return useListStateHook(
    'endusers', 
    useTypedSelector(s => s.endusers), 
    session, 
    endusersSlice, 
    session.api.endusers.getSome,
    {...options}
  )
}
export const useTasks = (options={} as HookOptions<Task>) => {
  const session = useSession()
  return useListStateHook('tasks', useTypedSelector(s => s.tasks), session, tasksSlice, session.api.tasks.getSome, {...options})
}
export const useTickets = (options={} as HookOptions<Ticket>) => {
  const session = useSession()
  return useListStateHook('tickets', useTypedSelector(s => s.tickets), session, ticketsSlice, session.api.tickets.getSome, {...options})
}
export const useMeetings = (options={} as HookOptions<Meeting>) => {
  const session = useSession()
  return useListStateHook('meetings', useTypedSelector(s => s.meetings), session, meetingsSlice, session.api.meetings.my_meetings, {...options})
}
export const useFiles = (options={} as HookOptions<File>) => {
  const session = useSession()
  return useListStateHook('files', useTypedSelector(s => s.files), session, filesSlice, session.api.files.getSome, {...options})
}
export const useNotes = (options={} as HookOptions<File>) => {
  const session = useSession()
  return useListStateHook('notes', useTypedSelector(s => s.notes), session, notesSlice, session.api.notes.getSome, {...options})
}