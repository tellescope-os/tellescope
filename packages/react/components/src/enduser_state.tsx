import React from 'react'

import { Provider, createSelectorHook, TypedUseSelectorHook } from 'react-redux'
import { configureStore, Action, EnhancedStore } from '@reduxjs/toolkit'

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
  HookOptions,
  useChats as useChatsShared,
  useChatRooms as useChatRoomsShared,
  WithFetchContext,
  TellescopeStoreContext,
  ChatRoomDisplayInfo,
  useChatRoomDisplayInfo as useChatRoomDisplayInfoShared,
} from "./state"

const usersSlice = createSliceForList<UserDisplayInfo, 'users'>('users')
const ticketsSlice = createSliceForList<Ticket, 'tickets'>('tickets')
const meetingsSlice = createSliceForList<Meeting, 'meetings'>('meetings')

export const enduserConfig = {
  reducer: { 
    users: usersSlice.reducer,
    tickets: ticketsSlice.reducer,
    meetings: meetingsSlice.reducer,
    ...sharedConfig.reducer,
  },
}
const store = configureStore(enduserConfig)

type RootState = ReturnType<typeof store.getState>
export const useTypedSelector = createSelectorHook(TellescopeStoreContext) as any as TypedUseSelectorHook<RootState>

export const EnduserProvider = (props: { children: React.ReactNode }) => (
  <WithFetchContext>
  <Provider store={store} context={TellescopeStoreContext}>
    {props.children}
  </Provider>
  </WithFetchContext>
)
export const ExtendedEnduserProvider = <A,B extends Action<any>>(props: { children: React.ReactNode, store: EnhancedStore<A,B> }) => (
  <WithFetchContext>
  <Provider store={props.store} context={TellescopeStoreContext}>
    {props.children}
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
export const useChatRoomDisplayInfo = (roomId: string, o={} as HookOptions<ChatRoomDisplayInfo>) =>
               useChatRoomDisplayInfoShared(roomId, 'enduser', o)