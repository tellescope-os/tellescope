import React from 'react'

import { Provider, useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import {
  ChatRoom,
  ChatMessage,
  Ticket,
  Meeting,
  UserDisplayInfo,
} from '@tellescope/types-client'

import {
  useEnduserSession,
} from "./authentication"

import {
  createSliceForList,
  sharedConfig,
  useListStateHook,
  WithFetchContext,
  HookOptions,
  useChats as useChatsShared,
  useChatRooms as useChatRoomsShared,
} from "./state"

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

export const WithEnduserState = ({ children }: { children: React.ReactNode  }) => (
  <WithFetchContext>
  <Provider store={store}>
    {children}
  </Provider>
  </WithFetchContext>
)
export const useUserDisplayNames = (options={} as HookOptions<UserDisplayInfo>) => {
  console.warn("DEPRECATED: This hook has been renamed useUserDisplayInfo")
  return useUserDisplayInfo(options)
} 
export const useUserDisplayInfo = (options={} as HookOptions<UserDisplayInfo>) => {
  const session = useEnduserSession()  
  const state = useTypedSelector(s => s.users)
  return useListStateHook(
    'users', state, session, usersSlice, 
    { 
      loadQuery: session.api.users.display_info,
    }, 
    { socketConnection: 'none', ...options }
  )
}
export const useTickets = (options={} as HookOptions<Ticket>) => {
  const session = useEnduserSession()
  return useListStateHook(
    'tickets', useTypedSelector(s => s.tickets), session, ticketsSlice, 
    { 
      loadQuery: session.api.tickets.getSome,
      addOne: session.api.tickets.createOne,
    }, 
    { ...options }
  )
}
export const useMeetings = (options={} as HookOptions<Meeting>) => {
  const session = useEnduserSession()
  return useListStateHook(
    'meetings', useTypedSelector(s => s.meetings), session, meetingsSlice, 
    { 
      loadQuery: session.api.meetings.my_meetings,
    }, 
    { ...options }
  )
}

export const useChatRooms = (o={} as HookOptions<ChatRoom>) => useChatRoomsShared('enduser', o)
export const useChats = (roomId: string, o={} as HookOptions<ChatMessage>) => useChatsShared(roomId, 'enduser', o)