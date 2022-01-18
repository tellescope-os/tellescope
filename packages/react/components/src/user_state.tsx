import React, { useRef } from 'react'

import { Provider, useSelector, TypedUseSelectorHook, createSelectorHook } from 'react-redux'
import { configureStore, EnhancedStore, Action } from '@reduxjs/toolkit'

import {
  useSession,
} from "./authentication"

import {
  sharedConfig,
  createSliceForList,
  useListStateHook,
  HookOptions,
  WithFetchContext,

  useChats as useChatsShared,
  useChatRooms as useChatRoomsShared,
  TellescopeStoreContext,
} from "./state"

import {
  ChatMessage,
  ChatRoom,
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

export const userConfig = {
  reducer: { 
    endusers: endusersSlice.reducer,
    tasks: tasksSlice.reducer,
    tickets: ticketsSlice.reducer,
    meetings: meetingsSlice.reducer,
    files: filesSlice.reducer,
    notes: notesSlice.reducer,
    ...sharedConfig.reducer,
  }
}
const store = configureStore(userConfig)
type RootState = ReturnType<typeof store.getState>
const useTypedSelector = createSelectorHook(TellescopeStoreContext) as any as TypedUseSelectorHook<RootState>

export const UserProvider = (props: { children: React.ReactNode }) => (
  <WithFetchContext>
  <Provider store={store} context={TellescopeStoreContext}>
    {props.children}
  </Provider>
  </WithFetchContext>
)

export const ExtendedUserProvider = <A,B extends Action<any>>(props: { children: React.ReactNode, store: EnhancedStore<A,B> }) => (
  <WithFetchContext>
  <Provider context={TellescopeStoreContext} store={props.store}>
    {props.children}
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
    { 
      loadQuery: session.api.endusers.getSome,
      addOne: session.api.endusers.createOne,
      addSome: session.api.endusers.createSome,
      deleteOne: session.api.endusers.deleteOne,
      updateOne: session.api.endusers.updateOne,
     },
    {...options}
  )
}
export const useTasks = (options={} as HookOptions<Task>) => {
  const session = useSession()
  return useListStateHook(
    'tasks', useTypedSelector(s => s.tasks), session, tasksSlice, 
    { 
      loadQuery: session.api.tasks.getSome,
      addOne: session.api.tasks.createOne,
      addSome: session.api.tasks.createSome,
      deleteOne: session.api.tasks.deleteOne,
      updateOne: session.api.tasks.updateOne,
    }, 
    {...options}
  )
}
export const useTickets = (options={} as HookOptions<Ticket>) => {
  const session = useSession()
  return useListStateHook(
    'tickets', useTypedSelector(s => s.tickets), session, ticketsSlice, 
    { 
      loadQuery: session.api.tickets.getSome,
      addOne: session.api.tickets.createOne,
      addSome: session.api.tickets.createSome,
      deleteOne: session.api.tickets.deleteOne,
      updateOne: session.api.tickets.updateOne,
    }, 
    {...options}
  )
}
export const useMeetings = (options={} as HookOptions<Meeting>) => {
  const session = useSession()
  return useListStateHook(
    'meetings', useTypedSelector(s => s.meetings), session, meetingsSlice, 
    { 
      loadQuery: session.api.meetings.my_meetings,
      addOne: session.api.meetings.createOne,
      addSome: session.api.meetings.createSome,
      deleteOne: session.api.meetings.deleteOne,
      updateOne: session.api.meetings.updateOne,
    }, 
    {...options}
  )
}
export const useFiles = (options={} as HookOptions<File>) => {
  const session = useSession()
  return useListStateHook(
    'files', useTypedSelector(s => s.files), session, filesSlice, 
    { 
      loadQuery: session.api.files.getSome,
      deleteOne: session.api.files.deleteOne,
      updateOne: session.api.files.updateOne,
    }, 
    {...options}
  )
}
export const useNotes = (options={} as HookOptions<File>) => {
  const session = useSession()
  return useListStateHook(
    'notes', useTypedSelector(s => s.notes), session, notesSlice, 
    { 
      loadQuery: session.api.notes.getSome,
      addOne: session.api.notes.createOne,
      addSome: session.api.notes.createSome,
      deleteOne: session.api.notes.deleteOne,
      updateOne: session.api.notes.updateOne,
    }, 
    {...options}
  )
}

export const useChatRooms = (o={} as HookOptions<ChatRoom>) => useChatRoomsShared('user', o)
export const useChats = (roomId: string, o={} as HookOptions<ChatMessage>) => useChatsShared(roomId, 'user', o)

